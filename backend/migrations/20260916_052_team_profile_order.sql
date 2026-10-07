-- Persist the order of team profiles for the public Team page.

ALTER TABLE public.team_profiles
    ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

WITH ordered_profiles AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) - 1 AS next_order
    FROM public.team_profiles
)
UPDATE public.team_profiles AS profile
SET display_order = ordered_profiles.next_order
FROM ordered_profiles
WHERE profile.id = ordered_profiles.id;

CREATE INDEX IF NOT EXISTS idx_team_profiles_public_order
    ON public.team_profiles (status, display_order ASC, created_at ASC);

NOTIFY pgrst, 'reload schema';
