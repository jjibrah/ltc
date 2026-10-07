-- Public supporter feed: include opted-out donations anonymously and page results.

DROP FUNCTION IF EXISTS public.get_public_supporters_fast(INTEGER);

CREATE OR REPLACE FUNCTION public.get_public_supporters_fast(
    requested_limit INTEGER DEFAULT 9,
    requested_offset INTEGER DEFAULT 0
)
RETURNS TABLE(name TEXT, message TEXT, amount NUMERIC, currency TEXT, donated_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        CASE WHEN sessions.anonymous THEN 'Anonymous' ELSE sessions.donor_name END,
        sessions.message,
        payments.gross_amount - COALESCE(payments.refunded_amount, 0),
        COALESCE(payments.currency, sessions.currency),
        COALESCE(payments.paid_at, payments.created_at)
    FROM public.donation_payments AS payments
    JOIN public.donation_sessions AS sessions
      ON sessions.id = payments.donation_session_id
    WHERE payments.status IN ('succeeded', 'partially_refunded', 'refunded')
      AND payments.gross_amount - COALESCE(payments.refunded_amount, 0) > 0
      AND (sessions.anonymous IS TRUE OR sessions.supporter_publication_status = 'approved')
    ORDER BY COALESCE(payments.paid_at, payments.created_at) DESC
    LIMIT LEAST(GREATEST(requested_limit, 1), 50)
    OFFSET GREATEST(requested_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.get_public_supporters_fast(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_supporters_fast(INTEGER, INTEGER) TO service_role;
