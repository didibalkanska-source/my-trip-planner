ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS airline text,
  ADD COLUMN IF NOT EXISTS has_flight_booking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flight_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_accommodation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accommodation_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_car_rental boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS car_cost numeric NOT NULL DEFAULT 0;