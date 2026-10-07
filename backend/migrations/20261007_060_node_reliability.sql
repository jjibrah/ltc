-- REVIEW ONLY. Never executed automatically. Requires the complete existing schema.
BEGIN;

-- Serialize ledger updates by donation relationship; preserve settlement/refund state.
CREATE OR REPLACE FUNCTION public.ltc_record_payment(session_id uuid, intent_id text,
 charge_id text, invoice_id text, amount_value numeric, payment_status text, payment_time timestamptz)
RETURNS SETOF public.donation_payments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old public.donation_payments; result public.donation_payments;
BEGIN
 PERFORM 1 FROM public.donation_sessions WHERE id=session_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Donation session not found'; END IF;
 IF payment_status NOT IN ('succeeded','failed') OR amount_value<0 THEN RAISE EXCEPTION 'Invalid payment'; END IF;
 SELECT * INTO old FROM public.donation_payments p WHERE
 (invoice_id IS NOT NULL AND p.stripe_invoice_id=invoice_id) OR
 (intent_id IS NOT NULL AND p.stripe_payment_intent_id=intent_id) OR
 (charge_id IS NOT NULL AND p.stripe_charge_id=charge_id) FOR UPDATE;
 IF FOUND THEN
  IF old.donation_session_id<>session_id OR old.currency<>'usd' THEN RAISE EXCEPTION 'Payment relationship mismatch'; END IF;
  IF old.status IN ('succeeded','partially_refunded','refunded') AND payment_status='failed' THEN RETURN NEXT old; RETURN; END IF;
  UPDATE public.donation_payments p SET
    stripe_payment_intent_id=COALESCE(intent_id,p.stripe_payment_intent_id),
    stripe_charge_id=COALESCE(charge_id,p.stripe_charge_id),
    stripe_invoice_id=COALESCE(invoice_id,p.stripe_invoice_id),
    gross_amount=amount_value,
    status=CASE WHEN old.refunded_amount>0 THEN CASE WHEN old.refunded_amount>=amount_value THEN 'refunded' ELSE 'partially_refunded' END ELSE payment_status END,
    paid_at=COALESCE(payment_time,p.paid_at)
  WHERE p.id=old.id RETURNING * INTO result;
 ELSE
  INSERT INTO public.donation_payments(donation_session_id,stripe_payment_intent_id,stripe_charge_id,stripe_invoice_id,gross_amount,currency,status,paid_at)
  VALUES(session_id,intent_id,charge_id,invoice_id,amount_value,'usd',payment_status,payment_time) RETURNING * INTO result;
 END IF;
 RETURN NEXT result;
END $$;

CREATE OR REPLACE FUNCTION public.ltc_record_refund(payment_id uuid, refund_value numeric, charge_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old public.donation_payments;
BEGIN
 SELECT * INTO old FROM public.donation_payments WHERE id=payment_id FOR UPDATE;
 IF NOT FOUND OR refund_value<0 OR refund_value>old.gross_amount THEN RAISE EXCEPTION 'Invalid refund'; END IF;
 UPDATE public.donation_payments SET stripe_charge_id=charge_id,refunded_amount=GREATEST(old.refunded_amount,refund_value),
 status=CASE WHEN GREATEST(old.refunded_amount,refund_value)>=old.gross_amount THEN 'refunded'
 WHEN GREATEST(old.refunded_amount,refund_value)>0 THEN 'partially_refunded' ELSE 'succeeded' END WHERE id=payment_id;
END $$;

CREATE OR REPLACE FUNCTION public.ltc_manual_donation(actor_id uuid, donation_values jsonb, event_request_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE session public.donation_sessions; payment public.donation_payments;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.application_users WHERE id=actor_id AND status='active' AND role='super_admin') THEN RAISE EXCEPTION 'Super admin access required'; END IF;
 INSERT INTO public.donation_sessions(donor_name,donor_email,requested_amount,currency,frequency,status,anonymous,message,payment_source,manual_reference,recorded_by)
 VALUES(donation_values->>'donor_name',donation_values->>'donor_email',(donation_values->>'amount')::numeric,'usd',donation_values->>'frequency','completed',COALESCE((donation_values->>'anonymous')::boolean,true),donation_values->>'message','manual',donation_values->>'manual_reference',actor_id) RETURNING * INTO session;
 INSERT INTO public.donation_payments(donation_session_id,gross_amount,currency,status,paid_at,payment_source)
 VALUES(session.id,session.requested_amount,'usd','succeeded',(donation_values->>'donated_at')::timestamptz,'manual') RETURNING * INTO payment;
 INSERT INTO public.audit_events(actor_user_id,action,entity_type,entity_id,after_state,reason,request_id,is_sensitive)
 VALUES(actor_id,'MANUAL_DONATION_CREATED','donation',session.id::text,jsonb_build_object('amount',session.requested_amount,'currency','usd'),'Historical donation entered by super admin',event_request_id,true);
 RETURN to_jsonb(session)||jsonb_build_object('donated_at',payment.paid_at,'payment_status',payment.status);
END $$;

CREATE OR REPLACE FUNCTION public.ltc_donation_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('total_collected',COALESCE((SELECT SUM(gross_amount-refunded_amount) FROM donation_payments WHERE currency='usd' AND status IN('succeeded','partially_refunded','refunded')),0),
 'completed', (SELECT count(*) FROM donation_payments WHERE currency='usd' AND status IN('succeeded','partially_refunded','refunded')),
 'monthly',(SELECT count(*) FROM donation_sessions WHERE frequency='monthly' AND status='completed'),
 'attempts',(SELECT count(*) FROM donation_sessions),'currency','usd');
$$;
CREATE OR REPLACE FUNCTION public.ltc_donation_progress() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('total_collected',COALESCE((SELECT SUM(gross_amount-refunded_amount) FROM donation_payments WHERE currency='usd' AND status IN('succeeded','partially_refunded','refunded')),0),
 'successful_payment_count',(SELECT count(*) FROM donation_payments WHERE currency='usd' AND status IN('succeeded','partially_refunded','refunded')),
 'pledged_amount',COALESCE((SELECT SUM(amount) FROM pledges WHERE status='approved' AND currency='usd'),0)+COALESCE((SELECT SUM(requested_amount) FROM donation_sessions WHERE frequency='monthly' AND status='completed' AND currency='usd'),0),
 'pledge_count',(SELECT count(*) FROM pledges WHERE status='approved' AND currency='usd')+(SELECT count(*) FROM donation_sessions WHERE frequency='monthly' AND status='completed' AND currency='usd'),'currency','usd');
$$;

CREATE OR REPLACE FUNCTION public.ltc_reorder_profiles(profile_ids uuid[]) RETURNS SETOF public.team_profiles
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF cardinality(profile_ids)<1 OR cardinality(profile_ids)>200 OR
 (SELECT count(DISTINCT x) FROM unnest(profile_ids) x)<>cardinality(profile_ids) THEN RAISE EXCEPTION 'Invalid profile order'; END IF;
 PERFORM id FROM public.team_profiles WHERE id=ANY(profile_ids) ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM public.team_profiles WHERE id=ANY(profile_ids))<>cardinality(profile_ids) THEN RAISE EXCEPTION 'Team profile not found'; END IF;
 UPDATE public.team_profiles p SET display_order=x.ordinality-1 FROM unnest(profile_ids) WITH ORDINALITY x(id,ordinality) WHERE p.id=x.id;
 RETURN QUERY SELECT * FROM public.team_profiles WHERE id=ANY(profile_ids) ORDER BY display_order;
END $$;

CREATE OR REPLACE FUNCTION public.ltc_submit_profile(token_digest text,profile_values jsonb) RETURNS public.team_profiles
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE link public.profile_submission_links; result public.team_profiles;
BEGIN
 SELECT * INTO link FROM public.profile_submission_links WHERE token_hash=token_digest FOR UPDATE;
 IF NOT FOUND OR link.revoked_at IS NOT NULL OR link.expires_at<=now() THEN RAISE EXCEPTION 'Invalid or expired submission link'; END IF;
 IF (SELECT count(*) FROM public.team_profiles WHERE submission_link_id=link.id)>=100 THEN RAISE EXCEPTION 'This submission link has reached its 100-profile limit'; END IF;
 INSERT INTO public.team_profiles(submission_link_id,name,email,role,department,quote,bio,status)
 VALUES(link.id,profile_values->>'name',profile_values->>'email',profile_values->>'role',profile_values->>'department',profile_values->>'quote',profile_values->>'bio','pending') RETURNING * INTO result;
 RETURN result;
END $$;

-- Durable frozen newsletters; SQS messages contain only a job UUID.
CREATE TABLE public.delivery_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), newsletter_id uuid NOT NULL REFERENCES public.newsletters(id) ON DELETE RESTRICT,
 snapshot jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','processing','completed','failed')),
 lease_token uuid,lease_until timestamptz,dispatched_at timestamptz,attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,last_error text
);
CREATE UNIQUE INDEX delivery_jobs_one_active ON public.delivery_jobs(newsletter_id) WHERE status IN('pending','processing');
CREATE TABLE public.delivery_recipients (
 job_id uuid NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE RESTRICT,
 subscriber_id uuid NOT NULL, email text NOT NULL,unsubscribe_token text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','failed','suppressed','unknown')),
 provider_id text,first_attempt_at timestamptz,attempts integer NOT NULL DEFAULT 0,
 PRIMARY KEY(job_id,subscriber_id)
);
ALTER TABLE public.delivery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_recipients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_jobs,public.delivery_recipients FROM anon,authenticated;
GRANT ALL ON public.delivery_jobs,public.delivery_recipients TO service_role;

CREATE OR REPLACE FUNCTION public.ltc_accept_newsletter(target_id uuid) RETURNS public.delivery_jobs
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE newsletter public.newsletters; job public.delivery_jobs; recipient_total integer;
BEGIN
 SELECT * INTO newsletter FROM public.newsletters WHERE id=target_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Newsletter not found'; END IF;
 IF newsletter.status='sending' THEN SELECT * INTO job FROM public.delivery_jobs WHERE newsletter_id=target_id AND status IN('pending','processing'); IF FOUND THEN RETURN job; END IF; END IF;
 IF newsletter.status NOT IN ('draft','failed') OR btrim(newsletter.title)='' OR btrim(newsletter.body_html)='' THEN RAISE EXCEPTION 'Newsletter cannot be sent'; END IF;
 IF EXISTS(SELECT 1 FROM public.delivery_recipients r JOIN public.delivery_jobs j ON j.id=r.job_id WHERE j.newsletter_id=target_id AND r.status IN('accepted','unknown')) THEN RAISE EXCEPTION 'Prior send needs reconciliation before retry'; END IF;
 INSERT INTO public.delivery_jobs(newsletter_id,snapshot) VALUES(target_id,to_jsonb(newsletter)||jsonb_build_object('attachments',COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.newsletter_attachments a WHERE a.newsletter_id=target_id),'[]'::jsonb))) RETURNING * INTO job;
 INSERT INTO public.delivery_recipients(job_id,subscriber_id,email,unsubscribe_token) SELECT job.id,id,email,unsubscribe_token FROM public.subscribers WHERE status='subscribed';
 GET DIAGNOSTICS recipient_total=ROW_COUNT;
 UPDATE public.newsletters SET status='sending',recipient_count=recipient_total,sent_count=0,failed_count=0,send_error=NULL WHERE id=target_id;
 RETURN job;
END $$;

CREATE OR REPLACE FUNCTION public.ltc_claim_job(job_id uuid,claim_token uuid) RETURNS SETOF public.delivery_jobs
 LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.delivery_jobs SET status='processing',lease_token=claim_token,lease_until=now()+interval '5 minutes',attempts=attempts+1
 WHERE id=job_id AND (status='pending' OR (status='processing' AND lease_until<now())) RETURNING *;
$$;
CREATE OR REPLACE FUNCTION public.ltc_complete_job(job_id uuid,claim_token uuid) RETURNS boolean
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid; failures integer; successes integer;
BEGIN
 SELECT newsletter_id INTO target FROM public.delivery_jobs WHERE id=job_id AND lease_token=claim_token AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.delivery_recipients WHERE delivery_recipients.job_id=ltc_complete_job.job_id AND status='pending') THEN RETURN false; END IF;
 SELECT count(*) FILTER(WHERE status IN('failed','unknown')),count(*) FILTER(WHERE status='accepted') INTO failures,successes FROM public.delivery_recipients WHERE delivery_recipients.job_id=ltc_complete_job.job_id;
 UPDATE public.delivery_jobs SET status=CASE WHEN failures>0 THEN 'failed' ELSE 'completed' END,completed_at=now(),lease_until=NULL WHERE id=job_id;
 UPDATE public.newsletters SET status=CASE WHEN failures>0 THEN 'failed' ELSE 'sent' END,sent_count=successes,failed_count=failures,sent_at=CASE WHEN failures=0 THEN now() ELSE NULL END,send_error=CASE WHEN failures>0 THEN 'Some recipients failed or need provider reconciliation' ELSE NULL END WHERE id=target;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.ltc_dashboard_summary(include_donations boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('generated_at',now(),
 'users',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE status='active'),'invited',count(*) FILTER(WHERE status='invited')) FROM application_users),
 'team_profiles',(SELECT jsonb_build_object('total',count(*),'pending',count(*) FILTER(WHERE status='pending'),'changes_requested',count(*) FILTER(WHERE status='changes_requested'),'published',count(*) FILTER(WHERE status='published')) FROM team_profiles),
 'mentors',(SELECT jsonb_build_object('total',count(*),'pending',count(*) FILTER(WHERE status='pending'),'under_review',count(*) FILTER(WHERE status='under_review')) FROM mentor_applications),
 'newsletters',(SELECT jsonb_build_object('total',count(*),'draft',count(*) FILTER(WHERE status='draft'),'scheduled',count(*) FILTER(WHERE status='scheduled'),'sent',count(*) FILTER(WHERE status='sent')) FROM newsletters),
 'subscribers',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE status='subscribed')) FROM subscribers),
 'stories',(SELECT jsonb_build_object('total',count(*),'published',count(*) FILTER(WHERE is_published),'draft',count(*) FILTER(WHERE NOT is_published)) FROM stories))
 || CASE WHEN include_donations THEN jsonb_build_object('donations', public.ltc_donation_summary()||jsonb_build_object('pending',(SELECT count(*) FROM donation_sessions WHERE status='pending'))) ELSE '{}'::jsonb END;
$$;
REVOKE ALL ON FUNCTION public.ltc_dashboard_summary(boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ltc_dashboard_summary(boolean) TO service_role;

-- Serialize upload metadata with send acceptance and enforce aggregate limits.
CREATE OR REPLACE FUNCTION public.ltc_guard_attachments() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE target uuid; current_status text; current_bytes bigint;
BEGIN
 target=CASE WHEN TG_OP='DELETE' THEN OLD.newsletter_id ELSE NEW.newsletter_id END;
 SELECT status INTO current_status FROM public.newsletters WHERE id=target FOR UPDATE;
 IF current_status NOT IN ('draft','failed','cancelled') THEN RAISE EXCEPTION 'Accepted newsletter content is frozen'; END IF;
 IF TG_OP<>'DELETE' THEN
  SELECT COALESCE(sum(size_bytes),0) INTO current_bytes FROM public.newsletter_attachments WHERE newsletter_id=target AND id<>NEW.id;
  IF current_bytes+NEW.size_bytes>20971520 THEN RAISE EXCEPTION 'Total attachments would exceed 20 MB limit'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER ltc_guard_attachments BEFORE INSERT OR UPDATE OR DELETE ON public.newsletter_attachments FOR EACH ROW EXECUTE FUNCTION public.ltc_guard_attachments();
REVOKE ALL ON FUNCTION public.ltc_guard_attachments() FROM PUBLIC,anon,authenticated;

-- Revoke default PUBLIC execution; only the server service role calls these RPCs.
REVOKE ALL ON FUNCTION public.ltc_record_payment(uuid,text,text,text,numeric,text,timestamptz),public.ltc_record_refund(uuid,numeric,text),public.ltc_manual_donation(uuid,jsonb,text),public.ltc_donation_summary(),public.ltc_donation_progress(),public.ltc_reorder_profiles(uuid[]),public.ltc_submit_profile(text,jsonb),public.ltc_accept_newsletter(uuid),public.ltc_claim_job(uuid,uuid),public.ltc_complete_job(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ltc_record_payment(uuid,text,text,text,numeric,text,timestamptz),public.ltc_record_refund(uuid,numeric,text),public.ltc_manual_donation(uuid,jsonb,text),public.ltc_donation_summary(),public.ltc_donation_progress(),public.ltc_reorder_profiles(uuid[]),public.ltc_submit_profile(text,jsonb),public.ltc_accept_newsletter(uuid),public.ltc_claim_job(uuid,uuid),public.ltc_complete_job(uuid,uuid) TO service_role;
COMMIT;
