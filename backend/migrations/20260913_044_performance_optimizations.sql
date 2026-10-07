-- Phase 2/3 performance primitives. Apply after the RBAC migrations.

CREATE INDEX IF NOT EXISTS idx_application_users_status_role_created
    ON public.application_users (status, role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_profiles_status_department_created
    ON public.team_profiles (status, department, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donation_payments_public_feed
    ON public.donation_payments (status, paid_at DESC, donation_session_id);

CREATE OR REPLACE FUNCTION public.get_public_supporters_fast(requested_limit INTEGER DEFAULT 20)
RETURNS TABLE(name TEXT, message TEXT, amount NUMERIC, currency TEXT, donated_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        sessions.donor_name,
        sessions.message,
        payments.gross_amount - COALESCE(payments.refunded_amount, 0),
        COALESCE(payments.currency, sessions.currency),
        COALESCE(payments.paid_at, payments.created_at)
    FROM public.donation_payments AS payments
    JOIN public.donation_sessions AS sessions
      ON sessions.id = payments.donation_session_id
    WHERE payments.status IN ('succeeded', 'partially_refunded', 'refunded')
      AND payments.gross_amount - COALESCE(payments.refunded_amount, 0) > 0
      AND sessions.anonymous IS FALSE
      AND sessions.supporter_publication_status = 'approved'
    ORDER BY COALESCE(payments.paid_at, payments.created_at) DESC
    LIMIT LEAST(GREATEST(requested_limit, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.get_public_supporters_fast(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_supporters_fast(INTEGER) TO service_role;
