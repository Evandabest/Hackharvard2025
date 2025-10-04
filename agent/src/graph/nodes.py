"""LangGraph node implementations for the audit pipeline."""

import logging
import random
import re
import time
from typing import Any

import orjson

from ..checks.deterministic import run_all_checks
from ..config import Config
from ..edge_client import EdgeClient
from ..gemini import GeminiClient
from ..r2 import R2Client
from ..state import RunState, Txn

logger = logging.getLogger(__name__)


def ingest(state: RunState, r2_client: R2Client, edge_client: EdgeClient) -> RunState:
    """
    Download file from R2 and detect MIME type.

    Args:
        state: Current run state
        r2_client: R2 client instance
        edge_client: Edge client for event emission

    Returns:
        Updated state with file data
    """
    logger.info(f"[{state.run_id}] Starting ingest phase")
    edge_client.emit_event(state.run_id, "info", "Downloading file from R2")

    try:
        # Download file
        file_bytes = r2_client.get_object(state.r2_key)

        # Get metadata to detect MIME type
        metadata = r2_client.get_object_metadata(state.r2_key)
        mime_type = metadata.get("content_type")

        # Fallback: detect from filename extension
        if not mime_type:
            if state.r2_key.lower().endswith(".pdf"):
                mime_type = "application/pdf"
            elif state.r2_key.lower().endswith((".doc", ".docx")):
                mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif state.r2_key.lower().endswith(".csv"):
                mime_type = "text/csv"
            else:
                mime_type = "application/octet-stream"

        state.mime_type = mime_type
        state.file_bytes = file_bytes
        logger.info(f"[{state.run_id}] Downloaded {len(file_bytes)} bytes ({mime_type})")

        edge_client.emit_event(
            state.run_id,
            "info",
            f"File downloaded: {len(file_bytes)} bytes",
            {"mime_type": mime_type},
        )

    except Exception as e:
        logger.error(f"[{state.run_id}] Ingest failed: {e}")
        state.error = f"Ingest failed: {str(e)}"
        edge_client.emit_event(state.run_id, "error", f"Ingest failed: {e}")

    return state


def extract_text_with_gemini(
    state: RunState, gemini_client: GeminiClient, edge_client: EdgeClient
) -> RunState:
    """
    Extract text from document using Gemini's multimodal capabilities.

    Args:
        state: Current run state
        gemini_client: Gemini client instance
        edge_client: Edge client for event emission

    Returns:
        Updated state with extracted text
    """
    logger.info(f"[{state.run_id}] Starting text extraction with Gemini")
    edge_client.emit_event(state.run_id, "info", "Extracting text with Gemini AI")

    if state.error:
        return state

    try:
        if not state.file_bytes:
            raise ValueError("No file bytes available")

        # Extract text using Gemini
        raw_text = gemini_client.extract_text(state.file_bytes, state.mime_type or "application/pdf")
        state.raw_text = raw_text

        logger.info(f"[{state.run_id}] Extracted {len(raw_text)} characters")
        edge_client.emit_event(
            state.run_id,
            "info",
            f"Text extracted: {len(raw_text)} characters",
        )

        # Clean up file bytes to save memory
        state.file_bytes = None

    except Exception as e:
        logger.error(f"[{state.run_id}] Text extraction failed: {e}")
        state.error = f"Text extraction failed: {str(e)}"
        edge_client.emit_event(state.run_id, "error", f"Text extraction failed: {e}")

    return state


def chunk(state: RunState, edge_client: EdgeClient) -> RunState:
    """
    Split text into chunks for embedding.

    Args:
        state: Current run state
        edge_client: Edge client for event emission

    Returns:
        Updated state with chunks
    """
    logger.info(f"[{state.run_id}] Starting chunking")
    edge_client.emit_event(state.run_id, "info", "Chunking text")

    if state.error or not state.raw_text:
        return state

    try:
        # Simple chunking by length (roughly 1000-2000 chars per chunk)
        text = state.raw_text
        chunk_size = 1500
        overlap = 200

        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]

            # Try to break at sentence boundary
            if end < len(text):
                last_period = chunk_text.rfind(".")
                last_newline = chunk_text.rfind("\n")
                break_point = max(last_period, last_newline)

                if break_point > chunk_size * 0.7:  # At least 70% of chunk
                    chunk_text = text[start : start + break_point + 1]
                    end = start + break_point + 1

            chunks.append(chunk_text.strip())
            start = end - overlap if end < len(text) else end

        state.chunks = chunks
        logger.info(f"[{state.run_id}] Created {len(chunks)} chunks")
        edge_client.emit_event(state.run_id, "info", f"Created {len(chunks)} text chunks")

    except Exception as e:
        logger.error(f"[{state.run_id}] Chunking failed: {e}")
        state.error = f"Chunking failed: {str(e)}"
        edge_client.emit_event(state.run_id, "error", f"Chunking failed: {e}")

    return state


def embed(state: RunState, gemini_client: GeminiClient, edge_client: EdgeClient) -> RunState:
    """
    Generate embeddings for chunks using Gemini.

    Args:
        state: Current run state
        gemini_client: Gemini client instance
        edge_client: Edge client for event emission

    Returns:
        Updated state with embeddings
    """
    logger.info(f"[{state.run_id}] Starting embedding")
    edge_client.emit_event(state.run_id, "info", "Generating embeddings")

    if state.error or not state.chunks:
        return state

    try:
        # Generate embeddings
        embeddings = gemini_client.embed_texts(state.chunks)
        state.embeddings = embeddings

        # Generate vector IDs
        state.vector_ids = [f"run:{state.run_id}:ch:{i}" for i in range(len(state.chunks))]

        logger.info(f"[{state.run_id}] Generated {len(embeddings)} embeddings")
        edge_client.emit_event(
            state.run_id,
            "info",
            f"Generated {len(embeddings)} embeddings",
        )

    except Exception as e:
        logger.error(f"[{state.run_id}] Embedding failed: {e}")
        state.error = f"Embedding failed: {str(e)}"
        edge_client.emit_event(state.run_id, "error", f"Embedding failed: {e}")

    return state


def index(state: RunState, edge_client: EdgeClient) -> RunState:
    """
    Index embeddings in Vectorize via edge proxy.

    Args:
        state: Current run state
        edge_client: Edge client instance

    Returns:
        Updated state
    """
    logger.info(f"[{state.run_id}] Starting indexing")
    edge_client.emit_event(state.run_id, "info", "Indexing vectors")

    if state.error or not state.embeddings:
        return state

    try:
        # Prepare metadata
        metadatas = [
            {
                "run_id": state.run_id,
                "tenant_id": state.tenant_id,
                "chunk_index": i,
                "text_preview": chunk[:100],
            }
            for i, chunk in enumerate(state.chunks)
        ]

        # Upsert to Vectorize
        edge_client.vector_upsert(
            ids=state.vector_ids,
            vectors=state.embeddings,
            metadatas=metadatas,
        )

        logger.info(f"[{state.run_id}] Indexed {len(state.vector_ids)} vectors")
        edge_client.emit_event(
            state.run_id,
            "info",
            f"Indexed {len(state.vector_ids)} vectors",
        )

    except Exception as e:
        logger.error(f"[{state.run_id}] Indexing failed: {e}")
        state.error = f"Indexing failed: {str(e)}"
        edge_client.emit_event(state.run_id, "error", f"Indexing failed: {e}")

    return state


def checks(state: RunState, edge_client: EdgeClient) -> RunState:
    """
    Run deterministic audit checks.

    Args:
        state: Current run state
        edge_client: Edge client for event emission

    Returns:
        Updated state with findings
    """
    logger.info(f"[{state.run_id}] Running deterministic checks")
    edge_client.emit_event(state.run_id, "info", "Running audit checks")

    if state.error:
        return state

    try:
        # Extract transactions from text (simple regex-based extraction)
        # In production, this would be more sophisticated
        transactions = extract_transactions_from_text(state.raw_text or "")
        state.txns = transactions

        # Run all checks
        findings = run_all_checks(state)
        state.findings = findings

        logger.info(f"[{state.run_id}] Found {len(findings)} issues")
        edge_client.emit_event(
            state.run_id,
            "info",
            f"Audit checks complete: {len(findings)} findings",
        )

    except Exception as e:
        logger.error(f"[{state.run_id}] Checks failed: {e}")
        state.error = f"Checks failed: {str(e)}"
        edge_client.emit_event(state.run_id, "error", f"Checks failed: {e}")

    return state


def analyze(
    state: RunState, gemini_client: GeminiClient, edge_client: EdgeClient
) -> RunState:
    """
    Use Gemini to analyze findings and generate summary.

    Args:
        state: Current run state
        gemini_client: Gemini client instance
        edge_client: Edge client for event emission

    Returns:
        Updated state with summary
    """
    logger.info(f"[{state.run_id}] Starting AI analysis")
    edge_client.emit_event(state.run_id, "info", "Analyzing with Gemini AI")

    if state.error:
        return state

    try:
        # Build prompt with findings
        findings_text = "\n".join(
            [
                f"- {f['severity'].upper()}: {f['title']} - {f['detail']}"
                for f in state.findings
            ]
        )

        prompt = f"""You are an audit AI assistant. Review the following audit findings and provide:
1. A brief executive summary
2. Key risk areas identified
3. Recommended next steps

Findings:
{findings_text if findings_text else "No significant findings detected."}

Document analyzed: {len(state.chunks)} sections, {len(state.txns)} transactions reviewed.

Provide a professional, concise analysis."""

        # Call Gemini for analysis (uses configured model)
        summary = gemini_client.chat(prompt)
        state.summary = summary

        logger.info(f"[{state.run_id}] Generated analysis summary")
        edge_client.emit_event(state.run_id, "info", "AI analysis complete")

    except Exception as e:
        logger.error(f"[{state.run_id}] Analysis failed: {e}")
        state.error = f"Analysis failed: {str(e)}"
        edge_client.emit_event(state.run_id, "error", f"Analysis failed: {e}")

    return state


def report(state: RunState, r2_client: R2Client, edge_client: EdgeClient) -> RunState:
    """
    Generate and upload report to R2.

    Args:
        state: Current run state
        r2_client: R2 client instance
        edge_client: Edge client for event emission

    Returns:
        Updated state with report key
    """
    logger.info(f"[{state.run_id}] Generating report")
    edge_client.emit_event(state.run_id, "info", "Generating report")

    if state.error:
        return state

    try:
        # Generate Markdown report
        report_md = generate_markdown_report(state)

        # Upload to R2
        report_key = f"reports/{state.tenant_id}/{state.run_id}/report.md"
        r2_client.put_object(report_key, report_md, content_type="text/markdown")

        state.report_r2_key = report_key
        logger.info(f"[{state.run_id}] Report uploaded to {report_key}")
        edge_client.emit_event(state.run_id, "info", f"Report uploaded: {report_key}")

    except Exception as e:
        logger.error(f"[{state.run_id}] Report generation failed: {e}")
        state.error = f"Report generation failed: {str(e)}"
        edge_client.emit_event(state.run_id, "error", f"Report generation failed: {e}")

    return state


def persist(state: RunState, edge_client: EdgeClient) -> RunState:
    """
    Persist findings to D1 and update run status.

    Args:
        state: Current run state
        edge_client: Edge client instance

    Returns:
        Final state
    """
    logger.info(f"[{state.run_id}] Persisting results")
    edge_client.emit_event(state.run_id, "info", "Saving results to database")

    try:
        # Insert each finding
        for i, finding in enumerate(state.findings):
            finding_id = f"finding_{state.run_id}_{i}_{int(time.time())}"
            edge_client.insert_finding(
                finding_id=finding_id,
                run_id=state.run_id,
                code=finding["code"],
                severity=finding["severity"],
                title=finding["title"],
                detail=finding["detail"],
                evidence_r2_key=None,
            )

        # Update run status
        final_status = "done" if not state.error else "error"
        edge_client.update_run_status(state.run_id, final_status)

        # Emit final event with summary
        edge_client.emit_event(
            state.run_id,
            "info",
            "Audit complete",
            {
                "summary": state.summary,
                "report_key": state.report_r2_key,
                "findings_count": len(state.findings),
            },
        )

        logger.info(f"[{state.run_id}] Results persisted successfully")

    except Exception as e:
        logger.error(f"[{state.run_id}] Persist failed: {e}")
        state.error = f"Persist failed: {str(e)}"
        edge_client.emit_event(state.run_id, "error", f"Persist failed: {e}")

    return state


# Helper functions


def extract_transactions_from_text(text: str) -> list[Txn]:
    """
    Simple transaction extraction from text using regex patterns.
    In production, this would use more sophisticated parsing.
    """
    transactions = []

    # Look for dollar amounts with dates
    # Pattern: date (various formats) ... amount
    pattern = r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}).*?\$?([\d,]+\.\d{2})"

    matches = re.findall(pattern, text)

    for i, (date, amount) in enumerate(matches[:100]):  # Limit to 100
        try:
            clean_amount = float(amount.replace(",", ""))
            txn = Txn(
                id=f"txn_{i}",
                amount=clean_amount,
                date=date,
                memo=None,
                vendor=None,
            )
            transactions.append(txn)
        except ValueError:
            continue

    logger.info(f"Extracted {len(transactions)} transactions from text")
    return transactions


def generate_markdown_report(state: RunState) -> str:
    """Generate a Markdown audit report."""
    report = f"""# Audit Report

**Run ID:** {state.run_id}  
**Tenant ID:** {state.tenant_id}  
**Source:** {state.r2_key}  
**Generated:** {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}

---

## Executive Summary

{state.summary or "No summary available."}

---

## Findings ({len(state.findings)})

"""

    if state.findings:
        for i, finding in enumerate(state.findings, 1):
            severity = finding["severity"].upper()
            report += f"""
### {i}. {finding['title']} [{severity}]

**Code:** {finding['code']}  
**Details:** {finding['detail']}

"""
    else:
        report += "\n_No significant findings detected._\n"

    report += f"""
---

## Analysis Metadata

- **Text Chunks:** {len(state.chunks)}
- **Vectors Indexed:** {len(state.vector_ids)}
- **Transactions Reviewed:** {len(state.txns)}
- **MIME Type:** {state.mime_type}

---

_Generated by Auditor Agent_
"""

    return report

