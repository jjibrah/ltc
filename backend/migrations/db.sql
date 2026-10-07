-- ============================================================================
-- Living The Charge (LTC) - complete Supabase bootstrap schema
-- ============================================================================
-- Purpose:
--   Run this file once in the SQL Editor of a NEW Supabase project.
--   It creates every database object used by the LTC backend: tables,
--   constraints, indexes, triggers, RPCs, RLS hardening, and storage buckets.
--
-- Assumptions:
--   * This runs on Supabase, where auth.users, storage.buckets, storage.objects,
--     and the anon/authenticated/service_role roles already exist.
--   * FastAPI is the only data API. Browser roles receive no direct access to
--     public tables. The backend uses SUPABASE_SERVICE_ROLE_KEY.
--   * Bucket names must match PROFILE_IMAGE_BUCKET, STORY_IMAGE_BUCKET, and
--     NEWSLETTER_ASSETS_BUCKET in the backend environment.
--
-- Safe reruns:
--   Object creation is idempotent where practical. This is a bootstrap file,
--   not a destructive reset: it never drops tables or user data.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- --------------------------------------------------------------------------
-- Shared trigger function
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- Administrative users (authentication records live in auth.users)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.application_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL
        CHECK (char_length(btrim(name)) BETWEEN 1 AND 255),
    email TEXT NOT NULL UNIQUE
        CHECK (
            char_length(email) <= 320
            AND email = lower(btrim(email))
            AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
        ),
    role TEXT NOT NULL DEFAULT 'admin'
        CHECK (role IN ('super_admin', 'admin')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS application_users_status_created_idx
    ON public.application_users (status, created_at DESC);

-- --------------------------------------------------------------------------
-- Reusable profile submission links and public team profiles
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_submission_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) >= 32),
    created_by UUID NOT NULL
        REFERENCES public.application_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS profile_submission_links_created_idx
    ON public.profile_submission_links (created_at DESC);
CREATE INDEX IF NOT EXISTS profile_submission_links_created_by_idx
    ON public.profile_submission_links (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS profile_submission_links_active_idx
    ON public.profile_submission_links (expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.team_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_link_id UUID
        REFERENCES public.profile_submission_links(id) ON DELETE SET NULL,
    name TEXT NOT NULL
        CHECK (char_length(btrim(name)) BETWEEN 1 AND 255),
    email TEXT
        CHECK (
            email IS NULL OR (
                char_length(email) <= 320
                AND email = lower(btrim(email))
                AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
            )
        ),
    role TEXT NOT NULL
        CHECK (char_length(btrim(role)) BETWEEN 1 AND 255),
    department TEXT CHECK (department IS NULL OR char_length(department) <= 255),
    quote TEXT CHECK (quote IS NULL OR char_length(quote) <= 500),
    bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 5000),
    image_path TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'published', 'rejected', 'changes_requested')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A link intentionally supports up to 100 profiles. It is not unique here.
ALTER TABLE public.team_profiles
    DROP CONSTRAINT IF EXISTS team_profiles_submission_link_id_key;

CREATE INDEX IF NOT EXISTS team_profiles_submission_link_id_idx
    ON public.team_profiles (submission_link_id);
CREATE INDEX IF NOT EXISTS team_profiles_status_created_idx
    ON public.team_profiles (status, created_at DESC);
CREATE INDEX IF NOT EXISTS team_profiles_public_order_idx
    ON public.team_profiles (status, display_order ASC, created_at ASC);

-- Lock the parent link so concurrent submissions cannot exceed the limit.
CREATE OR REPLACE FUNCTION public.enforce_profile_submission_link_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
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
$$;

-- --------------------------------------------------------------------------
-- Newsletters and subscribers
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.newsletters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
    preview_text TEXT CHECK (preview_text IS NULL OR char_length(preview_text) <= 255),
    body_html TEXT NOT NULL DEFAULT '',
    banner_path TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
    sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
    failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
    send_error TEXT,
    created_by UUID REFERENCES public.application_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (status <> 'scheduled' OR scheduled_at IS NOT NULL),
    CHECK (status <> 'sent' OR sent_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS newsletters_scheduled_dispatch_idx
    ON public.newsletters (scheduled_at)
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS newsletters_created_at_idx
    ON public.newsletters (created_at DESC);
CREATE INDEX IF NOT EXISTS newsletters_created_by_idx
    ON public.newsletters (created_by)
    WHERE created_by IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.newsletter_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    newsletter_id UUID NOT NULL
        REFERENCES public.newsletters(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL
        CHECK (char_length(btrim(original_filename)) BETWEEN 1 AND 255),
    storage_path TEXT NOT NULL UNIQUE CHECK (char_length(btrim(storage_path)) > 0),
    mime_type TEXT,
    size_bytes INTEGER NOT NULL DEFAULT 0
        CHECK (size_bytes BETWEEN 0 AND 20971520),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS newsletter_attachments_newsletter_id_idx
    ON public.newsletter_attachments (newsletter_id);

CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE
        CHECK (
            char_length(email) <= 320
            AND email = lower(btrim(email))
            AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
        ),
    status TEXT NOT NULL DEFAULT 'subscribed'
        CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
    unsubscribe_token TEXT NOT NULL UNIQUE
        CHECK (char_length(unsubscribe_token) >= 32),
    source TEXT CHECK (source IS NULL OR char_length(source) <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    CHECK (status <> 'unsubscribed' OR unsubscribed_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS subscribers_status_created_idx
    ON public.subscribers (status, created_at DESC);

-- --------------------------------------------------------------------------
-- Stories and mentor applications
-- --------------------------------------------------------------------------

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

-- --------------------------------------------------------------------------
-- Stripe donation ledger and webhook idempotency
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.donation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_idempotency_key TEXT UNIQUE,
    stripe_checkout_session_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    donor_name TEXT NOT NULL
        CHECK (char_length(btrim(donor_name)) BETWEEN 1 AND 150),
    donor_email TEXT NOT NULL CHECK (
        char_length(donor_email) <= 320
        AND donor_email = lower(btrim(donor_email))
        AND donor_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
    requested_amount NUMERIC(14, 2) NOT NULL
        CHECK (requested_amount >= 1),
    currency TEXT NOT NULL CHECK (currency = 'usd'),
    frequency TEXT NOT NULL CHECK (frequency IN ('one_time', 'monthly')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'expired', 'failed', 'cancelled')),
    anonymous BOOLEAN NOT NULL DEFAULT TRUE,
    message TEXT CHECK (message IS NULL OR char_length(message) <= 2000),
    supporter_publication_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (supporter_publication_status IN ('pending', 'approved', 'rejected')),
    supporter_reviewed_at TIMESTAMPTZ,
    supporter_reviewed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS donation_sessions_status_created_idx
    ON public.donation_sessions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS donation_sessions_customer_idx
    ON public.donation_sessions (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS donation_sessions_checkout_idempotency_idx
    ON public.donation_sessions (checkout_idempotency_key)
    WHERE checkout_idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pledges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 150),
    organization TEXT CHECK (organization IS NULL OR char_length(btrim(organization)) <= 200),
    pledge_type TEXT NOT NULL DEFAULT 'individual' CHECK (pledge_type IN ('individual', 'organization')),
    email TEXT NOT NULL CHECK (email = lower(btrim(email)) AND char_length(email) <= 320),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
    frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time', 'monthly')),
    message TEXT CHECK (message IS NULL OR char_length(message) <= 1000),
    consent_to_publish BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'withdrawn')),
    admin_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.application_users(id) ON DELETE SET NULL,
    fulfilled_at TIMESTAMPTZ,
    linked_donation_session_id UUID REFERENCES public.donation_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pledges_status_created_at_idx ON public.pledges (status, created_at DESC);
CREATE INDEX IF NOT EXISTS pledges_email_idx ON public.pledges (email);

CREATE TABLE IF NOT EXISTS public.donation_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_session_id UUID NOT NULL
        REFERENCES public.donation_sessions(id) ON DELETE RESTRICT,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT UNIQUE,
    stripe_invoice_id TEXT UNIQUE,
    gross_amount NUMERIC(14, 2) NOT NULL CHECK (gross_amount >= 0),
    refunded_amount NUMERIC(14, 2) NOT NULL DEFAULT 0
        CHECK (refunded_amount >= 0 AND refunded_amount <= gross_amount),
    currency TEXT NOT NULL CHECK (currency = 'usd'),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'succeeded', 'failed', 'partially_refunded', 'refunded')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        stripe_payment_intent_id IS NOT NULL
        OR stripe_charge_id IS NOT NULL
        OR stripe_invoice_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS donation_payments_session_idx
    ON public.donation_payments (donation_session_id);
CREATE INDEX IF NOT EXISTS donation_payments_status_currency_idx
    ON public.donation_payments (status, currency);
CREATE INDEX IF NOT EXISTS donation_payments_paid_at_idx
    ON public.donation_payments (paid_at DESC)
    WHERE paid_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    stripe_event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'processing'
        CHECK (processing_status IN ('processing', 'processed', 'failed')),
    processing_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_information TEXT
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_started_idx
    ON public.stripe_webhook_events (processing_status, processing_started_at);
CREATE INDEX IF NOT EXISTS stripe_webhook_events_created_at_idx
    ON public.stripe_webhook_events (created_at DESC);

-- Fixed-precision, database-side donation aggregate. Backend/service-role only.
CREATE OR REPLACE FUNCTION public.get_donation_progress(
    requested_currency TEXT DEFAULT 'usd'
)
RETURNS TABLE (
    total_collected NUMERIC,
    successful_payment_count BIGINT,
    currency TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        GREATEST(COALESCE(SUM(gross_amount - refunded_amount), 0), 0)::NUMERIC,
        COUNT(*)::BIGINT,
        requested_currency
    FROM public.donation_payments
    WHERE donation_payments.currency = requested_currency
      AND donation_payments.status IN ('succeeded', 'partially_refunded', 'refunded');
$$;

-- --------------------------------------------------------------------------
-- Triggers (drop first so rerunning never duplicates them)
-- --------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_application_users_updated_at ON public.application_users;
CREATE TRIGGER update_application_users_updated_at
BEFORE UPDATE ON public.application_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS enforce_profile_submission_link_limit ON public.team_profiles;
CREATE TRIGGER enforce_profile_submission_link_limit
BEFORE INSERT OR UPDATE OF submission_link_id ON public.team_profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_submission_link_limit();

DROP TRIGGER IF EXISTS update_team_profiles_updated_at ON public.team_profiles;
CREATE TRIGGER update_team_profiles_updated_at
BEFORE UPDATE ON public.team_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_newsletters_updated_at ON public.newsletters;
CREATE TRIGGER update_newsletters_updated_at
BEFORE UPDATE ON public.newsletters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscribers_updated_at ON public.subscribers;
CREATE TRIGGER update_subscribers_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_stories_updated_at ON public.stories;
CREATE TRIGGER update_stories_updated_at
BEFORE UPDATE ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mentor_applications_updated_at ON public.mentor_applications;
CREATE TRIGGER update_mentor_applications_updated_at
BEFORE UPDATE ON public.mentor_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pledges_updated_at ON public.pledges;
CREATE TRIGGER update_pledges_updated_at
BEFORE UPDATE ON public.pledges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_donation_sessions_updated_at ON public.donation_sessions;
CREATE TRIGGER update_donation_sessions_updated_at
BEFORE UPDATE ON public.donation_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_donation_payments_updated_at ON public.donation_payments;
CREATE TRIGGER update_donation_payments_updated_at
BEFORE UPDATE ON public.donation_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- RLS and grants: deny browser/PostgREST access; allow backend service role
-- --------------------------------------------------------------------------

DO $$
DECLARE
    table_name TEXT;
    policy_row RECORD;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'application_users',
        'profile_submission_links',
        'team_profiles',
        'newsletters',
        'newsletter_attachments',
        'subscribers',
        'stories',
        'mentor_applications',
        'pledges',
        'donation_sessions',
        'donation_payments',
        'stripe_webhook_events'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
        EXECUTE format(
            'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',
            table_name
        );
        EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    END LOOP;

    -- No direct-table policies are allowed. Public access goes through FastAPI.
    FOR policy_row IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY (ARRAY[
              'application_users',
              'profile_submission_links',
              'team_profiles',
              'newsletters',
              'newsletter_attachments',
              'subscribers',
              'stories',
              'mentor_applications',
              'pledges',
              'donation_sessions',
              'donation_payments',
              'stripe_webhook_events'
          ])
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            policy_row.policyname,
            policy_row.schemaname,
            policy_row.tablename
        );
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_profile_submission_link_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_donation_progress(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_donation_progress(TEXT) TO service_role;

-- --------------------------------------------------------------------------
-- Supabase Storage
-- --------------------------------------------------------------------------

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES
    (
        'team-profile-images',
        'team-profile-images',
        TRUE,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'story-images',
        'story-images',
        TRUE,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'newsletter-assets',
        'newsletter-assets',
        TRUE,
        20971520,
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove older policies mentioning LTC buckets so browser writes cannot
-- survive a rerun under a legacy policy name.
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_row.policyname);
    END LOOP;
END;
$$;

CREATE POLICY "Public read LTC media"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('team-profile-images', 'story-images', 'newsletter-assets'));

COMMIT;

-- ============================================================================
-- Initial super-admin bootstrap (manual, after creating the Auth user)
-- ============================================================================
-- 1. In Supabase Authentication -> Users, create/invite your first user.
-- 2. Replace the values below and execute the INSERT separately.
--
-- INSERT INTO public.application_users (auth_user_id, name, email, role, status)
-- VALUES (
--     'AUTH-USER-UUID-HERE'::UUID,
--     'Your Name',
--     'you@example.com',
--     'super_admin',
--     'active'
-- );
--
-- Never create an application_users row without a matching auth.users row.
