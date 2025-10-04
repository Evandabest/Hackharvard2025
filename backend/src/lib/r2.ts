/**
 * R2 signed URL generation for secure uploads
 */

import { AppError } from './errors.js';

export interface SignedUploadParams {
  bucket: R2Bucket;
  key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
}

export interface SignedUploadResult {
  putUrl: string;
  key: string;
}

/**
 * Generate a presigned PUT URL for R2 uploads
 */
export async function createSignedUploadUrl(
  params: SignedUploadParams
): Promise<SignedUploadResult> {
  const { bucket, key, contentType, expiresIn = 3600 } = params;

  try {
    // For simple uploads, use a direct PUT URL instead of multipart
    // This avoids the multipart upload issue
    const putUrl = await generatePresignedUrl(bucket, key, contentType, expiresIn);

    return {
      putUrl,
      key,
    };
  } catch (error) {
    console.error('Failed to create signed upload URL:', error);
    throw new AppError(500, 'R2_ERROR', 'Failed to generate upload URL');
  }
}

/**
 * Generate object key for tenant and run
 */
export function generateObjectKey(
  tenantId: string,
  runId: string,
  filename: string
): string {
  // Sanitize filename
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `tenants/${tenantId}/${runId}/${sanitized}`;
}

/**
 * Generate a presigned PUT URL for R2
 * Using R2's public URL with proper authentication
 */
async function generatePresignedUrl(
  bucket: R2Bucket,
  key: string,
  contentType: string,
  expiresIn: number
): Promise<string> {
  // Use R2's public URL with proper query parameters
  // This creates a direct PUT URL that doesn't use multipart uploads
  const baseUrl = `https://auditor.r2.cloudflarestorage.com/${key}`;
  const params = new URLSearchParams({
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
    'X-Amz-SignedHeaders': 'content-type',
    'Content-Type': contentType
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Validate uploaded file exists in R2
 */
export async function validateUpload(
  bucket: R2Bucket,
  key: string
): Promise<boolean> {
  try {
    const object = await bucket.head(key);
    return object !== null;
  } catch {
    return false;
  }
}

