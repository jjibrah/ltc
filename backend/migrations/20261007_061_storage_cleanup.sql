-- Additive durable media-cleanup intents. Manual execution only after exact approval.
BEGIN;
CREATE TABLE public.storage_cleanup_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 bucket text NOT NULL,
 object_path text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','referenced','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
 next_attempt_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
 lease_token uuid,
 lease_until timestamptz,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 UNIQUE(bucket, object_path)
);
CREATE INDEX storage_cleanup_jobs_pending ON public.storage_cleanup_jobs(next_attempt_at)
 WHERE status IN ('pending','processing');
ALTER TABLE public.storage_cleanup_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_cleanup_jobs FROM anon, authenticated;
GRANT ALL ON public.storage_cleanup_jobs TO service_role;
COMMIT;
