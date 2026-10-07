-- =========================================================
-- LTC DATABASE - STRIPE DONATIONS
-- Paste this complete script into the Supabase SQL Editor.
-- This is an additive migration; the backend never runs it automatically.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared updated_at trigger function. CREATE OR REPLACE makes this compatible
-- with the same function already defined by the LTC base schema.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- One row per attempt to begin one-time or monthly Stripe Checkout.
CREATE TABLE IF NOT EXISTS public.donation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_idempotency_key TEXT UNIQUE,
    stripe_checkout_session_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    donor_name TEXT NOT NULL,
    donor_email TEXT NOT NULL,
    requested_amount NUMERIC(14, 2) NOT NULL
        CHECK (requested_amount > 0),
    currency TEXT NOT NULL
        CHECK (currency = 'usd'),
    frequency TEXT NOT NULL
        CHECK (frequency IN ('one_time', 'monthly')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'completed', 'expired', 'failed', 'cancelled'
        )),
    anonymous BOOLEAN NOT NULL DEFAULT TRUE,
    message TEXT,
    supporter_publication_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (supporter_publication_status IN ('pending', 'approved', 'rejected')),
    supporter_reviewed_at TIMESTAMPTZ,
    supporter_reviewed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_sessions_status
    ON public.donation_sessions (status);

CREATE INDEX IF NOT EXISTS idx_donation_sessions_customer
    ON public.donation_sessions (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donation_sessions_created_at
    ON public.donation_sessions (created_at DESC);

DROP TRIGGER IF EXISTS update_donation_sessions_updated_at
    ON public.donation_sessions;

CREATE TRIGGER update_donation_sessions_updated_at
BEFORE UPDATE ON public.donation_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- One row per actual Stripe payment. Each successfully paid subscription
-- invoice gets its own row, so monthly donations are counted correctly.
CREATE TABLE IF NOT EXISTS public.donation_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_session_id UUID NOT NULL
        REFERENCES public.donation_sessions(id)
        ON DELETE RESTRICT,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT UNIQUE,
    stripe_invoice_id TEXT UNIQUE,
    gross_amount NUMERIC(14, 2) NOT NULL
        CHECK (gross_amount >= 0),
    refunded_amount NUMERIC(14, 2) NOT NULL DEFAULT 0
        CHECK (
            refunded_amount >= 0
            AND refunded_amount <= gross_amount
        ),
    currency TEXT NOT NULL
        CHECK (currency = 'usd'),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'succeeded', 'failed',
            'partially_refunded', 'refunded'
        )),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        stripe_payment_intent_id IS NOT NULL
        OR stripe_charge_id IS NOT NULL
        OR stripe_invoice_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_donation_payments_session
    ON public.donation_payments (donation_session_id);

CREATE INDEX IF NOT EXISTS idx_donation_payments_status_currency
    ON public.donation_payments (status, currency);

CREATE INDEX IF NOT EXISTS idx_donation_payments_paid_at
    ON public.donation_payments (paid_at DESC)
    WHERE paid_at IS NOT NULL;

DROP TRIGGER IF EXISTS update_donation_payments_updated_at
    ON public.donation_payments;

CREATE TRIGGER update_donation_payments_updated_at
BEFORE UPDATE ON public.donation_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Stripe retries and can reorder webhook deliveries. Its event ID is the
-- idempotency boundary. Raw webhook payloads are intentionally not stored.
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

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
    ON public.stripe_webhook_events (processing_status);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at
    ON public.stripe_webhook_events (created_at DESC);


-- The FastAPI backend uses the service-role client, which bypasses RLS. No
-- public policies are created, preventing browser clients from reading donor
-- PII or changing payment state directly through Supabase.
ALTER TABLE public.donation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Hardening for databases created from an earlier version of this script.
ALTER TABLE public.stripe_webhook_events
    ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.donation_sessions
    ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS supporter_publication_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS supporter_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS supporter_reviewed_by TEXT;

ALTER TABLE public.donation_sessions ALTER COLUMN anonymous SET DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_donation_sessions_checkout_idempotency
    ON public.donation_sessions (checkout_idempotency_key)
    WHERE checkout_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_donation_sessions_checkout_session
    ON public.donation_sessions (stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_donation_sessions_subscription
    ON public.donation_sessions (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_donation_payments_payment_intent
    ON public.donation_payments (stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_donation_payments_charge
    ON public.donation_payments (stripe_charge_id)
    WHERE stripe_charge_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_donation_payments_invoice
    ON public.donation_payments (stripe_invoice_id)
    WHERE stripe_invoice_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_stripe_webhook_events_event_id
    ON public.stripe_webhook_events (stripe_event_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donation_sessions_currency_usd') THEN
        ALTER TABLE public.donation_sessions
            ADD CONSTRAINT donation_sessions_currency_usd CHECK (currency = 'usd') NOT VALID;
        ALTER TABLE public.donation_sessions VALIDATE CONSTRAINT donation_sessions_currency_usd;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donation_payments_currency_usd') THEN
        ALTER TABLE public.donation_payments
            ADD CONSTRAINT donation_payments_currency_usd CHECK (currency = 'usd') NOT VALID;
        ALTER TABLE public.donation_payments VALIDATE CONSTRAINT donation_payments_currency_usd;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donation_sessions_publication_status') THEN
        ALTER TABLE public.donation_sessions
            ADD CONSTRAINT donation_sessions_publication_status
            CHECK (supporter_publication_status IN ('pending', 'approved', 'rejected')) NOT VALID;
        ALTER TABLE public.donation_sessions
            VALIDATE CONSTRAINT donation_sessions_publication_status;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donation_sessions_frequency_valid') THEN
        ALTER TABLE public.donation_sessions ADD CONSTRAINT donation_sessions_frequency_valid
            CHECK (frequency IN ('one_time', 'monthly')) NOT VALID;
        ALTER TABLE public.donation_sessions VALIDATE CONSTRAINT donation_sessions_frequency_valid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donation_sessions_status_valid') THEN
        ALTER TABLE public.donation_sessions ADD CONSTRAINT donation_sessions_status_valid
            CHECK (status IN ('pending', 'completed', 'expired', 'failed', 'cancelled')) NOT VALID;
        ALTER TABLE public.donation_sessions VALIDATE CONSTRAINT donation_sessions_status_valid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donation_sessions_amount_positive') THEN
        ALTER TABLE public.donation_sessions ADD CONSTRAINT donation_sessions_amount_positive
            CHECK (requested_amount > 0) NOT VALID;
        ALTER TABLE public.donation_sessions VALIDATE CONSTRAINT donation_sessions_amount_positive;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donation_payments_status_valid') THEN
        ALTER TABLE public.donation_payments ADD CONSTRAINT donation_payments_status_valid
            CHECK (status IN ('pending', 'succeeded', 'failed', 'partially_refunded', 'refunded')) NOT VALID;
        ALTER TABLE public.donation_payments VALIDATE CONSTRAINT donation_payments_status_valid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donation_payments_amounts_valid') THEN
        ALTER TABLE public.donation_payments ADD CONSTRAINT donation_payments_amounts_valid
            CHECK (gross_amount >= 0 AND refunded_amount >= 0 AND refunded_amount <= gross_amount) NOT VALID;
        ALTER TABLE public.donation_payments VALIDATE CONSTRAINT donation_payments_amounts_valid;
    END IF;
END $$;


-- Aggregate financial progress inside PostgreSQL using fixed-precision NUMERIC.
-- This function is backend-only and cannot be called with browser Supabase keys.
CREATE OR REPLACE FUNCTION public.get_donation_progress(requested_currency TEXT DEFAULT 'usd')
RETURNS TABLE(total_collected NUMERIC, successful_payment_count BIGINT, currency TEXT)
LANGUAGE sql
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


-- Remove any policies left by an earlier deployment. Financial tables are
-- intentionally backend-only; the service role bypasses RLS.
DO $$
DECLARE policy_row RECORD;
BEGIN
    FOR policy_row IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('donation_sessions', 'donation_payments', 'stripe_webhook_events')
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.%I',
            policy_row.policyname,
            policy_row.tablename
        );
    END LOOP;
END $$;

REVOKE ALL ON TABLE public.donation_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.donation_payments FROM anon, authenticated;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_donation_progress(TEXT) FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.donation_sessions TO service_role;
GRANT ALL ON TABLE public.donation_payments TO service_role;
GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;
GRANT EXECUTE ON FUNCTION public.get_donation_progress(TEXT) TO service_role;
