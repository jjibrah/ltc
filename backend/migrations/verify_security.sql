-- Expected result: zero rows. Every backend table must have RLS enabled/forced.
SELECT c.relname AS insecure_table, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
      'application_users', 'profile_submission_links', 'team_profiles',
      'newsletters', 'newsletter_attachments', 'subscribers',
      'donation_sessions', 'donation_payments', 'stripe_webhook_events',
      'stories', 'mentor_applications', 'pledges'
  )
  AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity);

-- Expected result: zero rows. Browser roles must have no direct table grants.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND table_name IN (
      'application_users', 'profile_submission_links', 'team_profiles',
      'newsletters', 'newsletter_attachments', 'subscribers',
      'donation_sessions', 'donation_payments', 'stripe_webhook_events',
      'stories', 'mentor_applications', 'pledges'
  );

-- Expected result: exactly one SELECT policy and no write policy for LTC buckets.
SELECT policyname, cmd, roles, qual, with_check
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
  );
