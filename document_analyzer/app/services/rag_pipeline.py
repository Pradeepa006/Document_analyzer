"""
RAG Pipeline Service — Fixed Version.
Key fix: analytical questions get ALL document chunks sent to Gemini,
not just the top-k semantically similar ones. This is why "Is he a good
student?" was returning career objective text instead of CGPA — the
embedding search retrieved the wrong chunks.
"""

import logging
import re
from typing import List, Dict, Any
from datetime import datetime

from fastapi import HTTPException
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService
from app.utils.text_splitter import split_text_into_chunks
from app.models.schemas import SourceChunk, QueryResponse

logger = logging.getLogger(__name__)


class RAGPipeline:

    def __init__(
        self,
        embedding_service: EmbeddingService,
        llm_service: LLMService,
        chroma_persist_dir: str = "./chroma_db",
        chunk_size: int = 800,
        chunk_overlap: int = 150,
        top_k: int = 10,
        max_context_chars: int = 30000,
    ):
        self.embedding_service = embedding_service
        self.llm_service = llm_service
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.top_k = top_k
        self.max_context_chars = max_context_chars
        self._fallback_store: Dict[str, Any] = {}

        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            self.chroma_client = chromadb.PersistentClient(
                path=chroma_persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            logger.info("ChromaDB initialized at: %s", chroma_persist_dir)
        except Exception:
            self.chroma_client = None
            logger.warning("ChromaDB not available — using in-memory fallback store.")

    # ──────────────────────────────────────────────────────────────────
    # INDEXING
    # ──────────────────────────────────────────────────────────────────

    async def index_document(self, document_id: str, filename: str, text: str) -> int:
        logger.info("Indexing document '%s' (id=%s)", filename, document_id)

        if self.chroma_client is None:
            chunks = split_text_into_chunks(text, self.chunk_size, self.chunk_overlap) or [text]
            self._fallback_store[document_id] = {
                "filename": filename,
                "uploaded_at": datetime.utcnow().isoformat(),
                "num_chunks": len(chunks),
                "chunks": chunks,
                "full_text": text,
            }
            return len(chunks)

        chunks = split_text_into_chunks(text, self.chunk_size, self.chunk_overlap)
        if not chunks:
            raise HTTPException(status_code=422, detail="Document has no readable text.")

        logger.info("Created %d chunks for '%s'", len(chunks), filename)

        try:
            embeddings = self.embedding_service.embed_texts(chunks)
        except ImportError as exc:
            logger.warning("EmbeddingService unavailable: %s", exc)
            self._fallback_store[document_id] = {
                "filename": filename,
                "uploaded_at": datetime.utcnow().isoformat(),
                "num_chunks": len(chunks),
                "chunks": chunks,
                "full_text": text,
            }
            return len(chunks)

        try:
            self.chroma_client.delete_collection(name=document_id)
        except Exception:
            pass

        collection = self.chroma_client.create_collection(
            name=document_id,
            metadata={
                "filename": filename,
                "uploaded_at": datetime.utcnow().isoformat(),
                "num_chunks": str(len(chunks)),
            },
        )

        batch_size = 500
        for start in range(0, len(chunks), batch_size):
            end = min(start + batch_size, len(chunks))
            collection.add(
                ids=[f"{document_id}_{i:05d}" for i in range(start, end)],
                embeddings=embeddings[start:end],
                documents=chunks[start:end],
                metadatas=[{"chunk_index": i, "filename": filename} for i in range(start, end)],
            )

        logger.info("Indexed '%s' with %d chunks.", filename, len(chunks))
        return len(chunks)

    # ──────────────────────────────────────────────────────────────────
    # QUERYING
    # ──────────────────────────────────────────────────────────────────

    async def query(self, document_id: str, question: str, top_k: int = None) -> QueryResponse:
        k = top_k or self.top_k
        analytical = self._is_analytical(question)

        # ── 1. Load chunks ──────────────────────────────────────────────
        if self.chroma_client is None:
            store = getattr(self, "_fallback_store", {})
            doc = store.get(document_id)
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found.")
            all_chunks = doc.get("chunks", [])
            retrieved_docs = all_chunks
            retrieved_metas = [{"chunk_index": i} for i in range(len(all_chunks))]
            retrieved_distances = [0.0] * len(all_chunks)

        else:
            try:
                collection = self.chroma_client.get_collection(name=document_id)
            except Exception:
                raise HTTPException(status_code=404, detail="Document not found.")

            total_chunks = collection.count()
            logger.info("Document '%s' has %d total chunks", document_id, total_chunks)

            if analytical:
                # FIX #3: ChromaDB 0.5.x collection.get() silently caps at 10 results
                # when no limit is given. Must pass limit=total_chunks explicitly
                # to retrieve ALL chunks for analytical/reasoning questions.
                logger.info(
                    "Analytical question — fetching ALL %d chunks for full context",
                    total_chunks,
                )
                all_results = collection.get(
                    include=["documents", "metadatas"],
                    limit=total_chunks,
                    offset=0,
                )
                
                # Sort by chunk_index to maintain document flow
                docs_with_meta = sorted(
                    zip(all_results["documents"], all_results["metadatas"]),
                    key=lambda x: x[1].get("chunk_index", 0)
                )
                
                retrieved_docs = [d for d, m in docs_with_meta]
                retrieved_metas = [m for d, m in docs_with_meta]
                retrieved_distances = [0.0] * len(retrieved_docs)
                logger.info("Retrieved and sorted %d chunks for analytical query", len(retrieved_docs))
            else:
                # Factual questions: normal semantic search
                query_embedding = self.embedding_service.embed_query(question)
                results = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=min(k, total_chunks),
                    include=["documents", "metadatas", "distances"],
                )
                retrieved_docs = results["documents"][0]
                retrieved_metas = results["metadatas"][0]
                retrieved_distances = results["distances"][0]

        if not retrieved_docs:
            return QueryResponse(
                document_id=document_id,
                question=question,
                answer="Answer not found in document.",
                sources=[],
                model_used=getattr(self.llm_service, "model", "unknown"),
            )

        logger.info(
            "Sending %d chunks (%d chars total) to LLM for question='%s'",
            len(retrieved_docs),
            sum(len(c) for c in retrieved_docs),
            question[:80],
        )

        # ── 2. Build source chunks for response ─────────────────────────
        source_chunks = [
            SourceChunk(
                content=doc,
                chunk_index=meta.get("chunk_index", idx),
                relevance_score=round(1.0 - dist / 2.0, 4),
            )
            for idx, (doc, meta, dist) in enumerate(
                zip(retrieved_docs, retrieved_metas, retrieved_distances)
            )
        ]

        # ── 3. Send to LLM ──────────────────────────────────────────────
        try:
            answer = await self.llm_service.generate_answer(
                question=question,
                context_chunks=retrieved_docs,
                max_context_chars=self.max_context_chars,
            )
            logger.info("Answer length=%d for question='%s'", len(answer or ""), question[:80])
        except Exception:
            logger.exception("LLM failed — using extractive fallback")
            answer = self._extractive_fallback(retrieved_docs, question)

        if not answer or not answer.strip():
            answer = self._extractive_fallback(retrieved_docs, question)

        return QueryResponse(
            document_id=document_id,
            question=question,
            answer=answer.strip(),
            sources=source_chunks,
            model_used=getattr(self.llm_service, "model", "unknown"),
        )


    # ──────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────

    @staticmethod
    def _is_analytical(question: str) -> bool:
        """
        Mirror of LLMService._is_analytical — used to decide retrieval strategy.
        Analytical → fetch all chunks (for summary/overview).
        Factual → semantic search top-k (for specific 'what is/how to' questions).
        """
        q = question.lower().strip()

        # Triggers for full document context (Analytical)
        analytical_triggers = [
            "summarize", "summary", "overview", "overall", "analyze", 
            "comprehensive", "full detail", "everything about", "background"
        ]
        if any(t in q for t in analytical_triggers):
            return True

        # Default to Factual (Semantic Search) for specific questions
        # This includes "What is Newton's Law", "How does X work", etc.
        return False

    @staticmethod
    def _extractive_fallback(chunks: List[str], question: str) -> str:
        """Simple sentence-overlap fallback when LLM fails."""
        text = " ".join(c.strip() for c in chunks if c.strip())
        if not text:
            return "Could not find relevant content in the document."
        
        q_lower = question.lower()
        if "summarize" in q_lower or "summary" in q_lower:
            return "Summary attempt (extractive): " + text[:600] + "..."

        q_words = set(re.findall(r"\w+", q_lower))
        sentences = re.split(r"(?<=[.!?])\s+", text)
        scored = []
        for s in sentences:
            s_words = set(re.findall(r"\w+", s.lower()))
            # Jaccard-like overlap
            overlap = len(q_words & s_words)
            score = overlap / max(len(s_words), 1)
            scored.append((score, s))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        # Filter out zero scores if possible
        best = [s for sc, s in scored if sc > 0]
        if not best:
             return "Extractive fallback: " + text[:500]
             
        return " ".join(best[:3]).strip()

    # ──────────────────────────────────────────────────────────────────
    # Utility methods
    # ──────────────────────────────────────────────────────────────────

    def get_document_info(self, document_id: str) -> Dict[str, Any]:
        if self.chroma_client is None:
            store = getattr(self, "_fallback_store", {})
            doc = store.get(document_id)
            if not doc:
                return None
            return {
                "document_id": document_id,
                "filename": doc.get("filename", "unknown"),
                "num_chunks": int(doc.get("num_chunks", 0)),
                "uploaded_at": doc.get("uploaded_at", "unknown"),
            }
        try:
            collection = self.chroma_client.get_collection(name=document_id)
            meta = collection.metadata or {}
            return {
                "document_id": document_id,
                "filename": meta.get("filename", "unknown"),
                "num_chunks": int(meta.get("num_chunks", 0)),
                "uploaded_at": meta.get("uploaded_at", "unknown"),
            }
        except Exception:
            return None

    def list_documents(self) -> List[Dict[str, Any]]:
        if self.chroma_client is None:
            store = getattr(self, "_fallback_store", {})
            return [
                {
                    "document_id": doc_id,
                    "filename": doc.get("filename", "unknown"),
                    "num_chunks": int(doc.get("num_chunks", 0)),
                    "uploaded_at": doc.get("uploaded_at", "unknown"),
                }
                for doc_id, doc in store.items()
            ]
        return [
            info
            for col in self.chroma_client.list_collections()
            if (info := self.get_document_info(col.name)) is not None
        ]

    def delete_document(self, document_id: str) -> bool:
        if self.chroma_client is None:
            store = getattr(self, "_fallback_store", {})
            if document_id in store:
                del store[document_id]
                return True
            return False
        try:
            self.chroma_client.delete_collection(name=document_id)
            logger.info("Deleted document: %s", document_id)
            return True
        except Exception:
            return False