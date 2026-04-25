"""TnG FinHack Server Health Monitor — DevOps Agent

Monitors the Flask/Gunicorn backend, Nginx, SQLite database, and system
resources. Performs auto-recovery when issues are detected.

Usage:
    # One-shot health check
    /home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 health_monitor.py

    # Continuous monitoring loop (daemon mode)
    /home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 health_monitor.py --daemon --interval 60

    # Only check and auto-recover (no logging to stdout)
    /home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 health_monitor.py --recover
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
CONDA_PYTHON = Path("/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11")
CONDA_GUNICORN = Path("/home/hackgpt/.conda/envs/tng-finhack/bin/gunicorn")
NGINX_CONF = "/etc/nginx/sites-enabled/syok.ai.conf"

HEALTH_URL = "http://localhost:5000/api/health"
BALANCE_URL = "http://localhost:5000/api/balance"

PID_FILE = BACKEND_DIR / ".gunicorn.pid"
LOG_DIR = BACKEND_DIR / "logs"
MONITOR_LOG = LOG_DIR / "health_monitor.log"
RECOVERY_LOG = LOG_DIR / "recovery.log"

MAX_RESTART_ATTEMPTS = 3
RESTART_COOLDOWN_SECONDS = 30
HEALTH_CHECK_TIMEOUT = 10

DISK_WARN_PERCENT = 85
DISK_CRITICAL_PERCENT = 95
MEMORY_WARN_PERCENT = 85

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(str(MONITOR_LOG)),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("health_monitor")

recovery_logger = logging.getLogger("recovery")
recovery_logger.addHandler(logging.FileHandler(str(RECOVERY_LOG)))
recovery_logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# State tracking (for daemon mode)
# ---------------------------------------------------------------------------

_restart_attempts = 0
_last_restart_time = 0.0
_running = True


def _handle_signal(signum, frame):
    global _running
    _running = False
    log.info("Received signal %s, shutting down gracefully.", signum)


signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT, _handle_signal)


# ---------------------------------------------------------------------------
# Health check helpers
# ---------------------------------------------------------------------------

def check_http(url: str, timeout: int = HEALTH_CHECK_TIMEOUT) -> dict[str, Any]:
    """Perform a GET request and return status info."""
    import urllib.request
    import urllib.error

    start = time.monotonic()
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            latency_ms = (time.monotonic() - start) * 1000
            body = resp.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                data = {}
            return {
                "ok": True,
                "status_code": resp.status,
                "latency_ms": round(latency_ms, 1),
                "body": data,
            }
    except urllib.error.HTTPError as exc:
        latency_ms = (time.monotonic() - start) * 1000
        return {
            "ok": False,
            "status_code": exc.code,
            "latency_ms": round(latency_ms, 1),
            "error": str(exc),
        }
    except Exception as exc:
        latency_ms = (time.monotonic() - start) * 1000
        return {
            "ok": False,
            "status_code": 0,
            "latency_ms": round(latency_ms, 1),
            "error": str(exc),
        }


def check_process_running(process_name: str = "gunicorn") -> dict[str, Any]:
    """Check if a process is running via pgrep."""
    try:
        result = subprocess.run(
            ["pgrep", "-f", process_name],
            capture_output=True,
            text=True,
            timeout=5,
        )
        pids = [p.strip() for p in result.stdout.strip().split("\n") if p.strip()]
        return {
            "ok": len(pids) > 0,
            "pids": pids,
            "count": len(pids),
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def check_disk_usage(path: str = "/") -> dict[str, Any]:
    """Check disk usage percentage."""
    try:
        stat = os.statvfs(path)
        total = stat.f_blocks * stat.f_frsize
        free = stat.f_bavail * stat.f_frsize
        used = total - free
        percent = (used / total * 100) if total > 0 else 0
        return {
            "ok": percent < DISK_CRITICAL_PERCENT,
            "warn": percent >= DISK_WARN_PERCENT,
            "percent": round(percent, 1),
            "total_gb": round(total / 1e9, 1),
            "used_gb": round(used / 1e9, 1),
            "free_gb": round(free / 1e9, 1),
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def check_memory_usage() -> dict[str, Any]:
    """Check system memory usage from /proc/meminfo."""
    try:
        meminfo = {}
        with open("/proc/meminfo") as f:
            for line in f:
                parts = line.split()
                meminfo[parts[0].rstrip(":")] = int(parts[1])

        total_kb = meminfo.get("MemTotal", 1)
        available_kb = meminfo.get("MemAvailable", meminfo.get("MemFree", 0))
        used_kb = total_kb - available_kb
        percent = (used_kb / total_kb * 100) if total_kb > 0 else 0

        return {
            "ok": percent < 95,
            "warn": percent >= MEMORY_WARN_PERCENT,
            "percent": round(percent, 1),
            "total_mb": round(total_kb / 1024, 0),
            "used_mb": round(used_kb / 1024, 0),
            "available_mb": round(available_kb / 1024, 0),
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def check_nginx() -> dict[str, Any]:
    """Check if Nginx is running and config is valid."""
    try:
        result = subprocess.run(
            ["sudo", "nginx", "-t"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        config_ok = result.returncode == 0

        proc_result = subprocess.run(
            ["pgrep", "-f", "nginx: master"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        running = len(proc_result.stdout.strip()) > 0

        return {
            "ok": running and config_ok,
            "running": running,
            "config_valid": config_ok,
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def check_sqlite_db() -> dict[str, Any]:
    """Check SQLite database integrity and accessibility."""
    db_path = BACKEND_DIR / "quickmode.db"
    if not db_path.exists():
        return {"ok": False, "error": "Database file not found"}

    try:
        result = subprocess.run(
            ["sqlite3", str(db_path), "PRAGMA integrity_check;"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        integrity = result.stdout.strip()

        result2 = subprocess.run(
            ["sqlite3", str(db_path), "SELECT COUNT(*) FROM users;"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        user_count = int(result2.stdout.strip()) if result2.returncode == 0 else 0

        db_size_mb = db_path.stat().st_size / 1e6

        return {
            "ok": integrity == "ok",
            "integrity": integrity,
            "user_count": user_count,
            "size_mb": round(db_size_mb, 2),
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


# ---------------------------------------------------------------------------
# Recovery actions
# ---------------------------------------------------------------------------

def start_backend() -> dict[str, Any]:
    """Start the Gunicorn backend process."""
    global _restart_attempts, _last_restart_time

    now = time.time()
    if now - _last_restart_time < RESTART_COOLDOWN_SECONDS:
        return {"ok": False, "error": "Restart cooldown active, skipping"}

    if _restart_attempts >= MAX_RESTART_ATTEMPTS:
        return {"ok": False, "error": f"Max restart attempts ({MAX_RESTART_ATTEMPTS}) reached"}

    _last_restart_time = now
    _restart_attempts += 1

    log.info("Starting backend (attempt %d/%d)...", _restart_attempts, MAX_RESTART_ATTEMPTS)
    recovery_logger.info("START_BACKEND attempt=%d", _restart_attempts)

    try:
        proc = subprocess.Popen(
            [
                str(CONDA_GUNICORN),
                "-w", "2",
                "-b", "0.0.0.0:5000",
                "--pid", str(PID_FILE),
                "--access-logfile", str(LOG_DIR / "gunicorn_access.log"),
                "--error-logfile", str(LOG_DIR / "gunicorn_error.log"),
                "app.main:create_app()",
            ],
            cwd=str(BACKEND_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        time.sleep(2)

        health = check_http(HEALTH_URL, timeout=5)
        if health["ok"]:
            _restart_attempts = 0
            recovery_logger.info("START_BACKEND success pid=%d", proc.pid)
            return {"ok": True, "pid": proc.pid}
        else:
            return {"ok": False, "error": "Health check failed after start", "health": health}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def restart_nginx() -> dict[str, Any]:
    """Reload Nginx configuration."""
    log.info("Reloading Nginx...")
    recovery_logger.info("RELOAD_NGINX")

    try:
        result = subprocess.run(
            ["sudo", "nginx", "-t"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return {"ok": False, "error": "Nginx config test failed", "stderr": result.stderr}

        result = subprocess.run(
            ["sudo", "nginx", "-s", "reload"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return {"ok": True}
        else:
            return {"ok": False, "error": result.stderr}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def cleanup_audio_cache() -> dict[str, Any]:
    """Clean up old audio cache files."""
    cache_dir = BACKEND_DIR / "audio_cache"
    if not cache_dir.exists():
        return {"ok": True, "cleaned": 0}

    cleaned = 0
    max_age_hours = 24
    now = time.time()

    try:
        for f in cache_dir.iterdir():
            if f.is_file() and (now - f.stat().st_mtime) > (max_age_hours * 3600):
                f.unlink()
                cleaned += 1
        return {"ok": True, "cleaned": cleaned}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def cleanup_old_logs() -> dict[str, Any]:
    """Rotate/cleanup old log files."""
    cleaned = 0
    max_age_days = 7
    max_size_mb = 50
    now = time.time()

    try:
        for f in LOG_DIR.iterdir():
            if not f.is_file():
                continue
            age_days = (now - f.stat().st_mtime) / 86400
            size_mb = f.stat().st_size / 1e6

            if age_days > max_age_days or size_mb > max_size_mb:
                f.unlink()
                cleaned += 1
        return {"ok": True, "cleaned": cleaned}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


# ---------------------------------------------------------------------------
# Full health check
# ---------------------------------------------------------------------------

def run_full_health_check() -> dict[str, Any]:
    """Run all health checks and return a comprehensive report."""
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {},
        "overall_ok": True,
        "issues": [],
    }

    # 1. Backend process
    proc = check_process_running("gunicorn")
    report["checks"]["backend_process"] = proc
    if not proc["ok"]:
        report["overall_ok"] = False
        report["issues"].append("Backend process (gunicorn) is not running")

    # 2. Backend health endpoint
    health = check_http(HEALTH_URL)
    report["checks"]["backend_health"] = health
    if not health["ok"]:
        report["overall_ok"] = False
        report["issues"].append(f"Backend health endpoint failed: {health.get('error')}")
    else:
        report["checks"]["backend_health_latency_ms"] = health["latency_ms"]

    # 3. Balance endpoint (functional check)
    balance = check_http(BALANCE_URL)
    report["checks"]["balance_endpoint"] = balance
    if not balance["ok"]:
        report["overall_ok"] = False
        report["issues"].append(f"Balance endpoint failed: {balance.get('error')}")

    # 4. Nginx
    nginx = check_nginx()
    report["checks"]["nginx"] = nginx
    if not nginx["ok"]:
        report["overall_ok"] = False
        report["issues"].append(f"Nginx issue: running={nginx.get('running')}, config_valid={nginx.get('config_valid')}")

    # 5. SQLite database
    db = check_sqlite_db()
    report["checks"]["sqlite_db"] = db
    if not db["ok"]:
        report["overall_ok"] = False
        report["issues"].append(f"SQLite DB issue: {db.get('error', db.get('integrity'))}")

    # 6. Disk usage
    disk = check_disk_usage("/")
    report["checks"]["disk"] = disk
    if disk.get("warn"):
        report["issues"].append(f"Disk usage warning: {disk['percent']}%")
    if not disk["ok"]:
        report["overall_ok"] = False
        report["issues"].append(f"Disk usage critical: {disk['percent']}%")

    # 7. Memory usage
    mem = check_memory_usage()
    report["checks"]["memory"] = mem
    if mem.get("warn"):
        report["issues"].append(f"Memory usage warning: {mem['percent']}%")
    if not mem["ok"]:
        report["overall_ok"] = False
        report["issues"].append(f"Memory usage critical: {mem['percent']}%")

    return report


def run_recovery(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Attempt to recover from issues found in the health report."""
    actions_taken = []

    for issue in report.get("issues", []):
        if "gunicorn" in issue.lower() or "backend process" in issue.lower():
            result = start_backend()
            actions_taken.append({"action": "start_backend", "result": result})

        elif "nginx" in issue.lower():
            result = restart_nginx()
            actions_taken.append({"action": "reload_nginx", "result": result})

        elif "sqlite" in issue.lower() or "database" in issue.lower():
            # Try to re-init the database
            try:
                subprocess.run(
                    [str(CONDA_PYTHON), "-c", "from app.db import init_db; init_db()"],
                    cwd=str(BACKEND_DIR),
                    capture_output=True,
                    timeout=30,
                )
                actions_taken.append({"action": "reinit_db", "result": {"ok": True}})
            except Exception as exc:
                actions_taken.append({"action": "reinit_db", "result": {"ok": False, "error": str(exc)}})

    # Always run cleanup tasks
    cache_result = cleanup_audio_cache()
    if cache_result.get("cleaned", 0) > 0:
        actions_taken.append({"action": "cleanup_audio_cache", "result": cache_result})

    log_result = cleanup_old_logs()
    if log_result.get("cleaned", 0) > 0:
        actions_taken.append({"action": "cleanup_logs", "result": log_result})

    return actions_taken


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="TnG FinHack Server Health Monitor")
    parser.add_argument("--daemon", action="store_true", help="Run in continuous monitoring loop")
    parser.add_argument("--interval", type=int, default=60, help="Check interval in seconds (daemon mode)")
    parser.add_argument("--recover", action="store_true", help="Auto-recover from issues")
    parser.add_argument("--json", action="store_true", help="Output report as JSON")
    args = parser.parse_args()

    global _restart_attempts

    log.info("Health Monitor starting (daemon=%s, interval=%ds, recover=%s)",
             args.daemon, args.interval, args.recover)

    if args.daemon:
        while _running:
            report = run_full_health_check()

            if args.json:
                print(json.dumps(report, indent=2))
            else:
                status = "OK" if report["overall_ok"] else "ISSUES DETECTED"
                log.info("Health check result: %s", status)
                if report["issues"]:
                    for issue in report["issues"]:
                        log.warning("  - %s", issue)

            if args.recover and not report["overall_ok"]:
                actions = run_recovery(report)
                if actions:
                    log.info("Recovery actions taken: %d", len(actions))
                    for action in actions:
                        log.info("  %s: %s", action["action"], "OK" if action["result"].get("ok") else "FAILED")

            # Reset restart counter if backend is healthy
            if report["checks"].get("backend_process", {}).get("ok"):
                _restart_attempts = 0

            # Sleep in small intervals to allow signal handling
            for _ in range(args.interval):
                if not _running:
                    break
                time.sleep(1)

        log.info("Health Monitor stopped.")
    else:
        # One-shot check
        report = run_full_health_check()

        if args.json:
            print(json.dumps(report, indent=2))
        else:
            status = "OK" if report["overall_ok"] else "ISSUES DETECTED"
            print(f"\n{'='*60}")
            print(f"  TnG FinHack Server Health Report")
            print(f"  Timestamp: {report['timestamp']}")
            print(f"  Status: {status}")
            print(f"{'='*60}")

            for check_name, check_data in report["checks"].items():
                ok = check_data.get("ok", False)
                icon = "✓" if ok else "✗"
                print(f"  [{icon}] {check_name}")
                for k, v in check_data.items():
                    if k != "ok":
                        print(f"      {k}: {v}")

            if report["issues"]:
                print(f"\n  Issues ({len(report['issues'])}):")
                for issue in report["issues"]:
                    print(f"    - {issue}")

            print(f"{'='*60}\n")

        if args.recover and not report["overall_ok"]:
            actions = run_recovery(report)
            if actions:
                print(f"\n  Recovery actions taken: {len(actions)}")
                for action in actions:
                    ok = action["result"].get("ok", False)
                    icon = "✓" if ok else "✗"
                    print(f"    [{icon}] {action['action']}")

        sys.exit(0 if report["overall_ok"] else 1)


if __name__ == "__main__":
    main()
