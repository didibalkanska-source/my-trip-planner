ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS is_event boolean NOT NULL DEFAULT false;