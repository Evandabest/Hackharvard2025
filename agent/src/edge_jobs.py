"""Edge job queue client for pulling and acknowledging jobs."""

import logging
from dataclasses import dataclass
from typing import Literal

import httpx
import orjson
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import Config

logger = logging.getLogger(__name__)


@dataclass
class Job:
    """Job from the edge queue."""

    id: str
    run_id: str
    tenant_id: str
    r2_key: str
    attempts: int = 0


class EdgeJobClient:
    """Client for edge worker job queue API."""

    def __init__(self, config: Config):
        self.config = config
        self.base_url = config.edge_base_url.rstrip("/")
        self.client = httpx.Client(timeout=30.0)
        self.headers = {
            "Authorization": f"Bearer {config.edge_api_token}",
            "Content-Type": "application/json",
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    def pull(self, max: int = 10, visibility_seconds: int = 60) -> list[Job]:
        """
        Pull jobs from the edge queue.

        Args:
            max: Maximum number of jobs to pull
            visibility_seconds: Lease duration in seconds

        Returns:
            List of Job objects
        """
        payload = {"max": max, "visibilitySeconds": visibility_seconds}

        logger.debug(f"Pulling up to {max} jobs from edge queue")

        response = self.client.post(
            f"{self.base_url}/jobs/pull",
            headers=self.headers,
            content=orjson.dumps(payload),
        )
        response.raise_for_status()

        data = response.json()
        jobs = []

        for job_data in data.get("jobs", []):
            try:
                job = Job(
                    id=job_data["id"],
                    run_id=job_data["runId"],
                    tenant_id=job_data["tenantId"],
                    r2_key=job_data["r2Key"],
                    attempts=job_data.get("attempts", 0),
                )
                jobs.append(job)
            except (KeyError, TypeError) as e:
                logger.error(f"Failed to parse job {job_data.get('id')}: {e}")
                continue

        logger.info(f"Pulled {len(jobs)} jobs from edge queue")
        return jobs

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=5),
    )
    def ack(self, ids: list[str], status: Literal["done", "failed"] = "done") -> None:
        """
        Acknowledge job completion or failure.

        Args:
            ids: List of job IDs to acknowledge
            status: 'done' for success, 'failed' for failure (requeue)

        Raises:
            httpx.HTTPError: If acknowledgment fails
        """
        if not ids:
            return

        payload = {"ids": ids, "status": status}

        logger.debug(f"Acknowledging {len(ids)} jobs as {status}")

        response = self.client.post(
            f"{self.base_url}/jobs/ack",
            headers=self.headers,
            content=orjson.dumps(payload),
        )
        response.raise_for_status()

        data = response.json()
        if not data.get("success"):
            logger.error(f"Failed to acknowledge jobs: {data}")
            raise Exception(f"Ack failed: {data}")

        logger.info(f"Acknowledged {len(ids)} jobs as {status}")

    def close(self):
        """Close the HTTP client."""
        self.client.close()

