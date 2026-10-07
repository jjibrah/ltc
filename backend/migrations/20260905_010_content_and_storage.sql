-- Stories, mentor applications, storage buckets, and backend-only permissions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 255),
    excerpt TEXT CHECK (excerpt IS NULL OR char_length(excerpt) <= 500),
    content TEXT NOT NULL CHECK (char_length(content) <= 20000),
    photo_path TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_date TIMESTAMPTZ,
    created_by UUID REFERENCES public.application_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (NOT is_published OR published_date IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS stories_public_order_idx
    ON public.stories ("order", created_at DESC)
    WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS stories_created_by_idx
    ON public.stories (created_by)
    WHERE created_by IS NOT NULL;

DROP TRIGGER IF EXISTS update_stories_updated_at ON public.stories;
CREATE TRIGGER update_stories_updated_at
BEFORE UPDATE ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.mentor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 150),
    email TEXT NOT NULL CHECK (
        char_length(email) <= 320
        AND email = lower(btrim(email))
        AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
    professional_background TEXT NOT NULL
        CHECK (char_length(btrim(professional_background)) BETWEEN 2 AND 500),
    help_options TEXT[] NOT NULL CHECK (
        cardinality(help_options) BETWEEN 1 AND 6
        AND help_options <@ ARRAY[
            'Career Guidance', 'Job Shadowing', 'Skills Workshop',
            'Networking / Introductions', 'University Guidance', 'Other'
        ]::TEXT[]
    ),
    preferred_contact_method TEXT NOT NULL DEFAULT 'Email'
        CHECK (preferred_contact_method IN ('Email', 'WhatsApp', 'Either')),
    message TEXT CHECK (message IS NULL OR char_length(message) <= 2000),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'under_review', 'approved', 'declined')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mentor_applications_status_submitted_idx
    ON public.mentor_applications (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS mentor_applications_email_idx
    ON public.mentor_applications (email);

DROP TRIGGER IF EXISTS update_mentor_applications_updated_at ON public.mentor_applications;
CREATE TRIGGER update_mentor_applications_updated_at
BEFORE UPDATE ON public.mentor_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- All table access is mediated by FastAPI's service-role client.
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_applications FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stories FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mentor_applications FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.stories TO service_role;
GRANT ALL ON TABLE public.mentor_applications TO service_role;

-- Public buckets expose only media reads. Writes and deletes use service_role,
-- which bypasses storage.objects RLS. MIME and size limits are defense in depth.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('team-profile-images', 'team-profile-images', TRUE, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('story-images', 'story-images', TRUE, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('newsletter-assets', 'newsletter-assets', TRUE, 20971520,
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove legacy LTC-bucket policies regardless of their old names. This closes
-- accidental browser write access left by dashboard-created policies.
DO $$
DECLARE
    policy_row RECORD;
BEGIN
    FOR policy_row IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND (
              COALESCE(qual, '') LIKE '%team-profile-images%'
              OR COALESCE(qual, '') LIKE '%story-images%'
              OR COALESCE(qual, '') LIKE '%newsletter-assets%'
              OR COALESCE(with_check, '') LIKE '%team-profile-images%'
              OR COALESCE(with_check, '') LIKE '%story-images%'
              OR COALESCE(with_check, '') LIKE '%newsletter-assets%'
          )
    LOOP
        EXECUTE format('DROP POLICY %I ON storage.objects', policy_row.policyname);
    END LOOP;
END $$;

CREATE POLICY "Public read LTC media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('team-profile-images', 'story-images', 'newsletter-assets'));
