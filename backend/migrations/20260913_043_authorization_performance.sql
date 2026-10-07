-- Phase 1 authorization fast path.
-- Apply after 20260913_040_rbac_and_audit.sql.
-- The backend still owns the service-role credential; this function is not
-- exposed to browser clients.
CREATE OR REPLACE FUNCTION public.rbac_authorize_application_request(
    requested_user_id UUID,
    requested_permission_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user public.application_users%ROWTYPE;
    permitted BOOLEAN := FALSE;
BEGIN
    SELECT * INTO target_user
    FROM public.application_users
    WHERE id = requested_user_id;

    IF target_user.id IS NULL OR target_user.status <> 'active' THEN
        RAISE EXCEPTION 'Account is not active' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = requested_permission_code) THEN
        RAISE EXCEPTION 'Unknown permission configuration' USING ERRCODE = 'P0001';
    END IF;

    IF target_user.role = 'super_admin' THEN
        permitted := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1
            FROM public.resolve_effective_permission_codes(requested_user_id) effective
            WHERE effective.code = requested_permission_code
        ) INTO permitted;
    END IF;

    RETURN jsonb_build_object(
        'allowed', permitted,
        'user_id', target_user.id,
        'permissions_version', target_user.permissions_version
    );
END;
$$;

REVOKE ALL ON FUNCTION public.rbac_authorize_application_request(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rbac_authorize_application_request(UUID, TEXT) TO service_role;
