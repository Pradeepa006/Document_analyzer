# 📄 Document Analyzer API

A production-ready **FastAPI** backend for intelligent document Q&A using **RAG (Retrieval-Augmented Generation)**.

Upload any PDF, DOCX, or TXT document and ask natural language questions — the backend retrieves the most relevant passages and generates grounded answers via **Google Gemini**.

---

## 🏗️ Project Structure

```
document_analyzer/
├── app/
│   ├── main.py                    # FastAPI app factory + lifespan startup
│   ├── api/
│   │   └── routes.py              # All HTTP endpoints
│   ├── services/
│   │   ├── document_processor.py  # File upload + text extraction (PDF/DOCX/TXT)
│   │   ├── embedding_service.py   # sentence-transformers embeddings (local)
│   │   ├── llm_service.py         # Google Gemini API integration
│   │   └── rag_pipeline.py        # Full RAG orchestration + ChromaDB
│   ├── models/
│   │   └── schemas.py             # Pydantic request/response models
│   ├── core/
│   │   └── config.py              # Settings loaded from .env
│   └── utils/
│       └── text_splitter.py       # Sentence-aware text chunking
├── requirements.txt
├── .env.example
└── README.md
```

---

## ⚡ RAG Flow Explained

```
USER QUESTION
      │
      ▼
┌─────────────────────┐
│  Embed the question │  ← sentence-transformers (local, free)
│  → 384-dim vector   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  ChromaDB Vector Search     │  ← cosine similarity (dot product)
│  Retrieve Top-K chunks      │  ← K=5 by default
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Build Prompt               │
│  [System] + [Context] +     │
│  [Question]                 │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Google Gemini 1.5 Flash    │  ← grounded answer only
│  temperature=0.2            │
└──────────┬──────────────────┘
           │
           ▼
  Structured JSON Response
  (answer + source chunks + scores)
```

### Indexing Flow (on upload):
```
FILE → Extract Text → Split into Chunks → Embed (local) → Store in ChromaDB
```

---

## 🚀 Setup & Running

### 1. Prerequisites

- Python **3.12.x** (do not use 3.13 yet; torch/numpy wheels in requirements are built for ≤3.12)
- ~2 GB disk space (for the embedding model download on first run)

### 2. Clone / navigate to the project

```bash
cd document_analyzer
```

### 3. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate       # Linux/Mac
# or
venv\Scripts\activate          # Windows
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

> **Note:** The first run will download `all-MiniLM-L6-v2` (~90MB) from HuggingFace. This only happens once.

### 5. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your **Gemini API key**:
```
GEMINI_API_KEY=your_actual_key_here
```

Get a free key at: https://aistudio.google.com/app/apikey

### 6. Run the server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API is now live at **http://localhost:8000**

- **Interactive docs (Swagger UI):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/upload` | Upload & index a document |
| `POST` | `/api/v1/query` | Ask a question about a document |
| `GET` | `/api/v1/documents` | List all indexed documents |
| `GET` | `/api/v1/documents/{id}` | Get document info |
| `DELETE` | `/api/v1/documents/{id}` | Delete a document |

---

## 🧪 Sample Requests

### Upload a document

**cURL:**
```bash
curl -X POST http://localhost:8000/api/v1/upload \
  -F "file=@/path/to/your/document.pdf"
```

**Postman:**
- Method: `POST`
- URL: `http://localhost:8000/api/v1/upload`
- Body: `form-data` → key: `file`, value: select your file

**Response:**
```json
{
  "document_id": "3f7a2c1e-8b4d-4e9a-b2d1-1a2b3c4d5e6f",
  "filename": "annual_report.pdf",
  "num_chunks": 47,
  "message": "Document uploaded and indexed successfully"
}
```

---

### Query a document

**cURL:**
```bash
curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "3f7a2c1e-8b4d-4e9a-b2d1-1a2b3c4d5e6f",
    "question": "What were the total revenues in Q3?",
    "top_k": 5
  }'
```

**Response:**
```json
{
  "document_id": "3f7a2c1e-8b4d-4e9a-b2d1-1a2b3c4d5e6f",
  "question": "What were the total revenues in Q3?",
  "answer": "According to the document, total revenues in Q3 were $4.2 billion, representing a 12% increase year-over-year. This figure includes both product and service revenues.",
  "sources": [
    {
      "content": "Q3 total revenues reached $4.2 billion, up 12% from the prior year period...",
      "chunk_index": 23,
      "relevance_score": 0.9341
    },
    {
      "content": "Product revenues accounted for $3.1B while services contributed $1.1B...",
      "chunk_index": 24,
      "relevance_score": 0.8812
    }
  ],
  "model_used": "gemini-1.5-flash",
  "timestamp": "2024-01-15T10:30:00"
}
```

---

### List all documents

```bash
curl http://localhost:8000/api/v1/documents
```

### Delete a document

```bash
curl -X DELETE http://localhost:8000/api/v1/documents/3f7a2c1e-8b4d-4e9a-b2d1-1a2b3c4d5e6f
```

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | *(required)* | Your Google Gemini API key |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model variant |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Local embedding model |
| `CHUNK_SIZE` | `800` | Characters per chunk |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks |
| `TOP_K_CHUNKS` | `5` | Chunks retrieved per query |
| `MAX_CONTEXT_TOKENS` | `3000` | Max context chars sent to LLM |
| `MAX_FILE_SIZE_MB` | `20` | Upload size limit |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | ChromaDB storage path |
| `UPLOAD_DIR` | `./uploads` | File upload storage path |

---

## 🔌 Frontend Integration

Update your `Chat.jsx` to call the API:

```javascript
// Upload document
const formData = new FormData();
formData.append('file', selectedFile);
const uploadRes = await fetch('http://localhost:8000/api/v1/upload', {
  method: 'POST',
  body: formData,
});
const { document_id } = await uploadRes.json();

// Query document
const queryRes = await fetch('http://localhost:8000/api/v1/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ document_id, question: userMessage }),
});
const { answer } = await queryRes.json();
```

---

## 🛡️ Security Notes

- API key is loaded from `.env` — never committed to git
- Add `.env` and `uploads/` and `chroma_db/` to `.gitignore`
- For production, add authentication (e.g., API key header or OAuth2)
- Rate limiting recommended for public deployments (use `slowapi`)

---

## 📦 Why Gemini over HuggingFace Inference API?

| Feature | Gemini 1.5 Flash | HF Inference API (Mistral-7B) |
|---------|-----------------|-------------------------------|
| Context window | 1M tokens | ~8K tokens |
| Free tier | Generous | Throttled, slow |
| Latency | ~1-2s | ~5-30s (cold start) |
| JSON output | Reliable | Inconsistent |
| Setup | API key only | API key + model availability |

Gemini 1.5 Flash is ideal for document RAG due to its massive context window and fast inference.