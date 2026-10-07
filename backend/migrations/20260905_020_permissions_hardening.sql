-- Apply deny-by-default permissions consistently to every backend-owned table.
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'application_users', 'profile_submission_links', 'team_profiles',
        'newsletters', 'newsletter_attachments', 'subscribers',
        'donation_sessions', 'donation_payments', 'stripe_webhook_events',
        'stories', 'mentor_applications'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    END LOOP;
END $$;

-- Remove any direct-table policies. The public API is FastAPI, not PostgREST.
DO $$
DECLARE
    policy_row RECORD;
BEGIN
    FOR policy_row IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'application_users', 'profile_submission_links', 'team_profiles',
              'newsletters', 'newsletter_attachments', 'subscribers',
              'donation_sessions', 'donation_payments', 'stripe_webhook_events',
              'stories', 'mentor_applications'
          )
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I',
            policy_row.policyname, policy_row.schemaname, policy_row.tablename);
    END LOOP;
END $$;
