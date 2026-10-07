-- Add the pledge type to databases where the initial pledges migration was
-- already applied before Individual/Organization support was introduced.

ALTER TABLE public.pledges
    ADD COLUMN IF NOT EXISTS pledge_type TEXT NOT NULL DEFAULT 'individual';

ALTER TABLE public.pledges
    DROP CONSTRAINT IF EXISTS pledges_pledge_type_check;

ALTER TABLE public.pledges
    ADD CONSTRAINT pledges_pledge_type_check
    CHECK (pledge_type IN ('individual', 'organization'));

NOTIFY pgrst, 'reload schema';
