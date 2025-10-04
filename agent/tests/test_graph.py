"""Tests for the audit pipeline graph."""

from unittest.mock import MagicMock, patch

import pytest

from src.config import Config
from src.graph import nodes
from src.state import RunState


@pytest.fixture
def mock_config():
    """Mock configuration for testing."""
    config = MagicMock(spec=Config)
    config.r2_bucket = "test-bucket"
    config.edge_base_url = "https://test.workers.dev"
    config.edge_api_token = "test-token"
    config.ai_gateway_url = "https://test-gateway"
    config.google_api_key = "test-key"
    return config


@pytest.fixture
def mock_r2_client():
    """Mock R2 client."""
    client = MagicMock()
    client.get_object.return_value = b"Mock PDF content"
    client.get_object_metadata.return_value = {"content_type": "application/pdf"}
    client.put_object.return_value = "reports/test/report.md"
    return client


@pytest.fixture
def mock_edge_client():
    """Mock Edge client."""
    client = MagicMock()
    client.emit_event.return_value = True
    client.vector_upsert.return_value = {"success": True}
    client.d1_query.return_value = {"success": True}
    client.update_run_status.return_value = True
    client.insert_finding.return_value = True
    return client


@pytest.fixture
def mock_gemini_client():
    """Mock Gemini client."""
    client = MagicMock()
    client.extract_text.return_value = (
        "Sample extracted text with transaction data. "
        "01/15/2024 Payment to Acme Corp $1000.00. "
        "01/16/2024 Payment to Beta Inc $2000.00."
    )
    client.embed_texts.return_value = [[0.1] * 768, [0.2] * 768]
    client.chat.return_value = "This is a test audit summary."
    return client


@pytest.fixture
def initial_state():
    """Initial run state for testing."""
    return RunState(
        run_id="test-run-123",
        tenant_id="tenant-test",
        r2_key="test/document.pdf",
    )


def test_ingest_node(initial_state, mock_r2_client, mock_edge_client):
    """Test the ingest node."""
    result = nodes.ingest(initial_state, mock_r2_client, mock_edge_client)

    assert result.mime_type == "application/pdf"
    assert "_file_bytes" in result.__dict__
    mock_r2_client.get_object.assert_called_once_with("test/document.pdf")
    mock_edge_client.emit_event.assert_called()


def test_extract_text_node(initial_state, mock_gemini_client, mock_edge_client):
    """Test the text extraction node."""
    # Set up state with file bytes
    initial_state.__dict__["_file_bytes"] = b"test pdf content"
    initial_state.mime_type = "application/pdf"

    result = nodes.extract_text_with_gemini(initial_state, mock_gemini_client, mock_edge_client)

    assert result.raw_text is not None
    assert len(result.raw_text) > 0
    mock_gemini_client.extract_text.assert_called_once()
    assert "_file_bytes" not in result.__dict__  # Should be cleaned up


def test_chunk_node(initial_state, mock_edge_client):
    """Test the chunking node."""
    initial_state.raw_text = "This is a test text. " * 100  # Create enough text for chunks

    result = nodes.chunk(initial_state, mock_edge_client)

    assert len(result.chunks) > 0
    assert all(isinstance(chunk, str) for chunk in result.chunks)
    mock_edge_client.emit_event.assert_called()


def test_embed_node(initial_state, mock_gemini_client, mock_edge_client):
    """Test the embedding node."""
    initial_state.chunks = ["chunk 1", "chunk 2"]

    result = nodes.embed(initial_state, mock_gemini_client, mock_edge_client)

    assert len(result.embeddings) == 2
    assert len(result.vector_ids) == 2
    assert all(vid.startswith("run:test-run-123:") for vid in result.vector_ids)
    mock_gemini_client.embed_texts.assert_called_once_with(["chunk 1", "chunk 2"])


def test_index_node(initial_state, mock_edge_client):
    """Test the indexing node."""
    initial_state.chunks = ["chunk 1", "chunk 2"]
    initial_state.embeddings = [[0.1] * 768, [0.2] * 768]
    initial_state.vector_ids = ["vec-1", "vec-2"]

    result = nodes.index(initial_state, mock_edge_client)

    assert result.error is None
    mock_edge_client.vector_upsert.assert_called_once()
    call_args = mock_edge_client.vector_upsert.call_args
    assert call_args[1]["ids"] == ["vec-1", "vec-2"]


def test_checks_node(initial_state, mock_edge_client):
    """Test the checks node."""
    initial_state.raw_text = (
        "01/15/2024 Payment $1000.00\n"
        "01/13/2024 Weekend payment $5000.00"  # Saturday
    )

    result = nodes.checks(initial_state, mock_edge_client)

    assert len(result.txns) > 0
    assert len(result.findings) > 0  # Should detect round numbers and weekend
    mock_edge_client.emit_event.assert_called()


def test_analyze_node(initial_state, mock_gemini_client, mock_edge_client):
    """Test the analysis node."""
    initial_state.findings = [
        {
            "code": "DUP_INVOICE",
            "severity": "medium",
            "title": "Duplicate",
            "detail": "Test finding",
        }
    ]
    initial_state.chunks = ["chunk 1"]
    initial_state.txns = []

    result = nodes.analyze(initial_state, mock_gemini_client, mock_edge_client)

    assert result.summary is not None
    assert len(result.summary) > 0
    mock_gemini_client.chat.assert_called_once()


def test_report_node(initial_state, mock_r2_client, mock_edge_client):
    """Test the report generation node."""
    initial_state.summary = "Test summary"
    initial_state.findings = []

    result = nodes.report(initial_state, mock_r2_client, mock_edge_client)

    assert result.report_r2_key is not None
    assert result.report_r2_key.startswith("reports/")
    mock_r2_client.put_object.assert_called_once()


def test_persist_node(initial_state, mock_edge_client):
    """Test the persist node."""
    initial_state.findings = [
        {
            "code": "TEST",
            "severity": "low",
            "title": "Test Finding",
            "detail": "Test detail",
        }
    ]
    initial_state.summary = "Test summary"
    initial_state.report_r2_key = "reports/test/report.md"

    result = nodes.persist(initial_state, mock_edge_client)

    assert result.error is None
    mock_edge_client.insert_finding.assert_called()
    mock_edge_client.update_run_status.assert_called_with("test-run-123", "done")


def test_error_handling(initial_state, mock_edge_client):
    """Test error handling in nodes."""
    # Force an error by not providing file bytes
    mock_r2_client = MagicMock()
    mock_r2_client.get_object.side_effect = Exception("R2 connection failed")

    result = nodes.ingest(initial_state, mock_r2_client, mock_edge_client)

    assert result.error is not None
    assert "failed" in result.error.lower()
    mock_edge_client.emit_event.assert_any_call(
        initial_state.run_id, "error", pytest.approx("Ingest failed", abs=20)
    )


@patch("src.graph.nodes.extract_transactions_from_text")
def test_transaction_extraction(mock_extract, initial_state, mock_edge_client):
    """Test transaction extraction from text."""
    from src.state import Txn

    mock_extract.return_value = [
        Txn(id="txn1", amount=100.00, date="2024-01-15", vendor="Test"),
    ]
    initial_state.raw_text = "Some text with transactions"

    result = nodes.checks(initial_state, mock_edge_client)

    assert len(result.txns) == 1
    mock_extract.assert_called_once()

