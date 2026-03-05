"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class UploadResponse(BaseModel):
    """Response after a successful document upload."""
    document_id: str = Field(..., description="Unique ID for the uploaded document")
    filename: str
    num_chunks: int = Field(..., description="Number of text chunks created")
    message: str = "Document uploaded and indexed successfully"


class QueryRequest(BaseModel):
    """Request body for querying a document."""
    document_id: str = Field(..., description="ID of the document to query")
    question: str = Field(..., min_length=3, description="The user's question")
    top_k: Optional[int] = Field(default=None, description="Number of chunks to retrieve (overrides default)")


class SourceChunk(BaseModel):
    """A retrieved source chunk returned with the answer."""
    content: str
    chunk_index: int
    relevance_score: float


class QueryResponse(BaseModel):
    """Structured response from the RAG pipeline."""
    document_id: str
    question: str
    answer: str
    sources: List[SourceChunk] = Field(default_factory=list)
    model_used: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DocumentInfo(BaseModel):
    """Basic info about an indexed document."""
    document_id: str
    filename: str
    num_chunks: int
    uploaded_at: str


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None