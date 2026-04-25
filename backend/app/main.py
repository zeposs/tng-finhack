"""Flask application factory and dev entry point."""
from __future__ import annotations

import logging

from flask import Flask, jsonify
from flask_cors import CORS

from app.config import settings
from app.db import init_db
from app.routes import bp as api_bp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("quickmode")


def create_app() -> Flask:
    app = Flask(__name__)

    origins = (
        [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
        if settings.cors_origins != "*"
        else "*"
    )
    CORS(app, resources={r"/api/*": {"origins": origins}})

    init_db()

    app.register_blueprint(api_bp)

    @app.get("/")
    def index():
        return jsonify(
            {
                "service": "TnG eWallet Quick Mode backend",
                "status": "ok",
                "mock_mode": settings.is_mock,
                "endpoints": [
                    "/api/health",
                    "/api/balance",
                    "/api/promotions",
                    "/api/agent",
                    "/api/phrase",
                    "/api/voice",
                    "/api/payment",
                    "/api/topup",
                    "/api/tts",
                ],
            }
        )

    log.info(
        "Quick Mode backend ready (mock_mode=%s, llm=%s)",
        settings.is_mock,
        settings.qwen_llm_model,
    )
    return app


if __name__ == "__main__":
    create_app().run(
        host=settings.flask_host,
        port=settings.flask_port,
        debug=settings.flask_debug,
    )
