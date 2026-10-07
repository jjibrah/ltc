-- Preserve historical donations as first-class ledger records without
-- fabricating Stripe identifiers. Apply after the donation schema migration.

ALTER TABLE public.donation_sessions
    ADD COLUMN IF NOT EXISTS payment_source TEXT NOT NULL DEFAULT 'stripe',
    ADD COLUMN IF NOT EXISTS manual_reference TEXT,
    ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.application_users(id) ON DELETE SET NULL;

ALTER TABLE public.donation_payments
    ADD COLUMN IF NOT EXISTS payment_source TEXT NOT NULL DEFAULT 'stripe';

ALTER TABLE public.donation_sessions
    DROP CONSTRAINT IF EXISTS donation_sessions_payment_source_check;

ALTER TABLE public.donation_sessions
    ADD CONSTRAINT donation_sessions_payment_source_check
    CHECK (payment_source IN ('stripe', 'manual'));

DO $$
DECLARE
    constraint_row RECORD;
BEGIN
    FOR constraint_row IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'donation_payments'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%stripe_payment_intent_id%'
          AND pg_get_constraintdef(con.oid) LIKE '%stripe_charge_id%'
          AND pg_get_constraintdef(con.oid) LIKE '%stripe_invoice_id%'
    LOOP
        EXECUTE format('ALTER TABLE public.donation_payments DROP CONSTRAINT %I', constraint_row.conname);
    END LOOP;
END $$;

ALTER TABLE public.donation_payments
    DROP CONSTRAINT IF EXISTS donation_payments_payment_source_check,
    DROP CONSTRAINT IF EXISTS donation_payments_source_currency_check;

ALTER TABLE public.donation_payments
    ADD CONSTRAINT donation_payments_payment_source_check
    CHECK (
        payment_source = 'manual'
        OR stripe_payment_intent_id IS NOT NULL
        OR stripe_charge_id IS NOT NULL
        OR stripe_invoice_id IS NOT NULL
    );

ALTER TABLE public.donation_payments
    ADD CONSTRAINT donation_payments_source_currency_check
    CHECK (payment_source <> 'manual' OR currency = 'usd');
