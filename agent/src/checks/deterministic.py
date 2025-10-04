"""Deterministic audit checks for common patterns."""

import hashlib
import logging
from collections import defaultdict
from datetime import datetime
from typing import Any

from ..state import RunState, Txn

logger = logging.getLogger(__name__)


def check_duplicate_invoices(state: RunState) -> list[dict[str, Any]]:
    """
    Detect duplicate invoices based on vendor, date, and amount.

    Args:
        state: Current run state with transactions

    Returns:
        List of findings
    """
    findings = []
    seen: dict[str, list[Txn]] = defaultdict(list)

    # Group transactions by hash
    for txn in state.txns:
        if not txn.vendor or not txn.date or txn.amount == 0:
            continue

        # Create hash of vendor, date, amount
        key = hashlib.md5(
            f"{txn.vendor}|{txn.date}|{txn.amount}".encode()
        ).hexdigest()
        seen[key].append(txn)

    # Find duplicates
    for key, txns in seen.items():
        if len(txns) > 1:
            ids = [t.id for t in txns]
            findings.append(
                {
                    "code": "DUP_INVOICE",
                    "severity": "medium",
                    "title": f"Duplicate Invoice Detected",
                    "detail": (
                        f"Found {len(txns)} transactions with identical vendor, date, and amount. "
                        f"Vendor: {txns[0].vendor}, Date: {txns[0].date}, "
                        f"Amount: ${txns[0].amount:.2f}. "
                        f"Transaction IDs: {', '.join(ids)}"
                    ),
                    "transaction_ids": ids,
                }
            )

    logger.info(f"Found {len(findings)} duplicate invoice findings")
    return findings


def check_round_numbers(
    state: RunState, threshold: float = 100.0, min_amount: float = 1000.0
) -> list[dict[str, Any]]:
    """
    Detect suspiciously round-number transactions.

    Round amounts (e.g., exactly $1000, $5000) can indicate:
    - Manual adjustments
    - Estimates rather than actual amounts
    - Potential fraud (easier to remember/calculate)

    Args:
        state: Current run state with transactions
        threshold: Amount must be divisible by this value
        min_amount: Minimum amount to flag

    Returns:
        List of findings
    """
    findings = []

    for txn in state.txns:
        if abs(txn.amount) < min_amount:
            continue

        # Check if amount is a round number
        if abs(txn.amount) % threshold == 0:
            findings.append(
                {
                    "code": "ROUND_NUMBER",
                    "severity": "low",
                    "title": f"Suspiciously Round Amount",
                    "detail": (
                        f"Transaction {txn.id} has a round amount of ${txn.amount:.2f}. "
                        f"Date: {txn.date}, Vendor: {txn.vendor or 'Unknown'}, "
                        f"Memo: {txn.memo or 'N/A'}"
                    ),
                    "transaction_ids": [txn.id],
                }
            )

    logger.info(f"Found {len(findings)} round number findings")
    return findings


def check_weekend_postings(state: RunState) -> list[dict[str, Any]]:
    """
    Detect transactions posted on weekends.

    Weekend postings can be unusual for certain businesses and may indicate:
    - After-hours manual entries
    - Backdated transactions
    - Automated systems (which may need review)

    Args:
        state: Current run state with transactions

    Returns:
        List of findings
    """
    findings = []

    for txn in state.txns:
        if not txn.date:
            continue

        try:
            # Parse date (assumes YYYY-MM-DD or similar format)
            dt = datetime.fromisoformat(txn.date.split()[0])

            # Check if weekend (Saturday=5, Sunday=6)
            if dt.weekday() in (5, 6):
                day_name = "Saturday" if dt.weekday() == 5 else "Sunday"
                findings.append(
                    {
                        "code": "WEEKEND_POST",
                        "severity": "low",
                        "title": f"Weekend Posting Detected",
                        "detail": (
                            f"Transaction {txn.id} was posted on {day_name}, {txn.date}. "
                            f"Amount: ${txn.amount:.2f}, Vendor: {txn.vendor or 'Unknown'}, "
                            f"Memo: {txn.memo or 'N/A'}"
                        ),
                        "transaction_ids": [txn.id],
                    }
                )
        except (ValueError, IndexError) as e:
            logger.warning(f"Failed to parse date for transaction {txn.id}: {e}")
            continue

    logger.info(f"Found {len(findings)} weekend posting findings")
    return findings


def run_all_checks(state: RunState) -> list[dict[str, Any]]:
    """
    Run all deterministic checks on the state.

    Args:
        state: Current run state

    Returns:
        Combined list of all findings
    """
    findings = []

    # Run each check
    findings.extend(check_duplicate_invoices(state))
    findings.extend(check_round_numbers(state))
    findings.extend(check_weekend_postings(state))

    logger.info(f"Total findings from deterministic checks: {len(findings)}")
    return findings

