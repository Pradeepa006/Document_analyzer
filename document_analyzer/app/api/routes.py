"""
API Routes.
Defines all HTTP endpoints for the Document Analyzer API.
"""
import logging
from typing import List
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Body, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models.schemas import (
    UploadResponse,
    QueryRequest,
    QueryResponse,
    DocumentInfo,
    ErrorResponse,
)
from app.services.document_processor import DocumentProcessor
from app.services.rag_pipeline import RAGPipeline
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────
# Dependency Injection
# ─────────────────────────────────────────────

def get_rag_pipeline() -> RAGPipeline:
    """
    Dependency that returns the singleton RAGPipeline.
    The pipeline is initialized once in main.py and stored in app.state.
    """
    from app.main import app
    return app.state.rag_pipeline


def get_doc_processor() -> DocumentProcessor:
    """Dependency that returns the singleton DocumentProcessor."""
    from app.main import app
    return app.state.doc_processor


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload a document",
    description="Upload a PDF, DOCX, or TXT file. The document will be extracted, chunked, embedded, and indexed into the vector database.",
    status_code=201,
)
async def upload_document(
    file: UploadFile | None = File(
        default=None,
        description="PDF, DOCX, or TXT file to upload (multipart/form-data)",
    ),
    text: str | None = Body(
        default=None,
        description="Optional: plain text content to index (use when not sending multipart)",
        embed=True,
    ),
    filename: str | None = Body(
        default=None,
        description="Optional filename to associate with the plain text body",
        embed=True,
    ),
    rag: RAGPipeline = Depends(get_rag_pipeline),
    processor: DocumentProcessor = Depends(get_doc_processor),
):
    """
    Upload and index a document.

    Flow:
    1. Save file to disk
    2. Extract text (PDF/DOCX/TXT)
    3. Chunk text
    4. Embed chunks
    5. Store in ChromaDB
    """
    settings = get_settings()

    try:
        # Debug: log incoming upload metadata to help diagnose client issues
        if file:
            logger.info("Upload received: filename=%s content_type=%s size-unknown", file.filename, file.content_type)
            document_id, filename, text = await processor.save_and_extract(
                file=file,
                max_size_mb=settings.MAX_FILE_SIZE_MB
            )
        elif text:
            document_id, filename, text = await processor.save_raw_text(
                text=text,
                filename=filename or "text_input.txt",
                max_size_mb=settings.MAX_FILE_SIZE_MB,
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Provide either a file (multipart/form-data) or a 'text' field in the body."
            )

        # Index into vector DB
        num_chunks = await rag.index_document(
            document_id=document_id,
            filename=filename,
            text=text
        )

        logger.info(f"Successfully indexed document '{filename}' with id '{document_id}'")

        return UploadResponse(
            document_id=document_id,
            filename=filename,
            num_chunks=num_chunks,
        )
    except HTTPException:
        # Bubble up known HTTP errors unchanged
        raise
    except Exception as exc:  # pragma: no cover - defensive path
        logger.exception("Upload failed: %s", exc)
        # Return detailed error to client to aid debugging (still generic enough)
        raise HTTPException(status_code=500, detail=f"Upload failed: {type(exc).__name__}: {str(exc)[:200]}")


@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Query a document",
    description="Ask a natural language question about an uploaded document. The RAG pipeline retrieves relevant chunks and generates a grounded answer.",
)
async def query_document(
    request: QueryRequest,
    rag: RAGPipeline = Depends(get_rag_pipeline),
):
    """
    Query an indexed document using RAG.

    Flow:
    1. Embed the question
    2. Retrieve top-k similar chunks from ChromaDB
    3. Send chunks + question to Gemini
    4. Return structured answer with source chunks
    """
    logger.info(f"Received query request for document_id={request.document_id} question='{request.question[:80]}'")
    # Defensive: if RAG pipeline is not initialized, return a safe JSON payload
    if rag is None:
        logger.warning("RAG pipeline not initialized; returning fallback response for query.")
        model_used = getattr(getattr(__import__('app').app.state, 'llm_service', None), 'model', 'disabled')
        return JSONResponse(
            status_code=200,
            content={
                "document_id": request.document_id,
                "question": request.question,
                "answer": "Service temporarily unavailable: RAG pipeline not initialized.",
                "sources": [],
                "model_used": model_used,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    try:
        response = await rag.query(
            document_id=request.document_id,
            question=request.question,
            top_k=request.top_k,
        )
        logger.info(f"Query successful for document_id={request.document_id} — answer length={len(response.answer or '')}")
        return response
    except HTTPException:
        logger.exception("Query failed with HTTPException")
        raise
    except Exception as exc:
        logger.exception("Unhandled error during query: %s", exc)
        # Return a safe JSON payload with the error in `answer` so the frontend displays it
        model_used = getattr(getattr(__import__('app').app.state, 'llm_service', None), 'model', 'unknown')
        return JSONResponse(
            status_code=200,
            content={
                "document_id": request.document_id,
                "question": request.question,
                "answer": f"Internal error: {type(exc).__name__}: {str(exc)[:300]}",
                "sources": [],
                "model_used": model_used,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@router.get(
    "/documents",
    response_model=List[DocumentInfo],
    summary="List all indexed documents",
)
async def list_documents(rag: RAGPipeline = Depends(get_rag_pipeline)):
    """Returns a list of all documents currently indexed in the vector database."""
    docs = rag.list_documents()
    return [DocumentInfo(**d) for d in docs]


@router.get(
    "/documents/{document_id}",
    response_model=DocumentInfo,
    summary="Get document info",
)
async def get_document(
    document_id: str,
    rag: RAGPipeline = Depends(get_rag_pipeline),
):
    """Get metadata about a specific indexed document."""
    info = rag.get_document_info(document_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found.")
    return DocumentInfo(**info)


@router.delete(
    "/documents/{document_id}",
    summary="Delete an indexed document",
    status_code=200,
)
async def delete_document(
    document_id: str,
    rag: RAGPipeline = Depends(get_rag_pipeline),
):
    """Delete a document and all its embeddings from the vector database."""
    deleted = rag.delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found.")
    return {"message": f"Document '{document_id}' deleted successfully."}


@router.get("/health", summary="Health check")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "Document Analyzer API"}