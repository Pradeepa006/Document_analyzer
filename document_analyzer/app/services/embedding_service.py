"""
Embedding Service using sentence-transformers.

Provides a thin wrapper to load a local sentence-transformers model
and produce L2-normalized embeddings for texts and queries.
"""
import logging
from typing import List

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Wrapper around SentenceTransformer.

    Uses all-mpnet-base-v2 for high-quality semantic embeddings.
    L2-normalizes vectors so similarity behaves correctly with ChromaDB.

    Methods:
        embed_texts(texts)  → list[list[float]]  (batch)
        embed_query(text)   → list[float]         (single)
    """

    def __init__(self, model_name: str = "sentence-transformers/all-mpnet-base-v2"):
        self.model_name = model_name
        self._model = None      # lazy-loaded on first use
        self._np = None         # FIX: store numpy reference at instance level to avoid scope bugs

    def _load_model(self):
        """Load model and numpy lazily so the app starts even without ML deps."""
        if self._model is None:
            try:
                import numpy as np
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise ImportError(
                    "sentence-transformers is required. "
                    "Install with: pip install sentence-transformers"
                ) from exc
            logger.info("Loading embedding model: %s", self.model_name)
            self._model = SentenceTransformer(self.model_name, device="cpu")
            self._np = np   # FIX: save numpy so it's always in scope when normalizing
            logger.info("Embedding model loaded.")

    def _normalize(self, embeddings):
        """L2-normalize a numpy array of embeddings row-wise."""
        np = self._np
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms = np.clip(norms, 1e-12, None)
        return embeddings / norms

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a batch of texts.

        Args:
            texts: List of strings to embed.

        Returns:
            List of L2-normalized embedding vectors (list of floats).
        """
        if not texts:
            return []

        self._load_model()

        embeddings = self._model.encode(
            texts,
            show_progress_bar=False,
            convert_to_numpy=True,
            batch_size=32,          # process in batches for large docs
        )
        embeddings = self._normalize(embeddings)
        return embeddings.tolist()

    def embed_query(self, text: str) -> List[float]:
        """
        Embed a single query string.

        Args:
            text: The query string to embed.

        Returns:
            L2-normalized embedding vector as list of floats.
        """
        if not text or not text.strip():
            raise ValueError("Query text must not be empty.")

        self._load_model()

        # FIX: _np is now safely stored at instance level — no scope crash
        emb = self._model.encode(
            [text],
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        emb = self._normalize(emb)
        return emb[0].tolist()