import os
import json
import tempfile
import base64
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from database import get_balance, update_balance, add_transaction, get_promotions

load_dotenv()

app = Flask(__name__)
CORS(app)

DASHSCOPE_API_KEY = os.getenv('DASHSCOPE_API_KEY', '')

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Quick Mode API is running'})

@app.route('/api/voice', methods=['POST'])
def voice():
    data = request.get_json()
    audio_base64 = data.get('audio', '')
    language = data.get('language', 'en')

    if not audio_base64:
        return jsonify({'error': 'No audio provided', 'transcription': '', 'intent': None}), 400

    if DASHSCOPE_API_KEY and DASHSCOPE_API_KEY != 'your_api_key_here':
        try:
            from dashscope.audio.asr import Recognition
            audio_data = base64.b64decode(audio_base64)
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
                f.write(audio_data)
                audio_path = f.name

            rec = Recognition(
                model='paraformer-v2',
                format='wav',
                sample_rate=16000,
                callback=None
            )
            result = rec.call(audio_path)
            os.unlink(audio_path)

            if result.status_code == 200:
                transcription = result.get_result()['text']
            else:
                transcription = _mock_transcribe(language)
        except Exception:
            transcription = _mock_transcribe(language)
    else:
        transcription = _mock_transcribe(language)

    intent = _extract_intent(transcription)

    return jsonify({
        'transcription': transcription,
        'intent': intent,
        'language': language
    })

@app.route('/api/agent', methods=['POST'])
def agent():
    data = request.get_json()
    intent = data.get('intent', {})
    action = intent.get('action', '')
    params = intent.get('params', {})

    result = _execute_action(action, params)

    return jsonify(result)

@app.route('/api/balance', methods=['GET'])
def balance():
    bal = get_balance()
    return jsonify({'balance': bal, 'currency': 'MYR'})

@app.route('/api/payment', methods=['POST'])
def payment():
    data = request.get_json()
    amount = data.get('amount', 0)
    merchant = data.get('merchant', 'Unknown Merchant')

    current = get_balance()
    if current < amount:
        return jsonify({'success': False, 'message': 'Insufficient balance'}), 400

    update_balance(1, -amount)
    add_transaction(1, 'payment', amount, merchant)

    return jsonify({
        'success': True,
        'message': f'Payment of RM {amount:.2f} to {merchant} confirmed',
        'new_balance': get_balance(),
        'merchant': merchant,
        'amount': amount,
        'timestamp': _now()
    })

@app.route('/api/topup', methods=['POST'])
def topup():
    data = request.get_json()
    amount = data.get('amount', 0)

    update_balance(1, amount)
    add_transaction(1, 'topup', amount)

    return jsonify({
        'success': True,
        'message': f'Top up of RM {amount:.2f} successful',
        'new_balance': get_balance(),
        'amount': amount,
        'timestamp': _now()
    })

@app.route('/api/promotions', methods=['GET'])
def promotions():
    promos = get_promotions()
    return jsonify({'promotions': promos})

@app.route('/api/tts', methods=['POST'])
def tts():
    data = request.get_json()
    text = data.get('text', '')
    language = data.get('language', 'en')

    if DASHSCOPE_API_KEY and DASHSCOPE_API_KEY != 'your_api_key_here':
        try:
            from dashscope.audio.tts import SpeechSynthesizer
            result = SpeechSynthesizer.call(
                model='cosyvoice-v1',
                text=text,
                voice='longxiaochun',
                format='wav',
                sample_rate=16000
            )
            if result.status_code == 200:
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
                    f.write(result.get_result())
                    audio_path = f.name
                return send_file(audio_path, mimetype='audio/wav')
        except Exception:
            pass

    return jsonify({'message': 'TTS not configured', 'text': text}), 200

def _mock_transcribe(language):
    return "What is my balance?"

def _extract_intent(text):
    text_lower = text.lower()

    if any(w in text_lower for w in ['balance', 'baki', '余额', 'how much', 'money']):
        return {'action': 'check_balance', 'params': {}}

    if any(w in text_lower for w in ['pay', 'payment', 'bayar', '支付', 'buy']):
        amount = _extract_amount(text_lower)
        merchant = _extract_merchant(text_lower)
        return {'action': 'make_payment', 'params': {'amount': amount, 'merchant': merchant}}

    if any(w in text_lower for w in ['top up', 'topup', 'top-up', 'reload', '充值', 'tambah', 'add']):
        amount = _extract_amount(text_lower)
        return {'action': 'top_up', 'params': {'amount': amount}}

    if any(w in text_lower for w in ['verify', 'confirm', 'thumbprint', 'fingerprint']):
        return {'action': 'verify_identity', 'params': {}}

    return {'action': 'unknown', 'params': {}}

def _extract_amount(text):
    import re
    match = re.search(r'(?:rm|ringgit)?\s*(\d+(?:\.\d{1,2})?)', text, re.IGNORECASE)
    return float(match.group(1)) if match else 50.0

def _extract_merchant(text):
    merchants = ['merchant', 'shop', 'store', 'aeon', 'grocer', 'speedmart', 'jaya', 'tesco', 'giant']
    for m in merchants:
        if m in text:
            return m.capitalize()
    return 'Merchant'

def _execute_action(action, params):
    if action == 'check_balance':
        bal = get_balance()
        return {
            'success': True,
            'action': 'check_balance',
            'message': f'Your current balance is RM {bal:.2f}',
            'balance': bal,
            'requires_verify': False
        }

    if action == 'make_payment':
        amount = params.get('amount', 50)
        merchant = params.get('merchant', 'Merchant')
        return {
            'success': True,
            'action': 'make_payment',
            'message': f'Payment of RM {amount:.2f} to {merchant}. Please verify with thumbprint.',
            'amount': amount,
            'merchant': merchant,
            'requires_verify': True,
            'verify_action': 'confirm_payment'
        }

    if action == 'top_up':
        amount = params.get('amount', 100)
        return {
            'success': True,
            'action': 'top_up',
            'message': f'Top up of RM {amount:.2f} initiated. Please verify with thumbprint.',
            'amount': amount,
            'requires_verify': True,
            'verify_action': 'confirm_topup'
        }

    if action == 'verify_identity':
        return {
            'success': True,
            'action': 'verify_identity',
            'message': 'Thumbprint verification required. Please place your finger on the sensor.',
            'requires_verify': False
        }

    return {
        'success': False,
        'action': action,
        'message': "I didn't understand. Please try again.",
        'requires_verify': False
    }

def _now():
    from datetime import datetime
    return datetime.now().isoformat()

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=False)
