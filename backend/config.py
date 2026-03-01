"""Application configuration."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List
import os


def _parse_origins(value: str) -> List[str]:
    origins = [origin.strip() for origin in value.split(",") if origin.strip()]
    return origins


@dataclass(frozen=True)
class BaseConfig:
    env: str
    log_level: str
    rate_limit_default: str
    allowed_origins: List[str]
    pdf_generator: str


class DevelopmentConfig(BaseConfig):
    def __init__(self) -> None:
        allowed = _parse_origins(os.getenv("ALLOWED_ORIGINS", ""))
        if not allowed:
            allowed = [
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
            ]
        super().__init__(
            env="development",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            rate_limit_default=os.getenv("RATE_LIMIT", "200/minute"),
            allowed_origins=allowed,
            pdf_generator=os.getenv("PDF_GENERATOR", "auto"),
        )


class StagingConfig(BaseConfig):
    def __init__(self) -> None:
        super().__init__(
            env="staging",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            rate_limit_default=os.getenv("RATE_LIMIT", "300/minute"),
            allowed_origins=_parse_origins(os.getenv("ALLOWED_ORIGINS", "")),
            pdf_generator=os.getenv("PDF_GENERATOR", "auto"),
        )


class ProductionConfig(BaseConfig):
    def __init__(self) -> None:
        super().__init__(
            env="production",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            rate_limit_default=os.getenv("RATE_LIMIT", "300/minute"),
            allowed_origins=_parse_origins(os.getenv("ALLOWED_ORIGINS", "")),
            pdf_generator=os.getenv("PDF_GENERATOR", "auto"),
        )


def get_config() -> BaseConfig:
    env = os.getenv("APP_ENV", "development").lower()
    if env == "production":
        return ProductionConfig()
    if env == "staging":
        return StagingConfig()
    return DevelopmentConfig()
