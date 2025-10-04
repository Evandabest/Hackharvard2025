"""R2 storage client using boto3 S3 API."""

import logging
from typing import BinaryIO

import boto3
from botocore.exceptions import ClientError

from .config import Config

logger = logging.getLogger(__name__)


class R2Client:
    """Client for Cloudflare R2 storage."""

    def __init__(self, config: Config):
        self.config = config
        self.bucket = config.r2_bucket

        # Initialize S3 client configured for R2
        self.s3 = boto3.client(
            "s3",
            endpoint_url=config.r2_endpoint,
            aws_access_key_id=config.r2_access_key_id,
            aws_secret_access_key=config.r2_secret_access_key,
            region_name="auto",  # R2 uses 'auto' region
        )

    def get_object(self, key: str) -> bytes:
        """
        Download an object from R2.

        Args:
            key: Object key (path) in the bucket

        Returns:
            Object contents as bytes

        Raises:
            ClientError: If download fails
        """
        try:
            logger.info(f"Downloading object: {key}")
            response = self.s3.get_object(Bucket=self.bucket, Key=key)
            data = response["Body"].read()
            logger.info(f"Downloaded {len(data)} bytes from {key}")
            return data
        except ClientError as e:
            logger.error(f"Failed to download {key}: {e}")
            raise

    def get_object_metadata(self, key: str) -> dict:
        """
        Get object metadata without downloading content.

        Args:
            key: Object key in the bucket

        Returns:
            Metadata dictionary
        """
        try:
            response = self.s3.head_object(Bucket=self.bucket, Key=key)
            return {
                "content_type": response.get("ContentType"),
                "content_length": response.get("ContentLength"),
                "last_modified": response.get("LastModified"),
                "metadata": response.get("Metadata", {}),
            }
        except ClientError as e:
            logger.error(f"Failed to get metadata for {key}: {e}")
            raise

    def put_object(
        self,
        key: str,
        data: bytes | str | BinaryIO,
        content_type: str | None = None,
        metadata: dict | None = None,
    ) -> str:
        """
        Upload an object to R2.

        Args:
            key: Object key (destination path)
            data: Data to upload
            content_type: MIME type
            metadata: Additional metadata

        Returns:
            Object key
        """
        try:
            logger.info(f"Uploading object: {key}")

            extra_args = {}
            if content_type:
                extra_args["ContentType"] = content_type
            if metadata:
                extra_args["Metadata"] = metadata

            if isinstance(data, str):
                data = data.encode("utf-8")

            self.s3.put_object(Bucket=self.bucket, Key=key, Body=data, **extra_args)

            logger.info(f"Uploaded object: {key}")
            return key
        except ClientError as e:
            logger.error(f"Failed to upload {key}: {e}")
            raise

    def delete_object(self, key: str) -> bool:
        """
        Delete an object from R2.

        Args:
            key: Object key to delete

        Returns:
            True if successful
        """
        try:
            logger.info(f"Deleting object: {key}")
            self.s3.delete_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError as e:
            logger.error(f"Failed to delete {key}: {e}")
            return False

    def object_exists(self, key: str) -> bool:
        """
        Check if an object exists in R2.

        Args:
            key: Object key to check

        Returns:
            True if exists, False otherwise
        """
        try:
            self.s3.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

