tng-finhack 2026 lets goo!!

## Quick Troubleshooting

### 1) Voice transcription timeout

If you see errors like:
- `STT callback timed out`
- `ffmpeg is required for realtime websocket STT conversion but was not found in PATH`

Do this:
- Install `ffmpeg` and restart backend.
- Keep `STT_MODE=auto` (default) so backend can choose best available mode.
- If callbacks are slow in your network, increase `STT_CALLBACK_TIMEOUT_SECONDS` in `backend/.env` (for example `30`).

### 2) Port already in use

If startup fails with `Port 5000 is already in use` or `Port 5173 is already in use`, stop old processes first:

```bash
ss -ltnp | grep -E ':5000|:5173'
```

Then kill the old PID(s) and run:

```bash
bash start.sh
```
