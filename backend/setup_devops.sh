#!/usr/bin/env bash
# ============================================================================
# TnG FinHack DevOps Agent — Setup Script
# ============================================================================
# Installs cron jobs, logrotate config, and creates necessary directories
# for the health monitoring system.
#
# Usage:
#   sudo -u hackgpt bash setup_devops.sh
# ============================================================================

set -euo pipefail

PROJECT_ROOT="/var/www/html/tng-finhack"
BACKEND_DIR="${PROJECT_ROOT}/backend"
CONDA_PYTHON="/home/hackgpt/.conda/envs/tng-finhack/bin/python3.11"
LOG_DIR="${BACKEND_DIR}/logs"
WATCHDOG_SCRIPT="${BACKEND_DIR}/server_watchdog.sh"
HEALTH_MONITOR="${BACKEND_DIR}/health_monitor.py"

echo "========================================"
echo "  TnG FinHack DevOps Agent Setup"
echo "========================================"
echo ""

# --- Create directories ---
echo "[1/5] Creating directories..."
mkdir -p "${LOG_DIR}"
mkdir -p "${BACKEND_DIR}/audio_cache"
echo "  ✓ Log directory: ${LOG_DIR}"
echo "  ✓ Audio cache: ${BACKEND_DIR}/audio_cache"

# --- Set permissions ---
echo "[2/5] Setting permissions..."
chmod +x "${WATCHDOG_SCRIPT}"
chmod 755 "${LOG_DIR}"
chmod 755 "${BACKEND_DIR}/audio_cache"
echo "  ✓ Watchdog script executable"
echo "  ✓ Directory permissions set"

# --- Install logrotate config ---
echo "[3/5] Installing logrotate configuration..."
if [ -f "${BACKEND_DIR}/logrotate.conf" ]; then
    if [ -w "/etc/logrotate.d" ]; then
        cp "${BACKEND_DIR}/logrotate.conf" /etc/logrotate.d/tng-finhack
        echo "  ✓ Logrotate config installed to /etc/logrotate.d/tng-finhack"
    else
        echo "  ⚠ Cannot write to /etc/logrotate.d (need sudo?)"
        echo "    Run: sudo cp ${BACKEND_DIR}/logrotate.conf /etc/logrotate.d/tng-finhack"
    fi
else
    echo "  ⚠ logrotate.conf not found"
fi

# --- Setup cron jobs ---
echo "[4/5] Setting up cron jobs..."

# Create a temporary file with existing crontab
CRON_TMP=$(mktemp)
crontab -l > "${CRON_TMP}" 2>/dev/null || true

# Remove existing tng-finhack cron entries to avoid duplicates
sed -i '/# tng-finhack/d' "${CRON_TMP}"
sed -i '/health_monitor\.py/d' "${CRON_TMP}"
sed -i '/server_watchdog\.sh/d' "${CRON_TMP}"

# Add new cron entries
cat >> "${CRON_TMP}" << 'CRON_EOF'
# tng-finhack: Health check every 5 minutes with auto-recovery
*/5 * * * * /home/hackgpt/.conda/envs/tng-finhack/bin/python3.11 /var/www/html/tng-finhack/backend/health_monitor.py --recover >> /var/www/html/tng-finhack/backend/logs/cron_health.log 2>&1

# tng-finhack: Watchdog process check every minute
* * * * * /var/www/html/tng-finhack/backend/server_watchdog.sh >> /var/www/html/tng-finhack/backend/logs/cron_watchdog.log 2>&1

# tng-finhack: Daily log cleanup at 3 AM
0 3 * * * find /var/www/html/tng-finhack/backend/logs -name "*.log" -mtime +7 -delete 2>/dev/null

# tng-finhack: Daily audio cache cleanup at 2 AM
0 2 * * * find /var/www/html/tng-finhack/backend/audio_cache -type f -mtime +1 -delete 2>/dev/null
CRON_EOF

# Install the new crontab
crontab "${CRON_TMP}"
rm -f "${CRON_TMP}"

echo "  ✓ Cron jobs installed:"
echo "    - Health check: every 5 minutes"
echo "    - Watchdog: every minute"
echo "    - Log cleanup: daily at 3 AM"
echo "    - Cache cleanup: daily at 2 AM"

# --- Verify setup ---
echo "[5/5] Verifying setup..."

# Check if cron is running
if pgrep -x crond > /dev/null 2>&1 || pgrep -x cron > /dev/null 2>&1; then
    echo "  ✓ Cron daemon is running"
else
    echo "  ⚠ Cron daemon may not be running"
    echo "    Start it with: sudo systemctl start crond"
fi

# Show current crontab
echo ""
echo "  Current crontab:"
crontab -l | grep "tng-finhack" || echo "    (no tng-finhack entries found)"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Quick commands:"
echo "  Check server status:    ${WATCHDOG_SCRIPT} --status"
echo "  Run health check:       ${CONDA_PYTHON} ${HEALTH_MONITOR}"
echo "  View health logs:       tail -f ${LOG_DIR}/health_monitor.log"
echo "  View watchdog logs:     tail -f ${LOG_DIR}/watchdog.log"
echo "  View recovery logs:     tail -f ${LOG_DIR}/recovery.log"
echo ""
echo "To start the watchdog daemon manually:"
echo "  nohup ${WATCHDOG_SCRIPT} --daemon &"
echo ""
