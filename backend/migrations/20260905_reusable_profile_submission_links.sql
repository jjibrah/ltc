-- Align existing databases with the API contract: one submission link may
-- create up to 100 team profiles.
ALTER TABLE public.team_profiles
DROP CONSTRAINT IF EXISTS team_profiles_submission_link_id_key;

CREATE INDEX IF NOT EXISTS team_profiles_submission_link_id_idx
ON public.team_profiles(submission_link_id);

CREATE OR REPLACE FUNCTION public.enforce_profile_submission_link_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.submission_link_id IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM 1
    FROM public.profile_submission_links
    WHERE id = NEW.submission_link_id
    FOR UPDATE;

    IF (
        SELECT COUNT(*)
        FROM public.team_profiles
        WHERE submission_link_id = NEW.submission_link_id
          AND id IS DISTINCT FROM NEW.id
    ) >= 100 THEN
        RAISE EXCEPTION 'profile submission link has reached its 100-profile limit'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_profile_submission_link_limit ON public.team_profiles;
CREATE TRIGGER enforce_profile_submission_link_limit
BEFORE INSERT OR UPDATE OF submission_link_id ON public.team_profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_submission_link_limit();
