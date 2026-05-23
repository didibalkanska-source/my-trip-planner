
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  total_vacation_days int not null default 20,
  year int not null default extract(year from now())::int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  transport text not null,
  flight_time timestamptz,
  start_date date not null,
  end_date date not null,
  planned_budget numeric(12,2) not null default 0,
  actual_budget numeric(12,2) not null default 0,
  uses_vacation boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips enable row level security;

create policy "Users view own trips" on public.trips for select using (auth.uid() = user_id);
create policy "Users insert own trips" on public.trips for insert with check (auth.uid() = user_id);
create policy "Users update own trips" on public.trips for update using (auth.uid() = user_id);
create policy "Users delete own trips" on public.trips for delete using (auth.uid() = user_id);

create index trips_user_start_idx on public.trips(user_id, start_date);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trips_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
