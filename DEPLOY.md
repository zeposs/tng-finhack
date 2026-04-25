# Server Management — Quick Mode

## Quick Restart All

```bash
# Pull latest code
cd /var/www/html/tng-finhack && git pull origin dev-charlie

# Restart backend
pkill -f "python app.py"
eval "$(/usr/bin/conda shell.bash hook)" && conda activate tng-finhack
cd /var/www/html/tng-finhack/backend && ./start.sh

# Reload nginx
sudo systemctl reload nginx
```

---

## Start / Restart Backend

```bash
eval "$(/usr/bin/conda shell.bash hook)" && conda activate tng-finhack
cd /var/www/html/tng-finhack/backend
./start.sh
```

Verify it's running:
```bash
curl -s http://localhost:5000/api/health
```

---

## Restart Nginx

After changing nginx config or rebuilding frontend:

```bash
sudo systemctl reload nginx
```

Check status:
```bash
sudo systemctl status nginx
```

---

## Rebuild Frontend

After making React code changes:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 20
cd /var/www/html/tng-finhack/frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## Pull Latest Code

```bash
cd /var/www/html/tng-finhack
git pull origin dev-charlie
```

---

## Check Logs

### Backend
```bash
cat /tmp/backend.log
```

### Nginx
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## Useful Commands

| Action | Command |
|---|---|
| Check backend process | `ps aux \| grep "python app.py"` |
| Kill backend | `pkill -f "python app.py"` |
| Test nginx config | `sudo nginx -t` |
| Restart nginx | `sudo systemctl restart nginx` |
| Check site | `curl -I http://syok.ai` |
| Activate conda env | `eval "$(/usr/bin/conda shell.bash hook)" && conda activate tng-finhack` |
| Activate nvm | `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 20` |
