-- Correct the approved Abdifatah account email in the permanent-deletion
-- allowlist. Apply after 20260913_041.

BEGIN;

CREATE OR REPLACE FUNCTION public.rbac_delete_application_user(
    actor_id UUID, target_id UUID, delete_reason TEXT,
    event_request_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor public.application_users%ROWTYPE; target public.application_users%ROWTYPE;
BEGIN
    SELECT * INTO actor FROM public.application_users WHERE id = actor_id FOR UPDATE;
    SELECT * INTO target FROM public.application_users WHERE id = target_id FOR UPDATE;
    IF actor.id IS NULL OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN
        RAISE EXCEPTION 'Super admin required' USING ERRCODE = '42501';
    END IF;
    IF target.id IS NULL THEN
        RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0002';
    END IF;
    IF actor_id = target_id THEN
        RAISE EXCEPTION 'A super admin cannot delete their own account' USING ERRCODE = '42501';
    END IF;
    IF lower(target.email) NOT IN (
        'ibrabdifx@gmail.com',
        'piezo5go@gmail.com',
        'kiboileslie@gmail.com'
    ) THEN
        RAISE EXCEPTION 'This account is not approved for permanent deletion' USING ERRCODE = '42501';
    END IF;
    IF length(btrim(COALESCE(delete_reason, ''))) < 3 THEN
        RAISE EXCEPTION 'A reason is required';
    END IF;

    INSERT INTO public.audit_events(
        actor_user_id,target_user_id,action,entity_type,entity_id,
        before_state,reason,request_id,is_sensitive
    )
    VALUES(
        actor_id,target.id,'USER_DELETED','application_user',target.id::TEXT,
        jsonb_build_object(
            'name',target.name,
            'email',target.email,
            'role',target.role,
            'status',target.status
        ),
        btrim(delete_reason),event_request_id,TRUE
    );

    DELETE FROM public.application_users WHERE id = target.id;
    RETURN target.auth_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rbac_delete_application_user(UUID,UUID,TEXT,TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rbac_delete_application_user(UUID,UUID,TEXT,TEXT)
    TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
