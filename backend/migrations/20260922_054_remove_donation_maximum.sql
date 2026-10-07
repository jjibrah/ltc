-- Remove the application-specific $10,000 donation ceiling while preserving
-- a $1 minimum. Stripe's own payment-processing limits still apply.

ALTER TABLE public.donation_sessions
    DROP CONSTRAINT IF EXISTS donation_sessions_requested_amount_check,
    DROP CONSTRAINT IF EXISTS donation_sessions_amount_positive,
    DROP CONSTRAINT IF EXISTS donation_sessions_amount_minimum;

ALTER TABLE public.donation_sessions
    ADD CONSTRAINT donation_sessions_amount_minimum
    CHECK (requested_amount >= 1) NOT VALID;

ALTER TABLE public.donation_sessions
    VALIDATE CONSTRAINT donation_sessions_amount_minimum;
