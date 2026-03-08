"""
Document Processor Service.
Handles text extraction from PDF, DOCX, TXT, and IMAGE files.
Preserves document structure so downstream chunking and LLM reasoning work correctly.
"""
import os
import uuid
import logging
from pathlib import Path
from typing import Tuple

import aiofiles
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """
    Extracts structured text from uploaded documents.
    Supports: PDF, DOCX, TXT, PNG, JPG, JPEG, WEBP, BMP, TIFF
    """

    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}

    SUPPORTED_CONTENT_TYPES = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/bmp",
        "image/tiff",
    }

    IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}

    def __init__(self, upload_dir: str):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_and_extract(self, file: UploadFile, max_size_mb: int = 20) -> Tuple[str, str, str]:
        """
        Save the uploaded file and extract its text.
        Returns: (document_id, filename, extracted_text)
        """
        ext = Path(file.filename or "file").suffix.lower()
        content_type = file.content_type or ""

        # Validate file type
        if ext not in self.SUPPORTED_EXTENSIONS and content_type not in self.SUPPORTED_CONTENT_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type '{ext}'. Supported: PDF, DOCX, TXT, PNG, JPG, JPEG, WEBP, BMP, TIFF."
            )

        # Save file to disk
        document_id = str(uuid.uuid4())
        safe_filename = f"{document_id}{ext or '.bin'}"
        file_path = self.upload_dir / safe_filename
        max_bytes = max_size_mb * 1024 * 1024
        total_bytes = 0

        async with aiofiles.open(file_path, "wb") as out_file:
            while chunk := await file.read(65536):  # 64KB chunks
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {max_size_mb} MB."
                    )
                await out_file.write(chunk)

        logger.info("Saved '%s' → '%s' (%d bytes)", file.filename, safe_filename, total_bytes)

        # Extract text
        text = await self._extract_text(file_path, ext)

        if not text or not text.strip():
            file_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=422,
                detail="Could not extract any text from the document. "
                       "For images, ensure pytesseract and Tesseract OCR are installed."
            )

        logger.info("Extracted %d characters from '%s'", len(text), file.filename)
        return document_id, file.filename or safe_filename, text

    async def save_raw_text(
        self,
        text: str,
        filename: str = "text_input.txt",
        max_size_mb: int = 20,
    ) -> Tuple[str, str, str]:
        """Accept raw text content directly (JSON body upload path)."""
        if not text or not text.strip():
            raise HTTPException(status_code=422, detail="No text provided.")

        text_bytes = text.encode("utf-8")
        if len(text_bytes) > max_size_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"Text exceeds {max_size_mb} MB limit.")

        document_id = str(uuid.uuid4())
        ext = Path(filename).suffix or ".txt"
        safe_filename = f"{document_id}{ext}"
        file_path = self.upload_dir / safe_filename

        async with aiofiles.open(file_path, "w", encoding="utf-8") as f:
            await f.write(text)

        logger.info("Saved raw text as '%s' (%d bytes)", safe_filename, len(text_bytes))
        return document_id, filename, text

    # ──────────────────────────────────────────────────────────────────
    # Extraction dispatcher
    # ──────────────────────────────────────────────────────────────────

    async def _extract_text(self, file_path: Path, ext: str) -> str:
        try:
            if ext == ".pdf":
                return self._extract_pdf(file_path)
            elif ext == ".docx":
                return self._extract_docx(file_path)
            elif ext == ".txt":
                return self._extract_txt(file_path)
            elif ext in self.IMAGE_EXTENSIONS:
                return self._extract_image(file_path)
            else:
                return self._extract_txt(file_path)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Text extraction failed for %s: %s", file_path, e)
            raise HTTPException(status_code=422, detail=f"Failed to extract text: {str(e)}")

    # ──────────────────────────────────────────────────────────────────
    # PDF — structure-preserving extraction
    # ──────────────────────────────────────────────────────────────────

    def _extract_pdf(self, file_path: Path) -> str:
        """
        Extract text from PDF using pdfplumber.
        Preserves layout structure (headings, bullet points, line breaks)
        so the text splitter can identify sections correctly.
        Falls back to OCR if the PDF is image-based (scanned).
        """
        try:
            import pdfplumber
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="pdfplumber not installed. Run: pip install pdfplumber"
            )

        pages_text = []

        try:
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    # Extract with layout preservation
                    text = page.extract_text(
                        x_tolerance=2,
                        y_tolerance=2,
                        layout=True,              # preserves spatial layout
                        x_density=7.25,
                        y_density=13,
                    )

                    if text and text.strip():
                        pages_text.append(text.strip())
                    else:
                        # Page has no selectable text → try OCR on this page
                        logger.info("Page %d has no text layer — attempting OCR", page_num)
                        ocr_text = self._ocr_pdf_page(page)
                        if ocr_text:
                            pages_text.append(ocr_text.strip())

            full_text = "\n\n".join(pages_text)

            if not full_text.strip():
                # Entire PDF is image-based — OCR the whole file
                logger.info("PDF appears to be fully image-based, running full OCR")
                full_text = self._extract_image(file_path)

            return full_text
            
        except Exception as e:
            # pdfplumber/pdfminer will raise PDFSyntaxError if the file is not a valid PDF.
            logger.warning("PDF parsing failed (%r). Attempting fallback to TXT.", e)
            try:
                fallback_text = self._extract_txt(file_path)
                if fallback_text and fallback_text.strip():
                    return fallback_text
            except Exception as txt_err:
                logger.warning("Fallback TXT extraction also failed: %s", txt_err)

            # If we reach here, it's totally unreadable
            raise ValueError("The uploaded file could not be parsed as a PDF or text file. It may be corrupted.")

    def _ocr_pdf_page(self, page) -> str:
        """OCR a single pdfplumber page object."""
        try:
            import pytesseract
            from PIL import Image
            import io

            img = page.to_image(resolution=300).original
            return pytesseract.image_to_string(img, config="--psm 6")
        except ImportError:
            logger.warning("pytesseract/Pillow not installed — cannot OCR PDF pages")
            return ""
        except Exception as e:
            logger.warning("OCR failed for PDF page: %s", e)
            return ""

    # ──────────────────────────────────────────────────────────────────
    # DOCX — structure-preserving extraction
    # ──────────────────────────────────────────────────────────────────

    def _extract_docx(self, file_path: Path) -> str:
        """
        Extract text from DOCX preserving headings, paragraphs, and tables.
        Headings are output on their own lines so the text splitter
        can detect section boundaries correctly.
        """
        try:
            from docx import Document
            from docx.enum.text import WD_ALIGN_PARAGRAPH
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="python-docx not installed. Run: pip install python-docx"
            )

        doc = Document(str(file_path))
        lines = []

        for element in doc.element.body:
            tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag

            if tag == "p":
                # Paragraph
                from docx.oxml.ns import qn
                style_name = ""
                style_el = element.find(f".//{{{element.nsmap.get('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')}}}pStyle")
                if style_el is not None:
                    style_name = style_el.get(
                        "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val", ""
                    ).lower()

                text = "".join(
                    node.text or ""
                    for node in element.iter()
                    if node.tag.endswith("}t")
                ).strip()

                if text:
                    # Add blank line before headings to help section detection
                    if "heading" in style_name or "title" in style_name:
                        lines.append("")
                        lines.append(text)
                        lines.append("")
                    else:
                        lines.append(text)

            elif tag == "tbl":
                # Table — extract cell text row by row
                for row in element.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tr"):
                    cells = []
                    for cell in row.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tc"):
                        cell_text = "".join(
                            node.text or ""
                            for node in cell.iter()
                            if node.tag.endswith("}t")
                        ).strip()
                        if cell_text:
                            cells.append(cell_text)
                    if cells:
                        lines.append(" | ".join(cells))

        return "\n".join(lines)

    # ──────────────────────────────────────────────────────────────────
    # IMAGE — OCR extraction (for PNG, JPG, etc.)
    # ──────────────────────────────────────────────────────────────────

    def _extract_image(self, file_path: Path) -> str:
        """
        Extract text from images using pytesseract OCR.
        Preprocesses the image for better accuracy on document scans.
        Requires: pip install pytesseract pillow
        Also requires Tesseract binary: https://github.com/tesseract-ocr/tesseract
        """
        try:
            import pytesseract
            from PIL import Image, ImageFilter, ImageEnhance
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="pytesseract and Pillow are required for image text extraction. "
                       "Run: pip install pytesseract pillow\n"
                       "Also install Tesseract OCR binary from: https://github.com/tesseract-ocr/tesseract"
            )

        try:
            img = Image.open(file_path)

            # Convert to RGB if needed
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            # Preprocessing for better OCR accuracy on documents/lessons
            # 1. Convert to grayscale
            img = img.convert("L")

            # 2. Upscale small images (OCR works best at ~300 DPI)
            w, h = img.size
            if w < 1500 or h < 1500:
                scale = max(1500 / w, 1500 / h)
                img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

            # 3. Enhance contrast for scanned docs
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(2.0)

            # 4. Sharpen
            img = img.filter(ImageFilter.SHARPEN)

            # OCR config: PSM 6 = assume uniform block of text (good for documents)
            # PSM 3 = fully automatic page segmentation (better for mixed layouts)
            text = pytesseract.image_to_string(
                img,
                config="--psm 6 --oem 3",
                lang="eng",
            )

            logger.info("OCR extracted %d characters from image '%s'", len(text), file_path.name)
            return text.strip()

        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Image OCR failed for %s: %s", file_path, e)
            raise HTTPException(status_code=422, detail=f"Image OCR failed: {str(e)}")

    # ──────────────────────────────────────────────────────────────────
    # TXT
    # ──────────────────────────────────────────────────────────────────

    def _extract_txt(self, file_path: Path) -> str:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()