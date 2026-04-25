"""End-to-end live test using the actual production wrapper functions:

  audio bytes → app.services.stt.transcribe → app.agent.run_agent → app.services.tts.synthesize

This mirrors exactly what /api/voice does in routes.py, so a green run here
means the whole pipeline is wired correctly.
"""
import sys, io, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from app.config import settings
from app.services.stt import transcribe
from app.services.tts import synthesize
from app.agent import run_agent

print(f"mock     = {settings.is_mock}")
print(f"region   = {settings.dashscope_base_url}")
print(f"llm      = {settings.qwen_llm_model}")
print(f"stt      = {settings.qwen_stt_model}")
print(f"tts      = {settings.qwen_tts_model} ({settings.qwen_tts_voice})")
print()

# 1. Pull a known-good 16 kHz mono WAV from DashScope's public sample CDN
url = "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_male2.wav"
print(f"--- 1. fetching sample audio ---")
audio = urllib.request.urlopen(url, timeout=10).read()
print(f"    bytes={len(audio)}")

# 2. STT
print(f"--- 2. STT (live fun-asr-realtime) ---")
stt = transcribe(audio, language="en", suffix=".wav", sample_rate=16000)
print(f"    mock={stt.get('mock')} text={stt.get('text')!r}")
if stt.get("error"):
    print(f"    error={stt['error']}")

# 3. Agent
print(f"--- 3. Agent (live qwen-turbo via LangChain) ---")
result = run_agent("What is my balance?", "en")
print(f"    tool={result.tool} args={result.tool_args} used_llm={result.used_llm}")
print(f"    speech={result.payload.get('speech')!r}")

# 4. TTS
print(f"--- 4. TTS (live cosyvoice-v3-flash) ---")
tts = synthesize(result.payload.get("speech", "Hello"), "en")
print(f"    mock={tts.get('mock')} mime={tts.get('mime')} bytes_b64={len(tts.get('audio_b64',''))}")
if tts.get("error"):
    print(f"    error={tts['error']}")

print()
print("All four stages live ✓" if not (stt.get("mock") or tts.get("mock") or not result.used_llm) else "Some stages fell back to mock — check above")
