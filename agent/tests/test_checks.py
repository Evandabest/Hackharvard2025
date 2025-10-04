"""Tests for deterministic audit checks."""

import pytest

from src.checks.deterministic import (
    check_duplicate_invoices,
    check_round_numbers,
    check_weekend_postings,
)
from src.state import RunState, Txn


def test_check_duplicate_invoices():
    """Test duplicate invoice detection."""
    state = RunState(
        run_id="test-1",
        tenant_id="tenant-1",
        r2_key="test.pdf",
        txns=[
            Txn(id="txn1", amount=100.00, date="2024-01-15", vendor="Acme Corp"),
            Txn(id="txn2", amount=100.00, date="2024-01-15", vendor="Acme Corp"),
            Txn(id="txn3", amount=200.00, date="2024-01-16", vendor="Beta Inc"),
        ],
    )

    findings = check_duplicate_invoices(state)

    assert len(findings) == 1
    assert findings[0]["code"] == "DUP_INVOICE"
    assert findings[0]["severity"] == "medium"
    assert len(findings[0]["transaction_ids"]) == 2


def test_check_duplicate_invoices_no_duplicates():
    """Test when there are no duplicates."""
    state = RunState(
        run_id="test-2",
        tenant_id="tenant-1",
        r2_key="test.pdf",
        txns=[
            Txn(id="txn1", amount=100.00, date="2024-01-15", vendor="Acme Corp"),
            Txn(id="txn2", amount=200.00, date="2024-01-16", vendor="Beta Inc"),
        ],
    )

    findings = check_duplicate_invoices(state)
    assert len(findings) == 0


def test_check_round_numbers():
    """Test round number detection."""
    state = RunState(
        run_id="test-3",
        tenant_id="tenant-1",
        r2_key="test.pdf",
        txns=[
            Txn(id="txn1", amount=1000.00, date="2024-01-15", vendor="Acme Corp"),
            Txn(id="txn2", amount=5000.00, date="2024-01-16", vendor="Beta Inc"),
            Txn(id="txn3", amount=1234.56, date="2024-01-17", vendor="Gamma LLC"),
        ],
    )

    findings = check_round_numbers(state, threshold=100.0, min_amount=1000.0)

    assert len(findings) == 2
    assert all(f["code"] == "ROUND_NUMBER" for f in findings)
    assert all(f["severity"] == "low" for f in findings)


def test_check_round_numbers_below_threshold():
    """Test round numbers below minimum amount are not flagged."""
    state = RunState(
        run_id="test-4",
        tenant_id="tenant-1",
        r2_key="test.pdf",
        txns=[
            Txn(id="txn1", amount=100.00, date="2024-01-15", vendor="Acme Corp"),
        ],
    )

    findings = check_round_numbers(state, threshold=100.0, min_amount=1000.0)
    assert len(findings) == 0


def test_check_weekend_postings():
    """Test weekend posting detection."""
    state = RunState(
        run_id="test-5",
        tenant_id="tenant-1",
        r2_key="test.pdf",
        txns=[
            Txn(id="txn1", amount=100.00, date="2024-01-13", vendor="Acme Corp"),  # Saturday
            Txn(id="txn2", amount=200.00, date="2024-01-14", vendor="Beta Inc"),  # Sunday
            Txn(id="txn3", amount=300.00, date="2024-01-15", vendor="Gamma LLC"),  # Monday
        ],
    )

    findings = check_weekend_postings(state)

    assert len(findings) == 2
    assert all(f["code"] == "WEEKEND_POST" for f in findings)
    assert all(f["severity"] == "low" for f in findings)


def test_check_weekend_postings_weekdays_only():
    """Test when all postings are on weekdays."""
    state = RunState(
        run_id="test-6",
        tenant_id="tenant-1",
        r2_key="test.pdf",
        txns=[
            Txn(id="txn1", amount=100.00, date="2024-01-15", vendor="Acme Corp"),  # Monday
            Txn(id="txn2", amount=200.00, date="2024-01-16", vendor="Beta Inc"),  # Tuesday
        ],
    )

    findings = check_weekend_postings(state)
    assert len(findings) == 0


def test_check_weekend_postings_invalid_date():
    """Test handling of invalid date formats."""
    state = RunState(
        run_id="test-7",
        tenant_id="tenant-1",
        r2_key="test.pdf",
        txns=[
            Txn(id="txn1", amount=100.00, date="invalid-date", vendor="Acme Corp"),
            Txn(id="txn2", amount=200.00, date="2024-01-13", vendor="Beta Inc"),  # Saturday
        ],
    )

    findings = check_weekend_postings(state)
    assert len(findings) == 1  # Only the valid weekend date

