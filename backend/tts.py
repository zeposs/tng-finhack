import os
import dashscope
from dashscope.audio.tts_v2 import SpeechSynthesizer
from dotenv import load_dotenv

load_dotenv()

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")


def text_to_speech(text: str, language: str = "en") -> bytes:
    """Convert text to speech using DashScope CosyVoice TTS. Returns audio bytes."""
    voice_map = {
        "en": "loongstella",
        "bm": "loongstella",
        "zh": "loongxiang",
    }
    voice = voice_map.get(language, "loongstella")

    synthesizer = SpeechSynthesizer(
        model="cosyvoice-v1",
        voice=voice,
    )

    audio_data = synthesizer.call(text)

    if isinstance(audio_data, bytes) and len(audio_data) > 0:
        return audio_data
    elif hasattr(audio_data, "get_audio_data"):
        return audio_data.get_audio_data()
    else:
        raise Exception("TTS failed to generate audio")
