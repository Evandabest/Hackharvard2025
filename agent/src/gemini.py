"""Gemini AI client via Cloudflare AI Gateway."""

import base64
import logging
from typing import Any

import httpx
import orjson
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import Config

logger = logging.getLogger(__name__)


class GeminiClient:
    """Client for Gemini AI via Cloudflare AI Gateway."""

    def __init__(self, config: Config):
        self.config = config
        self.base_url = config.ai_gateway_url.rstrip("/")
        self.client = httpx.Client(timeout=120.0)  # Longer timeout for AI calls
        self.headers = {
            "Authorization": f"Bearer {config.google_api_key}",
            "Content-Type": "application/json",
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=4, max=30),
    )
    def extract_text(self, file_bytes: bytes, mime_type: str) -> str:
        """
        Extract text from a document using Gemini's multimodal capabilities.

        Uses inlineData to send the document directly to Gemini for text extraction,
        avoiding the need for local OCR/parsing libraries.

        Args:
            file_bytes: Document bytes
            mime_type: MIME type (e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')

        Returns:
            Extracted text content

        Raises:
            httpx.HTTPError: If API call fails
        """
        # Base64 encode the file
        encoded_data = base64.b64encode(file_bytes).decode("utf-8")

        # Build the request payload
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                "Extract all readable text and tabular data from this document as UTF-8 plain text. "
                                "Preserve row/column order where possible. "
                                "Include all text content, tables, headers, and footers. "
                                "Do not add any commentary or explanation, just return the extracted text."
                            )
                        },
                        {"inlineData": {"mimeType": mime_type, "data": encoded_data}},
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.1,  # Low temperature for consistent extraction
                "maxOutputTokens": 8192,
            },
        }

        logger.info(f"Extracting text from {len(file_bytes)} bytes ({mime_type})")

        # Call Gemini via AI Gateway (use configured model)
        # Default to gemini-2.0-flash if not specified
        model = getattr(self.config, 'gemini_chat_model', 'gemini-2.0-flash')
        response = self.client.post(
            f"{self.base_url}/models/{model}:generateContent",
            headers=self.headers,
            content=orjson.dumps(payload),
        )
        response.raise_for_status()

        data = response.json()

        # Extract text from response
        try:
            candidates = data.get("candidates", [])
            if not candidates:
                logger.warning("No candidates in Gemini response")
                return ""

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])

            if not parts:
                logger.warning("No parts in Gemini response")
                return ""

            # Concatenate all text parts
            text = " ".join(part.get("text", "") for part in parts)
            logger.info(f"Extracted {len(text)} characters of text")
            return text.strip()

        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            logger.debug(f"Response data: {data}")
            return ""

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=4, max=30),
    )
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for texts using Gemini's embedding model.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors

        Raises:
            httpx.HTTPError: If API call fails
        """
        if not texts:
            return []

        # Build requests for each text
        requests = []
        for text in texts:
            requests.append({"model": "models/text-embedding-004", "content": {"parts": [{"text": text}]}})

        payload = {"requests": requests}

        logger.info(f"Embedding {len(texts)} texts")

        # Use configured embedding model
        embed_model = getattr(self.config, 'gemini_embed_model', 'text-embedding-004')
        response = self.client.post(
            f"{self.base_url}/models/{embed_model}:batchEmbedContents",
            headers=self.headers,
            content=orjson.dumps(payload),
        )
        response.raise_for_status()

        data = response.json()

        # Extract embeddings from response
        embeddings = []
        for embedding_data in data.get("embeddings", []):
            values = embedding_data.get("values", [])
            if values:
                embeddings.append(values)

        logger.info(f"Generated {len(embeddings)} embeddings")
        return embeddings

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=4, max=30),
    )
    def chat(
        self,
        prompt: str,
        model: str | None = None,
        context: list[dict[str, Any]] | None = None,
    ) -> str:
        """
        Chat with Gemini for analysis and summarization.

        Args:
            prompt: User prompt
            model: Model name
            context: Optional conversation context

        Returns:
            Generated text response

        Raises:
            httpx.HTTPError: If API call fails
        """
        # Build conversation history
        contents = []
        if context:
            contents.extend(context)

        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
            },
        }

        logger.info(f"Chat request with {len(prompt)} char prompt")

        # Use configured chat model if not specified
        if model is None:
            model = getattr(self.config, 'gemini_chat_model', 'gemini-2.0-flash')

        response = self.client.post(
            f"{self.base_url}/models/{model}:generateContent",
            headers=self.headers,
            content=orjson.dumps(payload),
        )
        response.raise_for_status()

        data = response.json()

        # Extract text from response
        try:
            candidates = data.get("candidates", [])
            if not candidates:
                return ""

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])

            text = " ".join(part.get("text", "") for part in parts)
            logger.info(f"Generated {len(text)} characters of text")
            return text.strip()

        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return ""

    def close(self):
        """Close the HTTP client."""
        self.client.close()

