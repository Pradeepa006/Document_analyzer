"""
LLM Service — Google Gemini API.
Analytical questions get the full document → precise reasoned answers.
Factual questions use regex → instant precise extraction.
"""
import logging
import re
from typing import List

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class LLMService:

    GEMINI_API_URL = (
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    )

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set.")
        self.api_key = api_key
        self.model = model
        self.api_url = self.GEMINI_API_URL.format(model=model)

    async def generate_answer(
        self,
        question: str,
        context_chunks: List[str],
        max_context_chars: int = 8000,
    ) -> str:
        if not context_chunks:
            return "No relevant content was found in the document to answer this question."

        # Path 1: Instant regex for pure factual lookups
        local_answer = self._local_extract(question, context_chunks)
        if local_answer:
            logger.info("Local extraction: '%s'", local_answer[:80])
            return local_answer

        # Path 2: Gemini — merge all chunks into clean document
        context = self._merge_chunks(context_chunks, max_context_chars)
        analytical = self._is_analytical(question)

        if analytical:
            logger.info("REASONING prompt → '%s'", question[:80])
            prompt = self._build_reasoning_prompt(question, context)
            return await self._call_gemini(prompt, temperature=0.2, max_tokens=1024)
        else:
            logger.info("EXTRACTION prompt → '%s'", question[:80])
            prompt = self._build_extraction_prompt(question, context)
            return await self._call_gemini(prompt, temperature=0.0, max_tokens=512)

    # ------------------------------------------------------------------
    # Merge chunks — deduplicate lines before sending to Gemini
    # ------------------------------------------------------------------

    @staticmethod
    def _merge_chunks(chunks: List[str], max_chars: int) -> str:
        seen: set = set()
        lines: List[str] = []
        for chunk in chunks:
            for line in chunk.splitlines():
                line = line.strip()
                if line and line not in seen:
                    seen.add(line)
                    lines.append(line)
        full = "\n".join(lines)
        return full[:max_chars] if len(full) > max_chars else full

    # ------------------------------------------------------------------
    # Local extraction — ONLY pure factual lookups, nothing analytical
    # ------------------------------------------------------------------

    def _local_extract(self, question: str, chunks: List[str]) -> str | None:
        q = question.lower().strip()
        full_text = "\n".join(chunks)

        if self._strict_match(q, ["what is his name", "what is her name",
                                   "candidate name", "who is this", "his name", "her name"]):
            m = re.search(r"(?:Name|Full Name)\s*[:\-]\s*([A-Z][A-Za-z .',-]{1,60})", full_text)
            if m:
                return m.group(1).strip().rstrip(",")

        if self._strict_match(q, ["what is his email", "what is her email",
                                   "his email", "her email", "email address", "mail id"]):
            m = re.search(r"[\w.\-+]+@[\w.\-]+\.[a-zA-Z]{2,}", full_text)
            if m:
                return m.group(0)

        if self._strict_match(q, ["what is his phone", "what is her phone",
                                   "his phone", "his mobile", "phone number", "mobile number"]):
            m = re.search(r"\+?\d[\d\s\-().]{6,}\d", full_text)
            if m:
                return m.group(0).strip()

        if self._strict_match(q, ["what is his cgpa", "what is her cgpa",
                                   "his cgpa", "her cgpa", "cgpa", "what is cgpa",
                                   "what is his gpa", "gpa"]):
            m = re.search(r"(?:CGPA|GPA)\s*[:\-]?\s*(\d+\.?\d*\s*/\s*\d+\.?\d*|\d+\.?\d*)", full_text, re.I)
            if m:
                return m.group(1).strip()

        if self._strict_match(q, ["his location", "her location", "location",
                                   "where is he from", "city", "address"]):
            m = re.search(r"(?:Location|Address|City)\s*[:\-]\s*([A-Za-z ,.\-]{3,80})", full_text, re.I)
            if m:
                return m.group(1).strip().rstrip(",")

        if self._strict_match(q, ["which college", "what college", "which university",
                                   "what university", "his college", "her college"]):
            m = re.search(r"([A-Z][A-Za-z ]+(?:University|College|Institute|School|Academy)[A-Za-z ,]*)", full_text)
            if m:
                return m.group(1).strip()

        if self._strict_match(q, ["list his skills", "list her skills", "list skills",
                                   "what are his skills", "what are her skills",
                                   "what skills does he have", "technical skills",
                                   "his skills", "her skills"]):
            return self._extract_skills(full_text)

        if self._strict_match(q, ["list his projects", "his projects", "what projects"]):
            return self._extract_section(full_text, ["Projects", "Project"])

        if self._strict_match(q, ["his experience", "work experience", "internship"]):
            return self._extract_section(full_text, ["Experience", "Internship"])

        return None

    @staticmethod
    def _strict_match(question: str, phrases: List[str]) -> bool:
        return any(phrase in question for phrase in phrases)

    @staticmethod
    def _extract_skills(text: str) -> str | None:
        patterns = [
            r"(?:Technical\s+)?Skills?\s*[:\-]\s*([^\n]{10,300})",
            r"Programming\s+Languages?\s*[:\-]\s*([^\n]{5,200})",
            r"Frontend\s*[:\-]\s*([^\n]{5,200})",
            r"Backend\s*[:\-]\s*([^\n]{5,200})",
            r"Database\s*[:\-]\s*([^\n]{5,200})",
            r"Tools?\s*[:\-]\s*([^\n]{5,200})",
            r"Frameworks?\s*[:\-]\s*([^\n]{5,200})",
        ]
        found, seen = [], set()
        for pat in patterns:
            for m in re.finditer(pat, text, re.I):
                val = m.group(1).strip().rstrip(".")
                if val and val not in seen:
                    seen.add(val)
                    found.append(val)
        return "\n".join(found) if found else None

    @staticmethod
    def _extract_section(text: str, headings: List[str]) -> str | None:
        for heading in headings:
            m = re.search(
                rf"{heading}[s]?\s*[:\-]?\s*\n?(.*?)(?:\n[A-Z][A-Za-z ]+[:\-]|\Z)",
                text, re.I | re.S
            )
            if m:
                content = m.group(1).strip()
                if len(content) > 10:
                    return content[:600]
        return None

    # ------------------------------------------------------------------
    # Classifier — default ANALYTICAL, only specific factual = False
    # ------------------------------------------------------------------

    @staticmethod
    def _is_analytical(question: str) -> bool:
        q = question.lower().strip()
        factual_only = [
            r"^what is his (name|email|phone|cgpa|gpa|location|city|degree)[\s?]*$",
            r"^what is her (name|email|phone|cgpa|gpa|location|city|degree)[\s?]*$",
            r"^(his|her) (name|email|phone|cgpa|gpa|location)[\s?]*$",
            r"^list (his|her|the) (skills?|projects?)[\s?]*$",
            r"^what are (his|her) (skills?|projects?)[\s?]*$",
            r"^(cgpa|gpa|email|phone|name)[\s?]*$",
        ]
        for p in factual_only:
            if re.match(p, q):
                return False
        return True  # Everything else → reasoning

    # ------------------------------------------------------------------
    # Prompts
    # ------------------------------------------------------------------

    @staticmethod
    def _build_extraction_prompt(question: str, context: str) -> str:
        return f"""You are a precise document extraction assistant.

DOCUMENT:
{context}

QUESTION: {question}

Return ONLY the specific value. No extra text.
- Single value (name/CGPA/email): just the value. e.g. "8.7/10"
- List: clean bullet points.
- Not found: "Not mentioned in the document."

ANSWER:"""

    @staticmethod
    def _build_reasoning_prompt(question: str, context: str) -> str:
        return f"""You are an intelligent document assistant. Think like ChatGPT.

Read the full document below carefully, then answer the question by reasoning from the facts.
NEVER paste raw document text. Always synthesize a proper human answer.

DOCUMENT:
{context}

QUESTION: {question}

HOW TO ANSWER — follow these examples:

Q: "Is he a good student?"
✗ WRONG: "Career Objective Motivated Computer Science student seeking internship..."
✓ RIGHT: "Yes, Arun is a strong student. He has a CGPA of 8.7/10 at XYZ Engineering College, which reflects excellent academic performance."

Q: "Top 1 job role he suits the most?"
✗ WRONG: "opportunity to apply knowledge in Full Stack Development AI and Data Structures..."
✓ RIGHT: "The role Arun suits best is Full Stack Developer. He has skills in React.js, Spring Boot, FastAPI, MySQL, and MongoDB — covering both frontend and backend — along with a strong CGPA of 8.7/10."

Q: "Job opportunity for him?"
✓ RIGHT: "Arun is well-suited for Full Stack Developer or Junior Software Engineer roles at tech companies. His skill set in React.js, Spring Boot, FastAPI, and databases, combined with his 8.7 CGPA, make him a competitive entry-level candidate."

Q: "Summarize this document"
✓ RIGHT: "This is the resume of Arun Kumar, a B.E. Computer Science student (2023–2027) at XYZ Engineering College with a CGPA of 8.7/10. He is skilled in Full Stack Development (React.js, Spring Boot, FastAPI), databases (MySQL, MongoDB), and tools like Git and Docker. He is seeking an internship in Full Stack Development or AI."

ABSOLUTE RULES:
1. NEVER copy raw document lines as your answer.
2. YES/NO questions → answer word + 1-2 sentences of evidence.
3. Role/job questions → name the specific role + justify with skills from the doc.
4. Keep it under 6 sentences. Be concise and helpful.
5. Only say "not found" if truly zero relevant info exists.

ANSWER:"""

    # ------------------------------------------------------------------
    # Gemini API call
    # ------------------------------------------------------------------

    async def _call_gemini(self, prompt: str, temperature: float = 0.2, max_tokens: int = 1024) -> str:
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "topP": 0.9,
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ],
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                resp = await client.post(
                    self.api_url,
                    params={"key": self.api_key},
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                logger.error("Gemini HTTP error: %s", e.response.status_code)
                raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.status_code}")
            except httpx.RequestError as e:
                logger.error("Gemini request failed: %s", e)
                raise HTTPException(status_code=503, detail="Could not reach Gemini API.")

        data = resp.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError):
            if data.get("candidates", [{}])[0].get("finishReason") == "SAFETY":
                return "Response blocked by safety filter. Please rephrase."
            raise HTTPException(status_code=502, detail="Unexpected Gemini response format.")