-- Living The Charge: hybrid RBAC, per-user overrides, and append-only audit log.
-- Apply after 20260905_030_reliability_indexes.sql.
-- This migration is additive and idempotent. Existing active users remain active.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Expand the existing application-user model without recreating it.
ALTER TABLE public.application_users
    DROP CONSTRAINT IF EXISTS application_users_role_check;
ALTER TABLE public.application_users
    ADD CONSTRAINT application_users_role_check
    CHECK (role IN ('super_admin', 'admin', 'staff', 'viewer')) NOT VALID;
ALTER TABLE public.application_users
    VALIDATE CONSTRAINT application_users_role_check;

ALTER TABLE public.application_users
    DROP CONSTRAINT IF EXISTS application_users_status_check;
ALTER TABLE public.application_users
    ADD CONSTRAINT application_users_status_check
    CHECK (status IN ('invited', 'active', 'disabled')) NOT VALID;
ALTER TABLE public.application_users
    VALIDATE CONSTRAINT application_users_status_check;
ALTER TABLE public.application_users
    ALTER COLUMN role SET DEFAULT 'viewer',
    ALTER COLUMN status SET DEFAULT 'invited';

ALTER TABLE public.application_users
    ADD COLUMN IF NOT EXISTS permissions_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.application_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

UPDATE public.application_users
SET activated_at = COALESCE(activated_at, created_at)
WHERE status = 'active' AND activated_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.application_users
        WHERE role = 'super_admin' AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'RBAC migration requires at least one existing active super admin';
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    is_system_only BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT permissions_code_format CHECK (code ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
    CONSTRAINT permissions_module_not_blank CHECK (length(btrim(module)) > 0),
    CONSTRAINT permissions_action_not_blank CHECK (length(btrim(action)) > 0)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'viewer')),
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
    user_id UUID NOT NULL REFERENCES public.application_users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    effect TEXT NOT NULL CHECK (effect IN ('grant', 'deny')),
    granted_by UUID NOT NULL REFERENCES public.application_users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Deliberately not foreign keys: security history must retain immutable
    -- actor/target identifiers after an application user is deleted.
    actor_user_id UUID,
    target_user_id UUID,
    action TEXT NOT NULL CHECK (action ~ '^[A-Z][A-Z0-9_]*$'),
    entity_type TEXT NOT NULL CHECK (length(btrim(entity_type)) > 0),
    entity_id TEXT,
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    request_id TEXT,
    ip_hash TEXT,
    is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
    ON public.role_permissions (permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user
    ON public.user_permission_overrides (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
    ON public.audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor
    ON public.audit_events (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_target
    ON public.audit_events (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action
    ON public.audit_events (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity
    ON public.audit_events (entity_type, entity_id, created_at DESC);

DROP TRIGGER IF EXISTS update_user_permission_overrides_updated_at
    ON public.user_permission_overrides;
CREATE TRIGGER update_user_permission_overrides_updated_at
BEFORE UPDATE ON public.user_permission_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Permission catalogue. Updates keep descriptions and sensitivity flags current.
INSERT INTO public.permissions (code, module, action, description, is_sensitive, is_system_only)
VALUES
    ('dashboard.view', 'dashboard', 'view', 'View the administration dashboard', FALSE, FALSE),
    ('donations.view', 'donations', 'view', 'View donation records and summaries', TRUE, FALSE),
    ('donations.manage_manual', 'donations', 'manage_manual', 'Create and update manual donation records', TRUE, FALSE),
    ('donations.verify_manual', 'donations', 'verify_manual', 'Verify manual donation records', TRUE, FALSE),
    ('donations.void_manual', 'donations', 'void_manual', 'Void verified manual donation records', TRUE, FALSE),
    ('donations.purge_test', 'donations', 'purge_test', 'Permanently purge identified test donation data', TRUE, TRUE),
    ('donations.export', 'donations', 'export', 'Export donation reports', TRUE, FALSE),
    ('pledges.view', 'pledges', 'view', 'View pledges', TRUE, FALSE),
    ('pledges.create', 'pledges', 'create', 'Create pledges', TRUE, FALSE),
    ('pledges.update', 'pledges', 'update', 'Update pledges', TRUE, FALSE),
    ('pledges.cancel', 'pledges', 'cancel', 'Cancel pledges', TRUE, FALSE),
    ('pledges.allocate', 'pledges', 'allocate', 'Allocate received funds to pledges', TRUE, FALSE),
    ('users.view', 'users', 'view', 'View application users', TRUE, FALSE),
    ('users.invite', 'users', 'invite', 'Invite application users', TRUE, FALSE),
    ('users.update', 'users', 'update', 'Update non-security user information', TRUE, FALSE),
    ('users.disable', 'users', 'disable', 'Disable or enable application users', TRUE, FALSE),
    ('users.manage_roles', 'users', 'manage_roles', 'Assign application roles', TRUE, TRUE),
    ('users.manage_permissions', 'users', 'manage_permissions', 'Manage user permission overrides', TRUE, TRUE),
    ('profiles.view', 'profiles', 'view', 'View team profiles', FALSE, FALSE),
    ('profiles.update', 'profiles', 'update', 'Update team profiles', FALSE, FALSE),
    ('profiles.publish', 'profiles', 'publish', 'Publish or unpublish team profiles', TRUE, FALSE),
    ('profiles.delete', 'profiles', 'delete', 'Delete team profiles', TRUE, FALSE),
    ('mentors.view', 'mentors', 'view', 'View mentor applications', TRUE, FALSE),
    ('mentors.update', 'mentors', 'update', 'Update mentor application status', TRUE, FALSE),
    ('newsletters.view', 'newsletters', 'view', 'View newsletter drafts and delivery status', FALSE, FALSE),
    ('newsletters.create', 'newsletters', 'create', 'Create newsletters', FALSE, FALSE),
    ('newsletters.update', 'newsletters', 'update', 'Update newsletters and attachments', FALSE, FALSE),
    ('newsletters.send', 'newsletters', 'send', 'Send newsletters to subscribers', TRUE, FALSE),
    ('newsletters.delete', 'newsletters', 'delete', 'Delete newsletters', TRUE, FALSE),
    ('stories.view', 'stories', 'view', 'View story administration', FALSE, FALSE),
    ('stories.create', 'stories', 'create', 'Create stories', FALSE, FALSE),
    ('stories.update', 'stories', 'update', 'Update stories', FALSE, FALSE),
    ('stories.publish', 'stories', 'publish', 'Publish or unpublish stories', TRUE, FALSE),
    ('stories.delete', 'stories', 'delete', 'Delete stories', TRUE, FALSE),
    ('audit.view', 'audit', 'view', 'View the security audit log', TRUE, TRUE),
    ('settings.manage', 'settings', 'manage', 'Manage system-level settings', TRUE, TRUE)
ON CONFLICT (code) DO UPDATE SET
    module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    is_sensitive = EXCLUDED.is_sensitive,
    is_system_only = EXCLUDED.is_system_only;

-- Idempotently replace role defaults so the migration is deterministic.
DELETE FROM public.role_permissions
WHERE role IN ('admin', 'staff', 'viewer');

INSERT INTO public.role_permissions (role, permission_id)
SELECT preset.role, permission.id
FROM (VALUES
    ('admin', 'dashboard.view'),
    ('admin', 'donations.view'),
    ('admin', 'pledges.view'),
    ('admin', 'pledges.create'),
    ('admin', 'pledges.update'),
    ('admin', 'profiles.view'),
    ('admin', 'profiles.update'),
    ('admin', 'profiles.publish'),
    ('admin', 'mentors.view'),
    ('admin', 'mentors.update'),
    ('admin', 'newsletters.view'),
    ('admin', 'newsletters.create'),
    ('admin', 'newsletters.update'),
    ('admin', 'newsletters.send'),
    ('admin', 'stories.view'),
    ('admin', 'stories.create'),
    ('admin', 'stories.update'),
    ('admin', 'stories.publish'),
    ('staff', 'dashboard.view'),
    ('viewer', 'dashboard.view')
) AS preset(role, code)
JOIN public.permissions AS permission ON permission.code = preset.code
ON CONFLICT DO NOTHING;

-- Prevent direct removal/demotion/disablement of the final active super admin,
-- including changes made outside the application API.
CREATE OR REPLACE FUNCTION public.protect_final_active_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.role = 'super_admin' AND OLD.status = 'active'
       AND (TG_OP = 'DELETE' OR NEW.role <> 'super_admin' OR NEW.status <> 'active')
       AND (SELECT COUNT(*) FROM public.application_users
            WHERE role = 'super_admin' AND status = 'active' AND id <> OLD.id) = 0 THEN
        RAISE EXCEPTION 'The final active super admin cannot be removed, demoted, or disabled'
            USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_final_active_super_admin
    ON public.application_users;
CREATE TRIGGER protect_final_active_super_admin
BEFORE UPDATE OF role, status OR DELETE ON public.application_users
FOR EACH ROW EXECUTE FUNCTION public.protect_final_active_super_admin();

-- Audit data is append-only, even for the backend service role.
CREATE OR REPLACE FUNCTION public.prevent_audit_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are append-only' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_event_update ON public.audit_events;
DROP TRIGGER IF EXISTS prevent_audit_event_delete ON public.audit_events;
CREATE TRIGGER prevent_audit_event_update
BEFORE UPDATE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_mutation();
CREATE TRIGGER prevent_audit_event_delete
BEFORE DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_mutation();

-- Database-level effective-permission resolver used by the backend service.
CREATE OR REPLACE FUNCTION public.resolve_effective_permission_codes(requested_user_id UUID)
RETURNS TABLE(code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_role TEXT;
    target_status TEXT;
BEGIN
    SELECT role, status INTO target_role, target_status
    FROM public.application_users WHERE id = requested_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Application user not found' USING ERRCODE = 'P0002'; END IF;
    IF target_status <> 'active' THEN
        RAISE EXCEPTION 'Application user is not active' USING ERRCODE = '42501';
    END IF;
    IF target_role = 'super_admin' THEN
        RETURN QUERY SELECT permission.code FROM public.permissions AS permission ORDER BY permission.code;
        RETURN;
    END IF;
    RETURN QUERY
    SELECT DISTINCT effective.code
    FROM (
        SELECT permission.code
        FROM public.role_permissions AS role_permission
        JOIN public.permissions AS permission ON permission.id = role_permission.permission_id
        WHERE role_permission.role = target_role
        UNION
        SELECT permission.code
        FROM public.user_permission_overrides AS override_row
        JOIN public.permissions AS permission ON permission.id = override_row.permission_id
        WHERE override_row.user_id = requested_user_id AND override_row.effect = 'grant'
    ) AS effective
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_permission_overrides AS denied
        JOIN public.permissions AS denied_permission ON denied_permission.id = denied.permission_id
        WHERE denied.user_id = requested_user_id
          AND denied.effect = 'deny'
          AND denied_permission.code = effective.code
    )
    ORDER BY effective.code;
END;
$$;

-- Transactional role change plus audit event.
CREATE OR REPLACE FUNCTION public.rbac_set_user_role(
    actor_id UUID, target_id UUID, new_role TEXT, change_reason TEXT,
    event_request_id TEXT DEFAULT NULL, event_ip_hash TEXT DEFAULT NULL
)
RETURNS public.application_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor public.application_users%ROWTYPE; target public.application_users%ROWTYPE; updated public.application_users%ROWTYPE;
BEGIN
    SELECT * INTO actor FROM public.application_users WHERE id = actor_id FOR UPDATE;
    SELECT * INTO target FROM public.application_users WHERE id = target_id FOR UPDATE;
    IF actor.id IS NULL OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN RAISE EXCEPTION 'Super admin required' USING ERRCODE = '42501'; END IF;
    IF target.id IS NULL THEN RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0002'; END IF;
    IF new_role NOT IN ('super_admin', 'admin', 'staff', 'viewer') THEN RAISE EXCEPTION 'Unknown role'; END IF;
    IF length(btrim(COALESCE(change_reason, ''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
    UPDATE public.application_users SET role = new_role, permissions_version = permissions_version + 1
    WHERE id = target_id RETURNING * INTO updated;
    INSERT INTO public.audit_events(actor_user_id,target_user_id,action,entity_type,entity_id,before_state,after_state,reason,request_id,ip_hash,is_sensitive)
    VALUES(actor_id,target_id,'ROLE_CHANGED','application_user',target_id::TEXT,jsonb_build_object('role',target.role),jsonb_build_object('role',updated.role),btrim(change_reason),event_request_id,event_ip_hash,TRUE);
    RETURN updated;
END;
$$;

-- Transactional account-state change plus audit event.
CREATE OR REPLACE FUNCTION public.rbac_set_user_status(
    actor_id UUID, target_id UUID, new_status TEXT, change_reason TEXT,
    event_request_id TEXT DEFAULT NULL, event_ip_hash TEXT DEFAULT NULL
)
RETURNS public.application_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor public.application_users%ROWTYPE; target public.application_users%ROWTYPE; updated public.application_users%ROWTYPE; event_action TEXT;
BEGIN
    SELECT * INTO actor FROM public.application_users WHERE id = actor_id FOR UPDATE;
    SELECT * INTO target FROM public.application_users WHERE id = target_id FOR UPDATE;
    IF actor.id IS NULL OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN RAISE EXCEPTION 'Super admin required' USING ERRCODE = '42501'; END IF;
    IF target.id IS NULL THEN RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0002'; END IF;
    IF actor_id = target_id AND new_status <> 'active' THEN RAISE EXCEPTION 'A super admin cannot disable their own account' USING ERRCODE = '42501'; END IF;
    IF new_status NOT IN ('invited','active','disabled') THEN RAISE EXCEPTION 'Unknown account status'; END IF;
    IF length(btrim(COALESCE(change_reason, ''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
    UPDATE public.application_users SET status = new_status, activated_at = CASE WHEN new_status='active' THEN COALESCE(activated_at,NOW()) ELSE activated_at END, permissions_version = permissions_version + 1
    WHERE id = target_id RETURNING * INTO updated;
    event_action := CASE new_status WHEN 'active' THEN 'USER_ENABLED' WHEN 'disabled' THEN 'USER_DISABLED' ELSE 'USER_INVITED' END;
    INSERT INTO public.audit_events(actor_user_id,target_user_id,action,entity_type,entity_id,before_state,after_state,reason,request_id,ip_hash,is_sensitive)
    VALUES(actor_id,target_id,event_action,'application_user',target_id::TEXT,jsonb_build_object('status',target.status),jsonb_build_object('status',updated.status),btrim(change_reason),event_request_id,event_ip_hash,TRUE);
    RETURN updated;
END;
$$;

-- Replace all overrides for a user atomically and record one complete before/after event.
CREATE OR REPLACE FUNCTION public.rbac_replace_user_permission_overrides(
    actor_id UUID, target_id UUID, grant_codes TEXT[], deny_codes TEXT[], change_reason TEXT,
    event_request_id TEXT DEFAULT NULL, event_ip_hash TEXT DEFAULT NULL
)
RETURNS TABLE(code TEXT, effect TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor public.application_users%ROWTYPE; target public.application_users%ROWTYPE; before_value JSONB; after_value JSONB; unknown_count INTEGER;
BEGIN
    SELECT * INTO actor FROM public.application_users WHERE id = actor_id FOR UPDATE;
    SELECT * INTO target FROM public.application_users WHERE id = target_id FOR UPDATE;
    IF actor.id IS NULL OR actor.role <> 'super_admin' OR actor.status <> 'active' THEN RAISE EXCEPTION 'Super admin required' USING ERRCODE = '42501'; END IF;
    IF target.id IS NULL THEN RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0002'; END IF;
    IF target.role = 'super_admin' THEN RAISE EXCEPTION 'Super-admin permissions cannot be overridden' USING ERRCODE = '42501'; END IF;
    IF length(btrim(COALESCE(change_reason, ''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
    IF COALESCE(grant_codes, ARRAY[]::TEXT[]) && COALESCE(deny_codes, ARRAY[]::TEXT[]) THEN RAISE EXCEPTION 'A permission cannot be both granted and denied'; END IF;
    SELECT COUNT(*) INTO unknown_count FROM unnest(COALESCE(grant_codes,ARRAY[]::TEXT[]) || COALESCE(deny_codes,ARRAY[]::TEXT[])) requested(code)
    LEFT JOIN public.permissions permission ON permission.code=requested.code WHERE permission.id IS NULL;
    IF unknown_count > 0 THEN RAISE EXCEPTION 'One or more permission codes are unknown'; END IF;
    IF EXISTS (SELECT 1 FROM public.permissions AS permission WHERE permission.code=ANY(COALESCE(grant_codes,ARRAY[]::TEXT[]) || COALESCE(deny_codes,ARRAY[]::TEXT[])) AND permission.is_system_only) THEN RAISE EXCEPTION 'System-only permissions cannot be assigned as overrides' USING ERRCODE='42501'; END IF;
    IF target.role='viewer' AND EXISTS (SELECT 1 FROM public.permissions AS permission WHERE permission.code=ANY(COALESCE(grant_codes,ARRAY[]::TEXT[])) AND permission.action <> 'view') THEN RAISE EXCEPTION 'Viewer overrides must remain read-only' USING ERRCODE='42501'; END IF;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('code',permission.code,'effect',override_row.effect) ORDER BY permission.code),'[]'::JSONB) INTO before_value
    FROM public.user_permission_overrides override_row JOIN public.permissions permission ON permission.id=override_row.permission_id WHERE override_row.user_id=target_id;
    DELETE FROM public.user_permission_overrides WHERE user_id=target_id;
    INSERT INTO public.user_permission_overrides(user_id,permission_id,effect,granted_by,reason)
    SELECT target_id,permission.id,'grant',actor_id,btrim(change_reason) FROM public.permissions permission WHERE permission.code=ANY(COALESCE(grant_codes,ARRAY[]::TEXT[]))
    UNION ALL
    SELECT target_id,permission.id,'deny',actor_id,btrim(change_reason) FROM public.permissions permission WHERE permission.code=ANY(COALESCE(deny_codes,ARRAY[]::TEXT[]));
    UPDATE public.application_users SET permissions_version=permissions_version+1 WHERE id=target_id;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('code',permission.code,'effect',override_row.effect) ORDER BY permission.code),'[]'::JSONB) INTO after_value
    FROM public.user_permission_overrides override_row JOIN public.permissions permission ON permission.id=override_row.permission_id WHERE override_row.user_id=target_id;
    INSERT INTO public.audit_events(actor_user_id,target_user_id,action,entity_type,entity_id,before_state,after_state,reason,request_id,ip_hash,is_sensitive)
    SELECT actor_id,target_id,CASE override_row.effect WHEN 'grant' THEN 'PERMISSION_GRANTED' ELSE 'PERMISSION_DENIED' END,
           'permission',permission.code,NULL,jsonb_build_object('effect',override_row.effect),btrim(change_reason),event_request_id,event_ip_hash,permission.is_sensitive
    FROM public.user_permission_overrides override_row
    JOIN public.permissions permission ON permission.id=override_row.permission_id
    WHERE override_row.user_id=target_id
      AND NOT (before_value @> jsonb_build_array(jsonb_build_object('code',permission.code,'effect',override_row.effect)));
    INSERT INTO public.audit_events(actor_user_id,target_user_id,action,entity_type,entity_id,before_state,after_state,reason,request_id,ip_hash,is_sensitive)
    VALUES(actor_id,target_id,CASE WHEN after_value='[]'::JSONB THEN 'PERMISSIONS_RESET' ELSE 'PERMISSIONS_CHANGED' END,'application_user',target_id::TEXT,before_value,after_value,btrim(change_reason),event_request_id,event_ip_hash,TRUE);
    RETURN QUERY SELECT permission.code,override_row.effect FROM public.user_permission_overrides override_row JOIN public.permissions permission ON permission.id=override_row.permission_id WHERE override_row.user_id=target_id ORDER BY permission.code;
END;
$$;

-- Store an invitation and its audit event in one database transaction. The
-- Supabase Auth invitation is created immediately before this RPC; the API
-- removes that Auth user if this transaction fails.
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
    INSERT INTO public.application_users(auth_user_id,name,email,role,status,invited_at,invited_by)
    VALUES(invited_auth_user_id,btrim(invited_name),lower(btrim(invited_email)),invited_role,'invited',NOW(),actor_id)
    RETURNING * INTO invited;
    INSERT INTO public.audit_events(actor_user_id,target_user_id,action,entity_type,entity_id,after_state,reason,request_id,is_sensitive)
    VALUES(actor_id,invited.id,'USER_INVITED','application_user',invited.id::TEXT,
           jsonb_build_object('email',invited.email,'role',invited.role,'status',invited.status),
           'User invitation created',event_request_id,TRUE);
    RETURN invited;
END;
$$;

-- Invitation completion is atomic with its activation audit event. Active
-- accounts are returned unchanged so this remains compatible with recovery.
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
    IF target.id IS NULL THEN RAISE EXCEPTION 'Application user not found' USING ERRCODE = 'P0002'; END IF;
    IF target.status = 'disabled' THEN RAISE EXCEPTION 'Account is disabled' USING ERRCODE = '42501'; END IF;
    IF target.status = 'active' THEN RETURN target; END IF;
    UPDATE public.application_users
    SET status='active', activated_at=NOW(), permissions_version=permissions_version+1
    WHERE id=target.id RETURNING * INTO activated;
    INSERT INTO public.audit_events(target_user_id,action,entity_type,entity_id,before_state,after_state,reason,request_id,is_sensitive)
    VALUES(target.id,'USER_ACTIVATED','application_user',target.id::TEXT,
           jsonb_build_object('status',target.status),jsonb_build_object('status',activated.status),
           'Invitation accepted',event_request_id,TRUE);
    RETURN activated;
END;
$$;

-- Permanently revoke application access and preserve the security event. The
-- API subsequently removes the Supabase Auth identity using the returned ID.
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
    IF target.id IS NULL THEN RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0002'; END IF;
    IF actor_id = target_id THEN RAISE EXCEPTION 'A super admin cannot delete their own account' USING ERRCODE = '42501'; END IF;
    IF lower(target.email) NOT IN ('ibrabdifx@gmail.com','piezo5go@gmail.com','kiboileslie@gmail.com') THEN
        RAISE EXCEPTION 'This account is not approved for permanent deletion' USING ERRCODE = '42501';
    END IF;
    IF length(btrim(COALESCE(delete_reason, ''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
    INSERT INTO public.audit_events(actor_user_id,target_user_id,action,entity_type,entity_id,before_state,reason,request_id,is_sensitive)
    VALUES(actor_id,target.id,'USER_DELETED','application_user',target.id::TEXT,
           jsonb_build_object('name',target.name,'email',target.email,'role',target.role,'status',target.status),
           btrim(delete_reason),event_request_id,TRUE);
    DELETE FROM public.application_users WHERE id=target.id;
    RETURN target.auth_user_id;
END;
$$;

-- Direct browser roles cannot access RBAC or audit data. FastAPI is authoritative.
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.permissions, public.role_permissions, public.user_permission_overrides, public.audit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.permissions, public.role_permissions, public.user_permission_overrides, public.audit_events TO service_role;
GRANT INSERT ON TABLE public.user_permission_overrides, public.audit_events TO service_role;
GRANT UPDATE, DELETE ON TABLE public.user_permission_overrides TO service_role;
GRANT UPDATE ON TABLE public.application_users TO service_role;

REVOKE ALL ON FUNCTION public.resolve_effective_permission_codes(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rbac_set_user_role(UUID,UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rbac_set_user_status(UUID,UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rbac_replace_user_permission_overrides(UUID,UUID,TEXT[],TEXT[],TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rbac_create_invited_application_user(UUID,UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rbac_activate_invited_user(UUID,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rbac_delete_application_user(UUID,UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_effective_permission_codes(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_set_user_role(UUID,UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_set_user_status(UUID,UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_replace_user_permission_overrides(UUID,UUID,TEXT[],TEXT[],TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_create_invited_application_user(UUID,UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_activate_invited_user(UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rbac_delete_application_user(UUID,UUID,TEXT,TEXT) TO service_role;

COMMIT;
