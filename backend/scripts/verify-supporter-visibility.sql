-- Read-only: run on the explicitly selected target before and after migration.
-- Before: save the definition and ACL result as the recovery/reference record.
BEGIN READ ONLY;

SELECT pg_get_functiondef('public.get_public_supporters_fast(integer,integer)'::regprocedure)
    AS supporter_function_definition;

-- After: anonymous IS TRUE must not be an alternative publication condition.
-- The CASE expression must still anonymize names for approved anonymous donors.
-- Expected: SECURITY DEFINER, search_path=public, service_role EXECUTE only
-- (in addition to the function owner's inherent access).
SELECT p.prosecdef AS security_definer, p.proconfig AS configuration, p.proacl AS grants
FROM pg_proc AS p
WHERE p.oid = 'public.get_public_supporters_fast(integer,integer)'::regprocedure;

-- After: every comparison is true. Evaluate the actual function against the
-- independently specified approved-only ledger for both pages and limit bounds.
WITH expected AS (
    SELECT
        CASE WHEN s.anonymous THEN 'Anonymous' ELSE s.donor_name END AS name,
        s.message,
        p.gross_amount - COALESCE(p.refunded_amount, 0) AS amount,
        COALESCE(p.currency, s.currency) AS currency,
        COALESCE(p.paid_at, p.created_at) AS donated_at
    FROM public.donation_payments AS p
    JOIN public.donation_sessions AS s ON s.id = p.donation_session_id
    WHERE s.supporter_publication_status = 'approved'
      AND p.status IN ('succeeded', 'partially_refunded', 'refunded')
      AND p.gross_amount - COALESCE(p.refunded_amount, 0) > 0
), cases(requested_limit, requested_offset) AS (
    VALUES (9, 0), (9, 9), (50, 0), (100, 0), (0, 0), (9, -1)
)
SELECT c.*,
    NOT EXISTS (
        (SELECT * FROM public.get_public_supporters_fast(c.requested_limit, c.requested_offset)
         EXCEPT ALL
         SELECT * FROM (SELECT * FROM expected ORDER BY donated_at DESC
                       LIMIT LEAST(GREATEST(c.requested_limit, 1), 50)
                       OFFSET GREATEST(c.requested_offset, 0)) AS e)
        UNION ALL
        (SELECT * FROM (SELECT * FROM expected ORDER BY donated_at DESC
                       LIMIT LEAST(GREATEST(c.requested_limit, 1), 50)
                       OFFSET GREATEST(c.requested_offset, 0)) AS e
         EXCEPT ALL
         SELECT * FROM public.get_public_supporters_fast(c.requested_limit, c.requested_offset))
    ) AS matches_approved_ledger
FROM cases AS c;

-- Counts only; no donor identities or email addresses are exported.
SELECT s.supporter_publication_status, s.anonymous, count(*) AS eligible_payment_count
FROM public.donation_payments AS p
JOIN public.donation_sessions AS s ON s.id = p.donation_session_id
WHERE p.status IN ('succeeded', 'partially_refunded', 'refunded')
  AND p.gross_amount - COALESCE(p.refunded_amount, 0) > 0
GROUP BY s.supporter_publication_status, s.anonymous
ORDER BY s.supporter_publication_status, s.anonymous;

COMMIT;
