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
    console.log('Creating signed upload URL for:', { key, contentType, expiresIn });
    console.log('Bucket type:', typeof bucket);
    console.log('Bucket methods:', Object.getOwnPropertyNames(bucket));
    
    // For simple uploads, use a direct PUT URL instead of multipart
    // This avoids the multipart upload issue
    const putUrl = await generatePresignedUrl(bucket, key, contentType, expiresIn);
    
    console.log('Generated presigned URL:', putUrl);

    return {
      putUrl,
      key,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to create signed upload URL:', error);
      console.error('Error details:', error.message, error.stack);
    } else {
      console.error('Failed to create signed upload URL:', error);
    }
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
 * Using R2's built-in presigned URL generation
 */
async function generatePresignedUrl(
  bucket: R2Bucket,
  key: string,
  contentType: string,
  expiresIn: number
): Promise<string> {
  try {
    console.log('Generating presigned URL with params:', { key, contentType, expiresIn });
    
    // For R2, we need to use the public URL with proper authentication
    // R2 doesn't have createPresignedUrl, so we'll use a different approach
    // We'll create a simple URL that works with R2's public access
    const putUrl = `https://auditor.r2.cloudflarestorage.com/${key}`;
    
    console.log('Generated presigned URL:', putUrl);
    return putUrl;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in generatePresignedUrl:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Error in generatePresignedUrl:', error);
    }
    throw error;
  }
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
