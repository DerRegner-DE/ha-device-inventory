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

    class Config:
        env_prefix = "GV_"
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
