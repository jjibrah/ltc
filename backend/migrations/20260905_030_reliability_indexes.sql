-- Supports due-newsletter polling/reconciliation and common list endpoints.
CREATE INDEX IF NOT EXISTS newsletters_scheduled_dispatch_idx
    ON public.newsletters (scheduled_at)
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS newsletters_created_at_idx
    ON public.newsletters (created_at DESC);

CREATE INDEX IF NOT EXISTS team_profiles_status_created_idx
    ON public.team_profiles (status, created_at DESC);

CREATE INDEX IF NOT EXISTS profile_submission_links_created_idx
    ON public.profile_submission_links (created_at DESC);
