"""
Main FastAPI application entry point.
Initializes all services, configures CORS, and registers routes.
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.services.document_processor import DocumentProcessor
from app.services.embedding_service import EmbeddingService
# Import LLMService and RAGPipeline lazily inside the lifespan to avoid import-time
# failures if optional SDKs are missing or cause side-effects during module import.
from app.api.routes import router

# ─────────────────────────────────────────────
# Logging configuration
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Lifespan: startup and shutdown events
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Initialize all services on startup, clean up on shutdown.
    Using the modern lifespan approach (replaces @app.on_event).
    """
    settings = get_settings()
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"GEMINI_API_KEY detected: {bool(settings.GEMINI_API_KEY)}")

    # 1. Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # 2. Initialize Document Processor
    app.state.doc_processor = DocumentProcessor(upload_dir=settings.UPLOAD_DIR)
    logger.info("DocumentProcessor initialized.")

    # 3. Initialize Embedding Service (downloads model on first run)
    app.state.embedding_service = EmbeddingService(model_name=settings.EMBEDDING_MODEL)
    logger.info("EmbeddingService initialized.")

    # 4. Initialize LLM Service (Gemini) lazily
    try:
        from app.services.llm_service import LLMService
        app.state.llm_service = LLMService(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
        )
        logger.info(f"LLMService initialized (model: {settings.GEMINI_MODEL}).")
    except Exception as e:
        logger.warning("Failed to initialize LLMService at startup: %s", e)
        # Provide a minimal fallback LLM object so the RAG pipeline can call generate_answer()
        class _LocalFallback:
            def __init__(self):
                self.model = "local_fallback"

            async def generate_answer(self, question: str, context_chunks: list, max_context_chars: int = 3000) -> str:
                # Very small deterministic fallback: simple regex and overlap scoring
                import re
                if not context_chunks:
                    return "Answer not found in document."
                full_text = "\n\n".join(context_chunks)[:max_context_chars]
                q_lower = question.lower()
                if "name" in q_lower:
                    m = re.search(r"(?:name|full name)[:\-]\s*([A-Z][A-Za-z ,.'-]{1,120})", full_text, flags=re.IGNORECASE)
                    if m:
                        return m.group(1).strip()
                if "email" in q_lower:
                    m = re.search(r"[\w\.-]+@[\w\.-]+", full_text)
                    if m:
                        return m.group(0)
                # pick best chunk by overlap
                q_tokens = [w for w in re.findall(r"\w+", q_lower) if len(w) > 2]
                scores = []
                for c in context_chunks:
                    c_tokens = set(re.findall(r"\w+", c.lower()))
                    scores.append(sum(1 for t in q_tokens if t in c_tokens))
                best_idx = max(range(len(context_chunks)), key=lambda i: (scores[i], len(context_chunks[i])))
                best_chunk = context_chunks[best_idx]
                sents = re.split(r'(?<=[.!?])\s+', best_chunk.strip())
                return " ".join(sents[:2]).strip()

        app.state.llm_service = _LocalFallback()

    # 5. Initialize RAG Pipeline lazily
    try:
        from app.services.rag_pipeline import RAGPipeline
        app.state.rag_pipeline = RAGPipeline(
            embedding_service=app.state.embedding_service,
            llm_service=app.state.llm_service,
            chroma_persist_dir=settings.CHROMA_PERSIST_DIR,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            top_k=settings.TOP_K_CHUNKS,
            max_context_chars=settings.MAX_CONTEXT_TOKENS,
        )
        logger.info("RAGPipeline initialized.")
    except Exception as e:
        logger.exception("Failed to initialize RAGPipeline: %s", e)
        raise

    logger.info("✅ All services ready. Application is live.")
    yield

    # Shutdown
    logger.info("Shutting down application...")


# ─────────────────────────────────────────────
# App factory
# ─────────────────────────────────────────────
def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="""
## Document Analyzer API

A production-ready RAG (Retrieval-Augmented Generation) backend for intelligent document Q&A.

### How it works:
1. **Upload** a PDF, DOCX, or TXT document → text is extracted, chunked, and embedded into ChromaDB
2. **Query** the document with a natural language question → relevant chunks are retrieved and sent to Gemini for a grounded answer

### Stack:
- **Vector DB**: ChromaDB (persistent)
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2 (local)
- **LLM**: Google Gemini 1.5 Flash
        """,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS — allow the frontend to call the API
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",   # React dev server
            "http://localhost:5173",   # Vite dev server
            "http://localhost:5174",   # Vite fallback port
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API routes
    app.include_router(router, prefix="/api/v1", tags=["Document Analyzer"])

    return app


app = create_app()