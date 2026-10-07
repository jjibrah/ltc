-- Invitation lifecycle: seven-day secure activation window.
-- Apply after 20260913_040_rbac_and_audit.sql.

ALTER TABLE public.application_users
    ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS invitation_completed_at TIMESTAMPTZ;

UPDATE public.application_users
SET invitation_expires_at = COALESCE(invited_at, created_at) + INTERVAL '7 days'
WHERE status = 'invited' AND invitation_expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_application_users_invitation_expiry
    ON public.application_users (status, invitation_expires_at);

CREATE OR REPLACE FUNCTION public.rbac_create_invited_application_user(
    actor_id UUID, invited_auth_user_id UUID, invited_name TEXT,
    invited_email TEXT, invited_role TEXT, event_request_id TEXT DEFAULT NULL
)
RETURNS public.application_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor public.application_users%ROWTYPE; invited public.application_users%ROWTYPE;
BEGIN
    SELECT * INTO actor FROM public.application_users WHERE id = actor_id FOR UPDATE;
    IF actor.id IS NULL OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN
        RAISE EXCEPTION 'Super admin required' USING ERRCODE = '42501';
    END IF;
    IF invited_role NOT IN ('super_admin','admin','staff','viewer') THEN
        RAISE EXCEPTION 'Unknown role';
    END IF;
    INSERT INTO public.application_users(
        auth_user_id,name,email,role,status,invited_at,invitation_expires_at,
        invitation_completed_at,invited_by
    )
    VALUES(
        invited_auth_user_id,btrim(invited_name),lower(btrim(invited_email)),
        invited_role,'invited',NOW(),NOW() + INTERVAL '7 days',NULL,actor_id
    )
    RETURNING * INTO invited;
    INSERT INTO public.audit_events(actor_user_id,target_user_id,action,entity_type,entity_id,after_state,reason,request_id,is_sensitive)
    VALUES(actor_id,invited.id,'USER_INVITED','application_user',invited.id::TEXT,
           jsonb_build_object('email',invited.email,'role',invited.role,'status',invited.status,
                              'invitation_expires_at',invited.invitation_expires_at),
           'User invitation created',event_request_id,TRUE);
    RETURN invited;
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_activate_invited_user(
    target_auth_user_id UUID, event_request_id TEXT DEFAULT NULL
)
RETURNS public.application_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE target public.application_users%ROWTYPE; activated public.application_users%ROWTYPE;
BEGIN
    SELECT * INTO target FROM public.application_users WHERE auth_user_id = target_auth_user_id FOR UPDATE;
    IF target.id IS NULL THEN
        RAISE EXCEPTION 'Application user not found' USING ERRCODE = 'P0002';
    END IF;
    IF target.status = 'disabled' THEN
        RAISE EXCEPTION 'Account is disabled' USING ERRCODE = '42501';
    END IF;
    -- Active users may use the same endpoint for ordinary password recovery;
    -- only invited accounts enter the activation transition.
    IF target.status = 'active' THEN RETURN target; END IF;
    IF target.invitation_expires_at IS NULL OR target.invitation_expires_at <= NOW() THEN
        RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = '41000';
    END IF;
    UPDATE public.application_users
    SET status='active', activated_at=NOW(), invitation_completed_at=NOW(),
        permissions_version=permissions_version+1
    WHERE id=target.id RETURNING * INTO activated;
    INSERT INTO public.audit_events(target_user_id,action,entity_type,entity_id,before_state,after_state,reason,request_id,is_sensitive)
    VALUES(target.id,'USER_ACTIVATED','application_user',target.id::TEXT,
           jsonb_build_object('status',target.status,'invitation_expires_at',target.invitation_expires_at),
           jsonb_build_object('status',activated.status,'invitation_completed_at',activated.invitation_completed_at),
           'Invitation accepted',event_request_id,TRUE);
    RETURN activated;
END;
$$;
