"""State model for the audit pipeline."""

from typing import Any

from pydantic import BaseModel, Field


class Txn(BaseModel):
    """Transaction model."""

    id: str
    amount: float
    date: str
    memo: str | None = None
    vendor: str | None = None
    account: str | None = None


class RunState(BaseModel):
    """State for a single audit run."""

    run_id: str
    tenant_id: str
    r2_key: str
    mime_type: str | None = None
    file_bytes: bytes | None = None
    raw_text: str | None = None
    chunks: list[str] = Field(default_factory=list)
    embeddings: list[list[float]] = Field(default_factory=list)
    vector_ids: list[str] = Field(default_factory=list)
    txns: list[Txn] = Field(default_factory=list)
    findings: list[dict[str, Any]] = Field(default_factory=list)
    summary: str | None = None
    report_r2_key: str | None = None
    error: str | None = None

