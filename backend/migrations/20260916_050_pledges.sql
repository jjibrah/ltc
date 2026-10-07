-- Public pledge interest submissions with private review and controlled publication.

CREATE TABLE IF NOT EXISTS public.pledges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    organization TEXT,
    pledge_type TEXT NOT NULL DEFAULT 'individual' CHECK (pledge_type IN ('individual', 'organization')),
    email TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
    frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time', 'monthly')),
    message TEXT,
    consent_to_publish BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'withdrawn')),
    admin_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.application_users(id) ON DELETE SET NULL,
    fulfilled_at TIMESTAMPTZ,
    linked_donation_session_id UUID REFERENCES public.donation_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pledges_status_created_at
    ON public.pledges (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pledges_email
    ON public.pledges (email);

DROP TRIGGER IF EXISTS update_pledges_updated_at ON public.pledges;
CREATE TRIGGER update_pledges_updated_at
BEFORE UPDATE ON public.pledges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledges FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pledges FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pledges TO service_role;
