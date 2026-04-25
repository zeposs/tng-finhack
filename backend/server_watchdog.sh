#!/usr/bin/env bash
# ============================================================================
# TnG FinHack Server Watchdog — Shell-based process guardian
# ============================================================================
# Ensures the Gunicorn backend is always running. Restarts it if it crashes.
# Designed to be run via cron every minute or as a background daemon.
#
# Usage:
#   ./server_watchdog.sh              # One-shot check
#   ./server_watchdog.sh --daemon     # Run as background daemon
#   ./server_watchdog.sh --status     # Show current status
# ============================================================================

set -euo pipefail

# --- Configuration ---
PROJECT_ROOT="/var/www/html/tng-finhack"
BACKEND_DIR="${PROJECT_ROOT}/backend"
CONDA_PYTHON="/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11"
CONDA_GUNICORN="/home/hackgpt/.conda/envs/tng-finhack/bin/gunicorn"
PID_FILE="${BACKEND_DIR}/.gunicorn.pid"
LOG_DIR="${BACKEND_DIR}/logs"
WATCHDOG_LOG="${LOG_DIR}/watchdog.log"
HEALTH_URL="http://localhost:5000/api/health"
MAX_RESTARTS=5
RESTART_WINDOW=300  # 5 minutes
RESTART_COOLDOWN=15 # seconds between restarts

# --- Ensure log directory exists ---
mkdir -p "${LOG_DIR}"

# --- Logging helper ---
log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $*" | tee -a "${WATCHDOG_LOG}"
}

# --- Check if gunicorn is running ---
is_gunicorn_running() {
    if pgrep -f "gunicorn.*app.main:create_app" > /dev/null 2>&1; then
        return 0
    fi
    # Fallback: check PID file
    if [ -f "${PID_FILE}" ]; then
        local pid
        pid=$(cat "${PID_FILE}")
        if kill -0 "${pid}" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# --- Check health endpoint ---
check_health() {
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${HEALTH_URL}" 2>/dev/null) || true
    if [ "${http_code}" = "200" ]; then
        return 0
    fi
    return 1
}

# --- Get gunicorn PID(s) ---
get_gunicorn_pids() {
    pgrep -f "gunicorn.*app.main:create_app" 2>/dev/null || true
}

# --- Start gunicorn ---
start_gunicorn() {
    log "Starting Gunicorn backend..."
    cd "${BACKEND_DIR}"

    # Clean up stale PID file
    if [ -f "${PID_FILE}" ]; then
        local old_pid
        old_pid=$(cat "${PID_FILE}")
        if ! kill -0 "${old_pid}" 2>/dev/null; then
            rm -f "${PID_FILE}"
            log "Removed stale PID file (pid=${old_pid})"
        fi
    fi

    # Start gunicorn in background
    "${CONDA_GUNICORN}" \
        -w 2 \
        -b 0.0.0.0:5000 \
        --pid "${PID_FILE}" \
        --access-logfile "${LOG_DIR}/gunicorn_access.log" \
        --error-logfile "${LOG_DIR}/gunicorn_error.log" \
        --daemon \
        "app.main:create_app()"

    local exit_code=$?
    if [ ${exit_code} -eq 0 ]; then
        sleep 2
        if is_gunicorn_running; then
            local new_pid
            new_pid=$(cat "${PID_FILE}" 2>/dev/null || echo "unknown")
            log "Gunicorn started successfully (pid=${new_pid})"
            return 0
        else
            log "ERROR: Gunicorn failed to stay running after start"
            return 1
        fi
    else
        log "ERROR: Gunicorn failed to start (exit code=${exit_code})"
        return 1
    fi
}

# --- Stop gunicorn ---
stop_gunicorn() {
    log "Stopping Gunicorn..."

    if [ -f "${PID_FILE}" ]; then
        local pid
        pid=$(cat "${PID_FILE}")
        if kill -0 "${pid}" 2>/dev/null; then
            kill -TERM "${pid}"
            sleep 3
            if kill -0 "${pid}" 2>/dev/null; then
                kill -9 "${pid}"
                log "Force killed Gunicorn (pid=${pid})"
            else
                log "Gunicorn stopped gracefully (pid=${pid})"
            fi
        fi
        rm -f "${PID_FILE}"
    fi

    # Kill any remaining gunicorn processes for this app
    local pids
    pids=$(get_gunicorn_pids)
    if [ -n "${pids}" ]; then
        echo "${pids}" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        pids=$(get_gunicorn_pids)
        if [ -n "${pids}" ]; then
            echo "${pids}" | xargs kill -9 2>/dev/null || true
            log "Force killed remaining gunicorn processes"
        fi
    fi
}

# --- Restart gunicorn ---
restart_gunicorn() {
    stop_gunicorn
    sleep 2
    start_gunicorn
}

# --- Check restart rate limiting ---
check_restart_limit() {
    local restart_state_file="${LOG_DIR}/.restart_state"
    local now
    now=$(date +%s)

    if [ -f "${restart_state_file}" ]; then
        local last_restart_count last_window_start
        read -r last_restart_count last_window_start < "${restart_state_file}"

        # Reset counter if window has passed
        if [ $((now - last_window_start)) -gt ${RESTART_WINDOW} ]; then
            echo "1 ${now}" > "${restart_state_file}"
            return 0
        fi

        # Check if we've exceeded max restarts
        if [ "${last_restart_count}" -ge ${MAX_RESTARTS} ]; then
            log "WARNING: Restart rate limit exceeded (${MAX_RESTARTS} restarts in ${RESTART_WINDOW}s)"
            return 1
        fi

        # Increment counter
        echo "$((last_restart_count + 1)) ${last_window_start}" > "${restart_state_file}"
    else
        echo "1 ${now}" > "${restart_state_file}"
    fi

    return 0
}

# --- Show status ---
show_status() {
    echo "========================================"
    echo "  TnG FinHack Server Status"
    echo "========================================"
    echo ""

    # Backend process
    if is_gunicorn_running; then
        echo "[✓] Backend (Gunicorn): RUNNING"
        local pids
        pids=$(get_gunicorn_pids)
        echo "    PIDs: ${pids}"
    else
        echo "[✗] Backend (Gunicorn): NOT RUNNING"
    fi

    # Health endpoint
    if check_health; then
        echo "[✓] Health endpoint: OK"
    else
        echo "[✗] Health endpoint: FAILING"
    fi

    # Nginx
    if pgrep -f "nginx: master" > /dev/null 2>&1; then
        echo "[✓] Nginx: RUNNING"
    else
        echo "[✗] Nginx: NOT RUNNING"
    fi

    # Disk usage
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}')
    echo "[ ] Disk usage: ${disk_usage}"

    # Memory usage
    if command -v free > /dev/null 2>&1; then
        local mem_usage
        mem_usage=$(free | awk '/Mem:/ {printf "%.1f%%", $3/$2 * 100}')
        echo "[ ] Memory usage: ${mem_usage}"
    fi

    # Database
    local db_file="${BACKEND_DIR}/quickmode.db"
    if [ -f "${db_file}" ]; then
        local db_size
        db_size=$(du -h "${db_file}" | cut -f1)
        echo "[✓] SQLite DB: EXISTS (${db_size})"
    else
        echo "[✗] SQLite DB: MISSING"
    fi

    # Log files
    echo ""
    echo "Log files:"
    if [ -d "${LOG_DIR}" ]; then
        ls -lh "${LOG_DIR}/" 2>/dev/null | tail -n +2
    else
        echo "  (no logs directory)"
    fi

    echo ""
    echo "========================================"
}

# --- Main ---
main() {
    local mode="check"

    case "${1:-}" in
        --daemon)
            mode="daemon"
            ;;
        --status)
            show_status
            exit 0
            ;;
        --restart)
            restart_gunicorn
            exit $?
            ;;
        --stop)
            stop_gunicorn
            exit $?
            ;;
        --start)
            start_gunicorn
            exit $?
            ;;
        --help|-h)
            echo "Usage: $0 [--daemon|--status|--restart|--stop|--start|--help]"
            exit 0
            ;;
    esac

    if [ "${mode}" = "daemon" ]; then
        log "Watchdog daemon starting..."
        while true; do
            if ! is_gunicorn_running; then
                log "Gunicorn is not running!"
                if check_restart_limit; then
                    start_gunicorn
                else
                    log "Skipping restart due to rate limit"
                fi
            elif ! check_health; then
                log "Health check failed!"
                if check_restart_limit; then
                    log "Attempting restart due to health check failure..."
                    restart_gunicorn
                else
                    log "Skipping restart due to rate limit"
                fi
            else
                log "All checks passed"
            fi

            # Sleep in 1-second intervals for responsive signal handling
            for i in $(seq 1 60); do
                sleep 1
            done
        done
    else
        # One-shot check
        if ! is_gunicorn_running; then
            log "Gunicorn is not running! Attempting to start..."
            if check_restart_limit; then
                start_gunicorn
                exit $?
            else
                log "Restart rate limit exceeded"
                exit 1
            fi
        fi

        if ! check_health; then
            log "Health check failed! Attempting restart..."
            if check_restart_limit; then
                restart_gunicorn
                exit $?
            else
                log "Restart rate limit exceeded"
                exit 1
            fi
        fi

        log "All checks passed"
        exit 0
    fi
}

main "$@"
