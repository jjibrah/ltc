-- MANUAL ONLY. Never run from startup, CI, tests, workers or deployment.
-- Target must be explicitly confirmed by the owner before execution.
BEGIN;
CREATE TABLE public.service_billing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    category text NOT NULL CHECK (category IN ('hosting','email','domain','workspace','other')),
    owner text NOT NULL DEFAULT '' CHECK (length(owner) <= 120),
    amount numeric(11,2) CHECK (amount >= 0),
    currency text NOT NULL CHECK (currency IN ('USD','KES','EUR','GBP')),
    cycle text NOT NULL CHECK (cycle IN ('monthly','quarterly','annual','one_time','usage_based')),
    next_due_date date,
    portal_url text NOT NULL DEFAULT '' CHECK (length(portal_url) <= 1000),
    notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
    active boolean NOT NULL DEFAULT true,
    created_by uuid REFERENCES public.application_users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_billing_due_idx ON public.service_billing(next_due_date) WHERE active;
CREATE TABLE public.service_billing_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.service_billing(id) ON DELETE RESTRICT,
    amount numeric(11,2) NOT NULL CHECK (amount >= 0),
    currency text NOT NULL CHECK (currency IN ('USD','KES','EUR','GBP')),
    paid_on date NOT NULL,
    next_due_date date,
    reference text NOT NULL DEFAULT '' CHECK (length(reference) <= 120),
    recorded_by uuid REFERENCES public.application_users(id) ON DELETE SET NULL,
    idempotency_key uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_billing_payments_service_idx ON public.service_billing_payments(service_id,paid_on DESC);
CREATE TABLE public.operations_settings (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    analytics_provider text NOT NULL DEFAULT 'none' CHECK (analytics_provider IN ('none','google_analytics','plausible','other')),
    analytics_dashboard_url text NOT NULL DEFAULT '' CHECK (length(analytics_dashboard_url) <= 1000),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_billing,public.service_billing_payments,public.operations_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.service_billing,public.operations_settings TO service_role;
GRANT SELECT,INSERT ON public.service_billing_payments TO service_role;
CREATE FUNCTION public.ltc_record_service_payment(
    service_uuid uuid, actor_uuid uuid, paid_amount numeric, paid_currency text,
    payment_date date, following_due_date date, payment_reference text,
    expected_version timestamptz, submission_key uuid, event_request_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public,pg_temp AS $$
DECLARE service_row public.service_billing%ROWTYPE; payment_row public.service_billing_payments%ROWTYPE;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.application_users WHERE id=actor_uuid AND role='super_admin' AND status='active') THEN
        RAISE EXCEPTION 'Super admin access required' USING ERRCODE='42501';
    END IF;
    SELECT * INTO service_row FROM public.service_billing WHERE id=service_uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Service unavailable' USING ERRCODE='40001'; END IF;
    SELECT * INTO payment_row FROM public.service_billing_payments WHERE idempotency_key=submission_key;
    IF FOUND THEN
        IF payment_row.service_id <> service_uuid OR payment_row.amount <> paid_amount OR payment_row.currency <> paid_currency OR payment_row.paid_on <> payment_date OR payment_row.reference <> payment_reference OR payment_row.next_due_date IS DISTINCT FROM following_due_date THEN
            RAISE EXCEPTION 'Submission key reused for another payment' USING ERRCODE='40001';
        END IF;
        RETURN jsonb_build_object('payment',to_jsonb(payment_row),'service',to_jsonb(service_row));
    END IF;
    IF NOT service_row.active THEN RAISE EXCEPTION 'Service unavailable' USING ERRCODE='40001'; END IF;
    IF service_row.updated_at <> expected_version THEN RAISE EXCEPTION 'Stale service version' USING ERRCODE='40001'; END IF;
    IF paid_currency <> service_row.currency OR paid_amount IS NULL OR paid_amount < 0 OR paid_amount > 999999999.99 OR paid_amount <> round(paid_amount,2) OR payment_date IS NULL OR (following_due_date IS NOT NULL AND following_due_date <= payment_date) THEN
        RAISE EXCEPTION 'Invalid payment details' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.service_billing_payments(service_id,amount,currency,paid_on,next_due_date,reference,recorded_by,idempotency_key)
    VALUES(service_uuid,paid_amount,paid_currency,payment_date,following_due_date,payment_reference,actor_uuid,submission_key) RETURNING * INTO payment_row;
    UPDATE public.service_billing SET next_due_date=following_due_date,updated_at=clock_timestamp() WHERE id=service_uuid RETURNING * INTO service_row;
    INSERT INTO public.audit_events(actor_user_id,action,entity_type,entity_id,reason,request_id,after_state)
    VALUES(actor_uuid,'BILLING_PAYMENT_RECORDED','service_billing',service_uuid::text,'External service payment recorded; no payment initiated',event_request_id,jsonb_build_object('payment_id',payment_row.id,'amount',paid_amount,'currency',paid_currency,'paid_on',payment_date,'next_due_date',following_due_date));
    RETURN jsonb_build_object('payment',to_jsonb(payment_row),'service',to_jsonb(service_row));
END;
$$;
REVOKE ALL ON FUNCTION public.ltc_record_service_payment(uuid,uuid,numeric,text,date,date,text,timestamptz,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ltc_record_service_payment(uuid,uuid,numeric,text,date,date,text,timestamptz,uuid,text) TO service_role;
COMMIT;
