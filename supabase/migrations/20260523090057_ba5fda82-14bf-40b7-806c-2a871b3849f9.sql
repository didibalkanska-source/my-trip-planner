ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS has_other_booking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vacation_requested boolean NOT NULL DEFAULT false;