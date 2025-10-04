-- Migration 002: Jobs table for D1-backed queue (replaces Cloudflare Queues)

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|leased|done|failed
  attempts INTEGER NOT NULL DEFAULT 0,
  visibility_deadline INTEGER,            -- unix seconds when lease expires
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_visibility ON jobs(visibility_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_run_id ON jobs(run_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);

