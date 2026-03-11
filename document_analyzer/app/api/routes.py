"""
API Routes.
Defines all HTTP endpoints for the Document Analyzer API.
"""

import logging
import json
import os
from typing import List
from datetime import datetime
from shutil import copyfileobj

from fastapi import APIRouter, UploadFile, File, Body, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.models.schemas import (
    UploadResponse,
    QueryRequest,
    QueryResponse,
    DocumentInfo,
)

from app.services.document_processor import DocumentProcessor
from app.services.rag_pipeline import RAGPipeline
from app.core.config import get_settings


logger = logging.getLogger(__name__)
router = APIRouter()

# ----------------------------------------------------
# File storage setup
# ----------------------------------------------------

UPLOAD_DIR = "uploads"
JSON_FILE = "documents.json"

os.makedirs(UPLOAD_DIR, exist_ok=True)

if not os.path.exists(JSON_FILE):
    with open(JSON_FILE, "w") as f:
        json.dump([], f)


def load_docs():
    with open(JSON_FILE, "r") as f:
        return json.load(f)


def save_docs(data):
    with open(JSON_FILE, "w") as f:
        json.dump(data, f, indent=2)


# Serve uploaded files
router.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ----------------------------------------------------
# Dependency Injection
# ----------------------------------------------------


def get_rag_pipeline() -> RAGPipeline:
    from app.main import app
    return app.state.rag_pipeline


def get_doc_processor() -> DocumentProcessor:
    from app.main import app
    return app.state.doc_processor


# ----------------------------------------------------
# Upload Document (RAG + UI)
# ----------------------------------------------------


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=201,
)
async def upload_document(
    file: UploadFile | None = File(default=None),
    text: str | None = Body(default=None, embed=True),
    filename: str | None = Body(default=None, embed=True),
    rag: RAGPipeline = Depends(get_rag_pipeline),
    processor: DocumentProcessor = Depends(get_doc_processor),
):

    settings = get_settings()

    try:

        if file:

            logger.info("Upload received: %s", file.filename)

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
                detail="Provide either file or text"
            )

        # Index into vector DB
        num_chunks = await rag.index_document(
            document_id=document_id,
            filename=filename,
            text=text
        )

        # ---------------------------
        # Save for UI listing
        # ---------------------------

        docs = load_docs()

        new_doc = {
            "id": len(docs) + 1,
            "name": filename,
            "status": "Processed",
            "file": f"/uploads/{filename}",
            "deleted": False
        }

        docs.append(new_doc)
        save_docs(docs)

        return UploadResponse(
            document_id=document_id,
            filename=filename,
            num_chunks=num_chunks,
        )

    except Exception as exc:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ----------------------------------------------------
# Query Document
# ----------------------------------------------------


@router.post(
    "/query",
    response_model=QueryResponse,
)
async def query_document(
    request: QueryRequest,
    rag: RAGPipeline = Depends(get_rag_pipeline),
):

    logger.info(
        f"Query request for {request.document_id}"
    )

    if rag is None:

        return JSONResponse(
            status_code=200,
            content={
                "document_id": request.document_id,
                "question": request.question,
                "answer": "RAG pipeline not initialized",
                "sources": [],
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    try:

        response = await rag.query(
            document_id=request.document_id,
            question=request.question,
            top_k=request.top_k,
        )

        return response

    except Exception as exc:

        return JSONResponse(
            status_code=200,
            content={
                "document_id": request.document_id,
                "question": request.question,
                "answer": f"Internal error: {str(exc)}",
                "sources": [],
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


# ----------------------------------------------------
# Document Library
# ----------------------------------------------------


@router.get("/documents")
def get_documents():

    docs = load_docs()

    return [d for d in docs if not d.get("deleted", False)]


@router.get("/trash")
def get_trash():

    docs = load_docs()

    return [d for d in docs if d.get("deleted", False)]


# ----------------------------------------------------
# Delete Document (move to trash)
# ----------------------------------------------------


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int):

    docs = load_docs()

    for d in docs:
        if d["id"] == doc_id:
            d["deleted"] = True

    save_docs(docs)

    return {"success": True}


# ----------------------------------------------------
# Restore Document
# ----------------------------------------------------

@router.put("/restore/{doc_id}")
def restore_document(doc_id: int):

    docs = load_docs()

    for d in docs:
        if d["id"] == doc_id:
            d["deleted"] = False

    save_docs(docs)

    return {"restored": True}


# ----------------------------------------------------
# Health Check
# ----------------------------------------------------


@router.get("/health")
def health_check():

    return {
        "status": "ok",
        "service": "Document Analyzer API"
    }

@router.delete("/trash/clear")
def clear_trash():

    docs = load_docs()

    # keep only active documents
    remaining = [d for d in docs if not d.get("deleted", False)]

    save_docs(remaining)

    return {"message": "Trash cleared successfully"}
