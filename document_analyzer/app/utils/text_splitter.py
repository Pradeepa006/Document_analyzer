"""
Text Splitter — splits documents into meaningful, structured chunks.
Works for resumes, lesson PDFs, scanned images, and general documents.
"""
import re
from typing import List


# Flexible section heading pattern — matches headings in many real-world formats:
# "Skills", "SKILLS", "Skills:", "2. Skills", "• Skills", "Skills -"
SECTION_HEADINGS = re.compile(
    r"(?mi)^[\s\d•\-–*.]*(?:"
    r"career\s*objective|objective|summary|profile|about\s*me|about|"
    r"education|academic|qualification|"
    r"technical\s*skills?|skills?|technologies|competencies|"
    r"experience|work\s*experience|internship|employment|"
    r"projects?|personal\s*projects?|academic\s*projects?|"
    r"achievements?|awards?|certifications?|certificates?|honours?|"
    r"extra.?curricular|activities|hobbies|interests|"
    r"languages?|declaration|references?|"
    # Lesson / study document headings
    r"introduction|overview|definition|concept|chapter|unit|topic|"
    r"theory|formula|example|exercise|conclusion|summary|revision|"
    r"key\s*points?|important\s*notes?|notes?"
    r")\s*[:\-–]?\s*$",
)


def split_text_into_chunks(
    text: str,
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> List[str]:
    """
    Split document text into meaningful chunks.

    Strategy:
    1. Section-based splitting (headings like Skills, Education, Chapter 1...)
    2. Sentence-based splitting for oversized sections
    3. Character-limit fallback with overlap
    """
    if not text or not text.strip():
        return []

    text = _clean_text(text)

    # Step 1: Try section-based splitting
    section_chunks = _split_by_sections(text)

    if section_chunks:
        final_chunks = []
        for section in section_chunks:
            if len(section) <= chunk_size:
                final_chunks.append(section)
            else:
                final_chunks.extend(_split_by_sentences(section, chunk_size, chunk_overlap))
    else:
        # No sections found (flat text) — split by sentences
        final_chunks = _split_by_sentences(text, chunk_size, chunk_overlap)

    # Deduplicate and filter tiny chunks
    seen = set()
    result = []
    for chunk in final_chunks:
        chunk = chunk.strip()
        if len(chunk) < 25:
            continue
        if chunk in seen:
            continue
        seen.add(chunk)
        result.append(chunk)

    return result if result else [text[:chunk_size]]


def _clean_text(text: str) -> str:
    """Normalize whitespace and remove non-printable characters."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]", " ", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def _split_by_sections(text: str) -> List[str]:
    """
    Split on section heading boundaries.
    Returns [] if no headings detected so caller falls back to sentence splitting.
    """
    lines = text.splitlines()
    sections = []
    current: List[str] = []
    found_heading = False

    for line in lines:
        stripped = line.strip()
        if stripped and SECTION_HEADINGS.match(stripped):
            # Save previous section
            if current:
                block = "\n".join(current).strip()
                if block:
                    sections.append(block)
            current = [line]
            found_heading = True
        else:
            current.append(line)

    # Save final section
    if current:
        block = "\n".join(current).strip()
        if block:
            sections.append(block)

    return sections if found_heading else []


def _split_by_sentences(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """Group sentences into chunks of up to chunk_size with overlap."""
    # Split on sentence boundaries OR newlines
    sentences = re.split(r"(?<=[.!?])\s+|\n", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        return [text]

    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for sentence in sentences:
        slen = len(sentence)
        if current_len + slen > chunk_size and current:
            chunks.append(" ".join(current))
            # Overlap: carry over last few sentences
            overlap: List[str] = []
            overlap_len = 0
            for s in reversed(current):
                if overlap_len + len(s) > chunk_overlap:
                    break
                overlap.insert(0, s)
                overlap_len += len(s)
            current = overlap
            current_len = overlap_len

        current.append(sentence)
        current_len += slen

    if current:
        chunks.append(" ".join(current))

    return chunks