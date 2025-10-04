/**
 * Job queue utilities for D1-backed queue system
 */

/**
 * Get current Unix timestamp in seconds
 */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Calculate visibility deadline (lease expiration time)
 */
export function leaseNow(seconds: number): number {
  return nowSeconds() + seconds;
}

/**
 * Generate unique job ID
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Job status types
 */
export type JobStatus = 'pending' | 'leased' | 'done' | 'failed';

/**
 * Job record structure
 */
export interface Job {
  id: string;
  run_id: string;
  tenant_id: string;
  r2_key: string;
  status: JobStatus;
  attempts: number;
  visibility_deadline: number | null;
  created_at: number;
  updated_at: number;
}

