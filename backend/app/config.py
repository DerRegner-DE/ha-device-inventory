import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Auto-detect from HA Supervisor environment
    HA_URL: str = os.environ.get(
        "SUPERVISOR_API",
        os.environ.get("GV_HA_URL", "http://supervisor/core"),
    )
    HA_TOKEN: str = os.environ.get(
        "SUPERVISOR_TOKEN",
        os.environ.get("GV_HA_TOKEN", ""),
    )

    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DB_PATH: Path = Path(
        os.environ.get("GV_DB_PATH", str(BASE_DIR / "data" / "geraeteverwaltung.db"))
    )
    PHOTOS_DIR: Path = Path(
        os.environ.get("GV_PHOTOS_DIR", str(BASE_DIR / "photos"))
    )

    BACKEND_PORT: int = 3002
    BACKEND_HOST: str = "0.0.0.0"

    CORS_ORIGINS: list[str] = ["*"]  # Allow all since behind Ingress auth

    # Lemon Squeezy license validation
    LS_STORE_ID: int = int(os.environ.get("GV_LS_STORE_ID", "326895"))
    LS_PRODUCT_ID: int = int(os.environ.get("GV_LS_PRODUCT_ID", "974758"))

    # MQTT broker for HA discovery
    MQTT_HOST: str = os.environ.get("GV_MQTT_HOST", "localhost")
    MQTT_PORT: int = int(os.environ.get("GV_MQTT_PORT", "1883"))
    MQTT_USER: str = os.environ.get("GV_MQTT_USER", "")
    MQTT_PASSWORD: str = os.environ.get("GV_MQTT_PASSWORD", "")
    MQTT_DISCOVERY_ENABLED: bool = os.environ.get("GV_MQTT_DISCOVERY", "false").lower() == "true"

    class Config:
        env_prefix = "GV_"
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
