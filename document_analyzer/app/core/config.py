"""
Core configuration module.
Loads all settings from environment variables using python-dotenv.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Document Analyzer API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Gemini API
    GEMINI_API_KEY: Optional[str] = None

    # Embedding model (runs locally via sentence-transformers)
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Gemini model
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # RAG settings
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 150
    TOP_K_CHUNKS: int = 10          # FIX #2: increased from 5 → 10 for better factual coverage

    # FIX #1: was 3000 — far too small for real documents.
    # A single-page resume is ~4,000–6,000 chars; a multi-page PDF is 20,000+.
    # Gemini 1.5 Flash supports ~1M token context, so 30,000 chars is safe and fast.
    MAX_CONTEXT_TOKENS: int = 30000

    # Vector DB path (ChromaDB persistent storage)
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # Upload settings
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 20

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()