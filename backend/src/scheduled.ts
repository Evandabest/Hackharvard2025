/**
 * Scheduled handler for unlocking stuck jobs
 * Run every 5-10 minutes via cron trigger
 */

import { Env } from './types.js';
import { nowSeconds } from './lib/jobs.js';

export async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const now = nowSeconds();

  try {
    // Unlock jobs with expired leases
    const result = await env.DB.prepare(
      `UPDATE jobs
       SET status = 'pending',
           visibility_deadline = NULL,
           updated_at = ?
       WHERE status = 'leased'
         AND visibility_deadline IS NOT NULL
         AND visibility_deadline < ?`
    )
      .bind(now, now)
      .run();

    const unlockedCount = result.meta.changes;

    if (unlockedCount > 0) {
      console.log(`Unlocked ${unlockedCount} expired job leases`);
    }
  } catch (error) {
    console.error('Failed to unlock expired jobs:', error);
  }
}

