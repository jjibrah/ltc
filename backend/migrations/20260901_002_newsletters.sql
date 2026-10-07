-- =========================================================
-- LTC DATABASE - PHASE 4
-- Additive migration: newsletters, newsletter_attachments, subscribers
-- Apply after 20260901_001_core.sql.
-- Never modifies existing tables.
-- =========================================================


-- =========================================================
-- 4. NEWSLETTERS
-- Admin-composed email newsletters sent to subscribers.
-- =========================================================

CREATE TABLE public.newsletters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title           TEXT NOT NULL DEFAULT '',

    preview_text    TEXT,

    body_html       TEXT NOT NULL DEFAULT '',

    banner_path     TEXT,

    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                            'draft', 'scheduled', 'sending',
                            'sent', 'failed', 'cancelled'
                        )),

    scheduled_at    TIMESTAMPTZ,

    sent_at         TIMESTAMPTZ,

    recipient_count INT NOT NULL DEFAULT 0,

    sent_count      INT NOT NULL DEFAULT 0,

    failed_count    INT NOT NULL DEFAULT 0,

    send_error      TEXT,

    created_by      UUID
                        REFERENCES public.application_users(id)
                        ON DELETE SET NULL,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_newsletters_updated_at
BEFORE UPDATE ON public.newsletters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =========================================================
-- 5. NEWSLETTER ATTACHMENTS
-- Files attached to a specific newsletter.
-- Cascade-deleted when the parent newsletter is deleted.
-- =========================================================

CREATE TABLE public.newsletter_attachments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    newsletter_id       UUID NOT NULL
                            REFERENCES public.newsletters(id)
                            ON DELETE CASCADE,

    original_filename   TEXT NOT NULL,

    storage_path        TEXT NOT NULL,

    mime_type           TEXT,

    size_bytes          INT NOT NULL DEFAULT 0,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_newsletter_attachments_newsletter_id
    ON public.newsletter_attachments (newsletter_id);


-- =========================================================
-- 6. SUBSCRIBERS
-- Public newsletter subscribers.
-- =========================================================

CREATE TABLE public.subscribers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email               TEXT NOT NULL UNIQUE,

    status              TEXT NOT NULL DEFAULT 'subscribed'
                            CHECK (status IN (
                                'subscribed', 'unsubscribed', 'bounced'
                            )),

    unsubscribe_token   TEXT NOT NULL UNIQUE,

    source              TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    unsubscribed_at     TIMESTAMPTZ
);

CREATE INDEX idx_subscribers_email  ON public.subscribers (email);
CREATE INDEX idx_subscribers_status ON public.subscribers (status);

CREATE TRIGGER update_subscribers_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- Service-role key (used by the backend) bypasses RLS.
-- Policies are intentionally deny-all by default:
-- all access goes through the FastAPI backend, never
-- directly from the browser/anon key.
-- =========================================================

ALTER TABLE public.newsletters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers           ENABLE ROW LEVEL SECURITY;
