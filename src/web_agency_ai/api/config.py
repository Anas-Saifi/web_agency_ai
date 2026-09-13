import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "Web Agency AI Backend"
    PROJECT_DESCRIPTION: str = (
        "Production-grade FastAPI backend for the Web Agency AI sales qualification, "
        "proposal drafting, CRM sync, and meeting scheduling agent."
    )
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"

    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in {"true", "1", "yes"}

    # CORS settings
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ]


settings = Settings()
