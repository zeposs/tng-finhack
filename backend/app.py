import os
import io
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from database import init_db, get_balance, get_promotions, get_transactions, make_payment, top_up
from agent import process_command
from stt import transcribe_audio, get_stt_runtime_status
from tts import text_to_speech

load_dotenv()

app = Flask(__name__)
CORS(app)

USER_ID = "user_001"
STT_TIMEOUT_SECONDS = int(os.getenv("STT_TIMEOUT_SECONDS", "20"))
AGENT_TIMEOUT_SECONDS = int(os.getenv("AGENT_TIMEOUT_SECONDS", "25"))
TTS_TIMEOUT_SECONDS = int(os.getenv("TTS_TIMEOUT_SECONDS", "20"))


def run_with_timeout(func, timeout_seconds: int, *args, **kwargs):
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(func, *args, **kwargs)
        try:
            return future.result(timeout=timeout_seconds)
        except FutureTimeoutError:
            raise TimeoutError(f"Operation timed out after {timeout_seconds}s")


@app.before_request
def before_first_request():
    init_db()


@app.route("/api/voice", methods=["POST"])
def voice_endpoint():
    """Accept audio blob, transcribe with DashScope STT, process through agent."""
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    language = request.form.get("language", "en")

    audio_data = audio_file.read()
    print(f"[VOICE] Received audio: {len(audio_data)} bytes, lang={language}")

    try:
        # Step 1: STT - transcribe audio to text
        print("[VOICE] Step 1: Starting STT...")
        transcribed_text = run_with_timeout(transcribe_audio, STT_TIMEOUT_SECONDS, audio_data, language)
        print(f"[VOICE] STT result: '{transcribed_text}'")

        if not transcribed_text:
            return jsonify({
                "success": False,
                "transcription": "",
                "text": "I didn't catch that. Could you please try again?",
                "action": "error",
                "needs_verification": False,
                "stt": get_stt_runtime_status(),
            })

        # Step 2: Process through LangChain agent
        print(f"[VOICE] Step 2: Processing command: '{transcribed_text}'")
        result = run_with_timeout(process_command, AGENT_TIMEOUT_SECONDS, transcribed_text)
        result["transcription"] = transcribed_text
        result["stt"] = get_stt_runtime_status()
        print(f"[VOICE] Agent result: action={result.get('action')}, text={result.get('text', '')[:80]}")

        return jsonify(result)

    except TimeoutError as e:
        print(f"[VOICE] TIMEOUT: {e}")
        return jsonify({
            "success": False,
            "transcription": "",
            "text": "The speech service is taking too long. Please try again.",
            "action": "error",
            "needs_verification": False,
            "error": str(e),
            "stt": get_stt_runtime_status(),
        }), 504
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[VOICE] ERROR: {e}")
        return jsonify({
            "success": False,
            "transcription": "",
            "text": f"Server error: {str(e)}",
            "action": "error",
            "needs_verification": False,
            "error": str(e),
            "stt": get_stt_runtime_status(),
        }), 500


@app.route("/api/agent", methods=["POST"])
def agent_endpoint():
    """Accept text input, process through LangChain agent."""
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data["text"]
    try:
        result = run_with_timeout(process_command, AGENT_TIMEOUT_SECONDS, text)
    except TimeoutError as e:
        return jsonify({
            "success": False,
            "text": "The assistant is taking too long. Please try again.",
            "action": "error",
            "needs_verification": False,
            "error": str(e),
        }), 504
    return jsonify(result)


@app.route("/api/balance", methods=["GET"])
def balance_endpoint():
    """Return current wallet balance."""
    balance = get_balance(USER_ID)
    return jsonify({
        "success": True,
        "balance": balance,
        "formatted": f"RM {balance:.2f}",
    })


@app.route("/api/payment", methods=["POST"])
def payment_endpoint():
    """Process a mock payment."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    amount = data.get("amount", 0)
    merchant = data.get("merchant", "merchant")

    result = make_payment(USER_ID, amount, merchant)
    return jsonify(result)


@app.route("/api/topup", methods=["POST"])
def topup_endpoint():
    """Process a mock top-up."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    amount = data.get("amount", 0)
    result = top_up(USER_ID, amount)
    return jsonify(result)


@app.route("/api/promotions", methods=["GET"])
def promotions_endpoint():
    """Return hardcoded promo cards."""
    promos = get_promotions()
    return jsonify({"success": True, "promotions": promos})


@app.route("/api/tts", methods=["POST"])
def tts_endpoint():
    """Accept text + language, return audio blob."""
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data["text"]
    language = data.get("language", "en")

    try:
        audio_bytes = run_with_timeout(text_to_speech, TTS_TIMEOUT_SECONDS, text, language)
        return send_file(
            io.BytesIO(audio_bytes),
            mimetype="audio/mp3",
            as_attachment=False,
            download_name="response.mp3",
        )
    except TimeoutError as e:
        return jsonify({"error": f"TTS timeout: {str(e)}"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/transactions", methods=["GET"])
def transactions_endpoint():
    """Return recent transactions."""
    txns = get_transactions(USER_ID)
    return jsonify({"success": True, "transactions": txns})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/stt-mode", methods=["GET"])
def stt_mode_endpoint():
    return jsonify({"success": True, "stt": get_stt_runtime_status()})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)
