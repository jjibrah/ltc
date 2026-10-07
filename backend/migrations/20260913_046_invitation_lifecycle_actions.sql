-- Resend, revoke, and retryable cleanup support for invitations.
-- Apply after 20260913_045_invitation_lifecycle.sql.

ALTER TABLE public.application_users
    ADD COLUMN IF NOT EXISTS invitation_revoked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS invitation_cleanup_pending BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS invitation_cleanup_last_error TEXT;

CREATE OR REPLACE FUNCTION public.rbac_resend_invitation(
    actor_id UUID, target_id UUID, event_request_id TEXT DEFAULT NULL
)
RETURNS public.application_users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE actor public.application_users%ROWTYPE; target public.application_users%ROWTYPE; updated public.application_users%ROWTYPE;
BEGIN
    SELECT * INTO actor FROM public.application_users WHERE id = actor_id FOR UPDATE;
    SELECT * INTO target FROM public.application_users WHERE id = target_id FOR UPDATE;
    IF actor.id IS NULL OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN RAISE EXCEPTION 'Super admin required' USING ERRCODE='42501'; END IF;
    IF target.id IS NULL THEN RAISE EXCEPTION 'User not found' USING ERRCODE='P0002'; END IF;
    IF target.status <> 'invited' THEN RAISE EXCEPTION 'Only invited accounts can be resent'; END IF;
    UPDATE public.application_users
    SET invited_at=NOW(), invitation_expires_at=NOW()+INTERVAL '7 days', invitation_revoked_at=NULL,
        invitation_cleanup_pending=FALSE, invitation_cleanup_last_error=NULL
    WHERE id=target.id RETURNING * INTO updated;
    INSERT INTO public.audit_events(actor_user_id,target_user_id,action,entity_type,entity_id,before_state,after_state,reason,request_id,is_sensitive)
    VALUES(actor.id,target.id,'INVITATION_RESENT','application_user',target.id::TEXT,
           jsonb_build_object('invited_at',target.invited_at,'invitation_expires_at',target.invitation_expires_at),
           jsonb_build_object('invited_at',updated.invited_at,'invitation_expires_at',updated.invitation_expires_at),
           'Invitation resent',event_request_id,TRUE);
    RETURN updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_revoke_invitation(
    actor_id UUID, target_id UUID, revoke_reason TEXT, event_request_id TEXT DEFAULT NULL
)
RETURNS public.application_users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE actor public.application_users%ROWTYPE; target public.application_users%ROWTYPE; updated public.application_users%ROWTYPE;
BEGIN
    SELECT * INTO actor FROM public.application_users WHERE id = actor_id FOR UPDATE;
    SELECT * INTO target FROM public.application_users WHERE id = target_id FOR UPDATE;
    IF actor.id IS NULL OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN RAISE EXCEPTION 'Super admin required' USING ERRCODE='42501'; END IF;
    IF target.id IS NULL THEN RAISE EXCEPTION 'User not found' USING ERRCODE='P0002'; END IF;
    IF target.status <> 'invited' THEN RAISE EXCEPTION 'Only invited accounts can be revoked'; END IF;
    UPDATE public.application_users
    SET invitation_revoked_at=NOW(), invitation_expires_at=NOW(), invitation_cleanup_pending=TRUE
    WHERE id=target.id RETURNING * INTO updated;
    INSERT INTO public.audit_events(actor_user_id,target_user_id,action,entity_type,entity_id,before_state,after_state,reason,request_id,is_sensitive)
    VALUES(actor.id,target.id,'INVITATION_REVOKED','application_user',target.id::TEXT,
           jsonb_build_object('status',target.status),jsonb_build_object('status',updated.status,'invitation_revoked_at',updated.invitation_revoked_at),
           btrim(revoke_reason),event_request_id,TRUE);
    RETURN updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_claim_expired_invitation(target_id UUID)
RETURNS public.application_users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE target public.application_users%ROWTYPE; claimed public.application_users%ROWTYPE;
BEGIN
    SELECT * INTO target FROM public.application_users WHERE id=target_id FOR UPDATE;
    IF target.id IS NULL OR target.status <> 'invited' OR target.invitation_expires_at IS NULL OR target.invitation_expires_at > NOW() THEN RETURN NULL; END IF;
    IF target.invitation_cleanup_pending THEN RETURN target; END IF;
    UPDATE public.application_users SET invitation_cleanup_pending=TRUE WHERE id=target.id RETURNING * INTO claimed;
    INSERT INTO public.audit_events(target_user_id,action,entity_type,entity_id,before_state,after_state,reason,is_sensitive)
    VALUES(target.id,'INVITATION_EXPIRED','application_user',target.id::TEXT,
           jsonb_build_object('status',target.status,'invitation_expires_at',target.invitation_expires_at),
           jsonb_build_object('cleanup_pending',TRUE),'Invitation expired; cleanup claimed',TRUE);
    RETURN claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_finalize_invitation_cleanup(target_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE target public.application_users%ROWTYPE;
BEGIN
    SELECT * INTO target FROM public.application_users WHERE id=target_id FOR UPDATE;
    IF target.id IS NULL OR target.status <> 'invited' OR NOT target.invitation_cleanup_pending THEN RETURN FALSE; END IF;
    INSERT INTO public.audit_events(target_user_id,action,entity_type,entity_id,after_state,reason,is_sensitive)
    VALUES(target.id,'INVITATION_CLEANUP_DELETED','application_user',target.id::TEXT,
           jsonb_build_object('deleted',TRUE),'Expired invitation and Auth identity deleted',TRUE);
    DELETE FROM public.application_users WHERE id=target.id;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_record_invitation_cleanup_failure(target_id UUID, failure_reason TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE public.application_users SET invitation_cleanup_pending=TRUE, invitation_cleanup_last_error=left(failure_reason,1000)
    WHERE id=target_id AND status='invited';
    IF NOT FOUND THEN RETURN FALSE; END IF;
    INSERT INTO public.audit_events(target_user_id,action,entity_type,entity_id,after_state,reason,is_sensitive)
    VALUES(target_id,'INVITATION_CLEANUP_FAILED','application_user',target_id::TEXT,
           jsonb_build_object('retryable',TRUE),'Supabase Auth cleanup failed; will retry',TRUE);
    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.rbac_resend_invitation(UUID,UUID,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rbac_revoke_invitation(UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rbac_claim_expired_invitation(UUID) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rbac_finalize_invitation_cleanup(UUID) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.rbac_record_invitation_cleanup_failure(UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rbac_resend_invitation(UUID,UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_revoke_invitation(UUID,UUID,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_claim_expired_invitation(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_finalize_invitation_cleanup(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_record_invitation_cleanup_failure(UUID,TEXT) TO service_role;
