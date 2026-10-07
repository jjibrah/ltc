-- Manage role permission defaults transactionally from the admin application.
-- Apply after 20260913_046_invitation_lifecycle_actions.sql.

BEGIN;

-- Repair the existing per-user override function. Its TABLE return field named
-- `code` is also a PL/pgSQL variable, so every permissions column reference
-- must be qualified to avoid PostgreSQL error 42702.
CREATE OR REPLACE FUNCTION public.rbac_replace_user_permission_overrides(
    actor_id UUID,
    target_id UUID,
    grant_codes TEXT[],
    deny_codes TEXT[],
    change_reason TEXT,
    event_request_id TEXT DEFAULT NULL,
    event_ip_hash TEXT DEFAULT NULL
)
RETURNS TABLE(code TEXT, effect TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor public.application_users%ROWTYPE;
    target public.application_users%ROWTYPE;
    before_value JSONB;
    after_value JSONB;
    unknown_count INTEGER;
BEGIN
    SELECT * INTO actor FROM public.application_users WHERE id = actor_id FOR UPDATE;
    SELECT * INTO target FROM public.application_users WHERE id = target_id FOR UPDATE;
    IF actor.id IS NULL OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN RAISE EXCEPTION 'Super admin required' USING ERRCODE = '42501'; END IF;
    IF target.id IS NULL THEN RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0002'; END IF;
    IF target.role = 'super_admin' THEN RAISE EXCEPTION 'Super-admin permissions cannot be overridden' USING ERRCODE = '42501'; END IF;
    IF length(btrim(COALESCE(change_reason, ''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
    IF COALESCE(grant_codes, ARRAY[]::TEXT[]) && COALESCE(deny_codes, ARRAY[]::TEXT[]) THEN RAISE EXCEPTION 'A permission cannot be both granted and denied'; END IF;

    SELECT COUNT(*) INTO unknown_count
    FROM unnest(COALESCE(grant_codes, ARRAY[]::TEXT[]) || COALESCE(deny_codes, ARRAY[]::TEXT[])) AS requested(requested_code)
    LEFT JOIN public.permissions AS permission ON permission.code = requested.requested_code
    WHERE permission.id IS NULL;
    IF unknown_count > 0 THEN RAISE EXCEPTION 'One or more permission codes are unknown'; END IF;
    IF EXISTS (
        SELECT 1 FROM public.permissions AS permission
        WHERE permission.code = ANY(COALESCE(grant_codes, ARRAY[]::TEXT[]) || COALESCE(deny_codes, ARRAY[]::TEXT[]))
          AND permission.is_system_only
    ) THEN RAISE EXCEPTION 'System-only permissions cannot be assigned as overrides' USING ERRCODE = '42501'; END IF;
    IF target.role = 'viewer' AND EXISTS (
        SELECT 1 FROM public.permissions AS permission
        WHERE permission.code = ANY(COALESCE(grant_codes, ARRAY[]::TEXT[]))
          AND permission.action <> 'view'
    ) THEN RAISE EXCEPTION 'Viewer overrides must remain read-only' USING ERRCODE = '42501'; END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('code', permission.code, 'effect', override_row.effect) ORDER BY permission.code), '[]'::JSONB)
    INTO before_value
    FROM public.user_permission_overrides AS override_row
    JOIN public.permissions AS permission ON permission.id = override_row.permission_id
    WHERE override_row.user_id = target_id;

    DELETE FROM public.user_permission_overrides WHERE user_id = target_id;
    INSERT INTO public.user_permission_overrides(user_id, permission_id, effect, granted_by, reason)
    SELECT target_id, permission.id, 'grant', actor_id, btrim(change_reason)
    FROM public.permissions AS permission
    WHERE permission.code = ANY(COALESCE(grant_codes, ARRAY[]::TEXT[]))
    UNION ALL
    SELECT target_id, permission.id, 'deny', actor_id, btrim(change_reason)
    FROM public.permissions AS permission
    WHERE permission.code = ANY(COALESCE(deny_codes, ARRAY[]::TEXT[]));

    UPDATE public.application_users SET permissions_version = permissions_version + 1 WHERE id = target_id;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('code', permission.code, 'effect', override_row.effect) ORDER BY permission.code), '[]'::JSONB)
    INTO after_value
    FROM public.user_permission_overrides AS override_row
    JOIN public.permissions AS permission ON permission.id = override_row.permission_id
    WHERE override_row.user_id = target_id;

    INSERT INTO public.audit_events(actor_user_id, target_user_id, action, entity_type, entity_id, before_state, after_state, reason, request_id, ip_hash, is_sensitive)
    SELECT actor_id, target_id, CASE override_row.effect WHEN 'grant' THEN 'PERMISSION_GRANTED' ELSE 'PERMISSION_DENIED' END,
           'permission', permission.code, NULL, jsonb_build_object('effect', override_row.effect), btrim(change_reason), event_request_id, event_ip_hash, permission.is_sensitive
    FROM public.user_permission_overrides AS override_row
    JOIN public.permissions AS permission ON permission.id = override_row.permission_id
    WHERE override_row.user_id = target_id
      AND NOT (before_value @> jsonb_build_array(jsonb_build_object('code', permission.code, 'effect', override_row.effect)));
    INSERT INTO public.audit_events(actor_user_id, target_user_id, action, entity_type, entity_id, before_state, after_state, reason, request_id, ip_hash, is_sensitive)
    VALUES(actor_id, target_id, CASE WHEN after_value = '[]'::JSONB THEN 'PERMISSIONS_RESET' ELSE 'PERMISSIONS_CHANGED' END, 'application_user', target_id::TEXT, before_value, after_value, btrim(change_reason), event_request_id, event_ip_hash, TRUE);

    RETURN QUERY
    SELECT permission.code, override_row.effect
    FROM public.user_permission_overrides AS override_row
    JOIN public.permissions AS permission ON permission.id = override_row.permission_id
    WHERE override_row.user_id = target_id
    ORDER BY permission.code;
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_replace_role_permissions(
    actor_id UUID,
    target_role TEXT,
    permission_codes TEXT[],
    change_reason TEXT,
    event_request_id TEXT DEFAULT NULL,
    event_ip_hash TEXT DEFAULT NULL
)
RETURNS TABLE(code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor public.application_users%ROWTYPE;
    before_value JSONB;
    after_value JSONB;
    unknown_count INTEGER;
BEGIN
    SELECT * INTO actor
    FROM public.application_users
    WHERE id = actor_id
    FOR UPDATE;

    IF actor.id IS NULL OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN
        RAISE EXCEPTION 'Super admin required' USING ERRCODE = '42501';
    END IF;
    IF target_role = 'super_admin' THEN
        RAISE EXCEPTION 'Super admin role permissions are managed by the system' USING ERRCODE = '42501';
    END IF;
    IF target_role NOT IN ('admin', 'staff', 'viewer') THEN
        RAISE EXCEPTION 'Unknown role';
    END IF;
    IF length(btrim(COALESCE(change_reason, ''))) < 3 THEN
        RAISE EXCEPTION 'A reason is required';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('role_permissions:' || target_role));

    SELECT COUNT(*) INTO unknown_count
    FROM unnest(COALESCE(permission_codes, ARRAY[]::TEXT[])) requested(code)
    LEFT JOIN public.permissions permission ON permission.code = requested.code
    WHERE permission.id IS NULL;
    IF unknown_count > 0 THEN
        RAISE EXCEPTION 'One or more permission codes are unknown';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.permissions AS permission
        WHERE permission.code = ANY(COALESCE(permission_codes, ARRAY[]::TEXT[]))
          AND permission.is_system_only
    ) THEN
        RAISE EXCEPTION 'System-only permissions cannot be assigned to roles' USING ERRCODE = '42501';
    END IF;
    IF target_role = 'viewer' AND EXISTS (
        SELECT 1 FROM public.permissions AS permission
        WHERE permission.code = ANY(COALESCE(permission_codes, ARRAY[]::TEXT[]))
          AND permission.action <> 'view'
    ) THEN
        RAISE EXCEPTION 'Viewer permissions must remain read-only' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(jsonb_agg(permission.code ORDER BY permission.code), '[]'::JSONB)
    INTO before_value
    FROM public.role_permissions role_permission
    JOIN public.permissions permission ON permission.id = role_permission.permission_id
    WHERE role_permission.role = target_role;

    DELETE FROM public.role_permissions WHERE role = target_role;
    INSERT INTO public.role_permissions(role, permission_id)
    SELECT target_role, permission.id
    FROM public.permissions permission
    WHERE permission.code = ANY(COALESCE(permission_codes, ARRAY[]::TEXT[]));

    UPDATE public.application_users
    SET permissions_version = permissions_version + 1
    WHERE role = target_role;

    SELECT COALESCE(jsonb_agg(permission.code ORDER BY permission.code), '[]'::JSONB)
    INTO after_value
    FROM public.role_permissions role_permission
    JOIN public.permissions permission ON permission.id = role_permission.permission_id
    WHERE role_permission.role = target_role;

    INSERT INTO public.audit_events(
        actor_user_id, action, entity_type, entity_id, before_state,
        after_state, reason, request_id, ip_hash, is_sensitive
    ) VALUES (
        actor_id, 'ROLE_PERMISSIONS_CHANGED', 'application_role', target_role,
        jsonb_build_object('permissions', before_value),
        jsonb_build_object('permissions', after_value),
        btrim(change_reason), event_request_id, event_ip_hash, TRUE
    );

    RETURN QUERY
    SELECT permission.code
    FROM public.role_permissions role_permission
    JOIN public.permissions permission ON permission.id = role_permission.permission_id
    WHERE role_permission.role = target_role
    ORDER BY permission.code;
END;
$$;

REVOKE ALL ON FUNCTION public.rbac_replace_role_permissions(UUID, TEXT, TEXT[], TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rbac_replace_role_permissions(UUID, TEXT, TEXT[], TEXT, TEXT, TEXT)
    TO service_role;

REVOKE ALL ON FUNCTION public.rbac_replace_user_permission_overrides(UUID, UUID, TEXT[], TEXT[], TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rbac_replace_user_permission_overrides(UUID, UUID, TEXT[], TEXT[], TEXT, TEXT, TEXT)
    TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
