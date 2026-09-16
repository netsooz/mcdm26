-- CKR Decision Platform — auth-adjacent tables.
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).

-- ────────────────────────────────────────────────────────────────
-- profiles: business/researcher details captured by the download gate
-- ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  email             text,
  full_name         text,
  profile_type      text not null check (profile_type in ('business', 'researcher')),
  company_name      text,
  industry          text,
  employee_range    text,
  university_name   text,
  country           text,
  state             text,
  marketing_consent boolean not null default false,
  terms_accepted_at timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- payments: one row per Razorpay order
-- ────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  email               text,
  plan_id             text not null,
  razorpay_order_id   text not null unique,
  razorpay_payment_id text,
  amount              integer not null,           -- paise
  currency            text not null default 'INR',
  status              text not null default 'created',  -- created | captured | failed
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);

alter table public.payments enable row level security;

-- Users may read their own payments. All writes go through the service-role
-- key from the server routes, which bypasses RLS — no client write policy.
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- subscriptions: current entitlement per user
-- ────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  plan_id            text not null,
  status             text not null default 'active',   -- active | expired | cancelled
  current_period_end timestamptz,
  latest_payment_id  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
