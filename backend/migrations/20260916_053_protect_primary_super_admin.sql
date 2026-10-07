-- Keep the primary LTC super admin account permanently assigned to super_admin.
-- Apply this migration in Supabase after the RBAC migrations.

CREATE OR REPLACE FUNCTION public.prevent_primary_super_admin_demotion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND lower(btrim(OLD.email)) = 'ibrabdi@gmail.com'
       AND lower(btrim(NEW.email)) <> 'ibrabdi@gmail.com' THEN
        RAISE EXCEPTION 'The primary super admin email cannot be changed.'
            USING ERRCODE = '42501';
    END IF;
    IF (TG_OP = 'UPDATE' AND lower(btrim(OLD.email)) = 'ibrabdi@gmail.com'
        OR lower(btrim(NEW.email)) = 'ibrabdi@gmail.com')
       AND NEW.role <> 'super_admin' THEN
        RAISE EXCEPTION 'The primary super admin account cannot be assigned another role.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_primary_super_admin_role
    ON public.application_users;

CREATE TRIGGER protect_primary_super_admin_role
BEFORE INSERT OR UPDATE OF email, role ON public.application_users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_primary_super_admin_demotion();

UPDATE public.application_users
SET role = 'super_admin'
WHERE lower(btrim(email)) = 'ibrabdi@gmail.com'
  AND role <> 'super_admin';
