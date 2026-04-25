# TnG FinHack — DevOps Agent

Server health monitoring and auto-recovery system for the TnG Quick Mode backend.

## Components

| File | Purpose |
|---|---|
| `health_monitor.py` | Python health checker — endpoint checks, system resources, auto-recovery |
| `server_watchdog.sh` | Shell watchdog — process guardian with rate-limited restarts |
| `setup_devops.sh` | One-time setup script — installs cron jobs, logrotate, directories |
| `logrotate.conf` | Log rotation configuration (7 days, compressed) |

## Quick Setup

```bash
cd /var/www/html/tng-finhack/backend
bash setup_devops.sh
```

This installs:
- **Health check** every 5 minutes (with auto-recovery)
- **Watchdog** every minute (process restart if crashed)
- **Log cleanup** daily at 3 AM
- **Cache cleanup** daily at 2 AM
- **Logrotate** for all log files

## Usage

### Check server status

```bash
./server_watchdog.sh --status
```

Output:
```
========================================
  TnG FinHack Server Status
========================================

[✓] Backend (Gunicorn): RUNNING
    PIDs: 12345 12346
[✓] Health endpoint: OK
[✓] Nginx: RUNNING
[ ] Disk usage: 45%
[ ] Memory usage: 62%
[✓] SQLite DB: EXISTS (2.1M)
```

### Run health check (one-shot)

```bash
# Human-readable output
/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 health_monitor.py

# JSON output (for integrations)
/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 health_monitor.py --json

# With auto-recovery
/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 health_monitor.py --recover
```

### Run health check (daemon mode)

```bash
# Continuous monitoring every 60 seconds
/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 health_monitor.py --daemon --interval 60 --recover
```

### Watchdog commands

```bash
./server_watchdog.sh          # One-shot check + auto-restart if needed
./server_watchdog.sh --daemon # Run as background daemon (checks every 60s)
./server_watchdog.sh --status # Show current status
./server_watchdog.sh --restart # Force restart backend
./server_watchdog.sh --stop   # Stop backend
./server_watchdog.sh --start  # Start backend
```

## Health Checks Performed

| Check | What it monitors | Failure action |
|---|---|---|
| Backend process | Gunicorn PID existence | Auto-restart |
| Health endpoint | `/api/health` HTTP 200 | Auto-restart |
| Balance endpoint | `/api/balance` functional | Log warning |
| Nginx | Process + config validity | Reload nginx |
| SQLite DB | File exists + integrity check | Re-init DB |
| Disk usage | Root partition < 85% warn, < 95% critical | Log warning / alert |
| Memory usage | System RAM < 85% warn | Log warning |

## Auto-Recovery Actions

1. **Backend crash** → Restart Gunicorn (max 3 attempts with 30s cooldown)
2. **Health endpoint failure** → Restart Gunicorn
3. **Nginx config issue** → Test config, reload if valid
4. **Database corruption** → Re-run `init_db()`
5. **Audio cache bloat** → Clean files older than 24 hours
6. **Log file bloat** → Rotate files older than 7 days or > 50MB

## Log Files

| File | Content |
|---|---|
| `logs/health_monitor.log` | Health check results |
| `logs/recovery.log` | Auto-recovery actions taken |
| `logs/watchdog.log` | Watchdog process events |
| `logs/gunicorn_access.log` | Gunicorn HTTP access logs |
| `logs/gunicorn_error.log` | Gunicorn error logs |
| `logs/cron_health.log` | Cron health check output |
| `logs/cron_watchdog.log` | Cron watchdog output |

## Cron Schedule

```cron
# Health check every 5 minutes (with auto-recovery)
*/5 * * * * python3.11 health_monitor.py --recover

# Watchdog process check every minute
* * * * * ./server_watchdog.sh

# Daily log cleanup at 3 AM
0 3 * * * find logs/ -name "*.log" -mtime +7 -delete

# Daily audio cache cleanup at 2 AM
0 2 * * * find audio_cache/ -type f -mtime +1 -delete
```

## Manual Logrotate

```bash
sudo logrotate -f /etc/logrotate.d/tng-finhack
```

## Troubleshooting

### Backend won't start

```bash
# Check error logs
tail -100 logs/gunicorn_error.log

# Check if port 5000 is in use
ss -tlnp | grep 5000

# Kill stuck processes and restart
pkill -f gunicorn
./server_watchdog.sh --start
```

### Health check failing

```bash
# Manual health check
curl http://localhost:5000/api/health

# Check backend process
pgrep -fa gunicorn

# Check conda env
/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 -c "import flask; print(flask.__version__)"
```

### Cron not running

```bash
# Check cron daemon
sudo systemctl status crond  # or cron on Ubuntu

# View cron logs
sudo grep CRON /var/log/cron  # or /var/log/syslog on Ubuntu

# Verify crontab
crontab -l
```

### Database issues

```bash
# Check DB integrity
sqlite3 quickmode.db "PRAGMA integrity_check;"

# Re-initialize DB
/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 -c "from app.db import init_db; init_db()"
```
