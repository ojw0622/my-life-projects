-- =====================================================================
-- My Life Dashboard — Supabase schema (v2)
--
-- Modules
--   * Capital : portfolios, cash_flows, capital_settings
--   * Mind    : essays, principles
--   * Body    : workouts, runs
--   * Tower   : tower_docs (지원 관제탑, document store)
--
-- Every table carries a user_id (defaults to auth.uid()) and has Row Level
-- Security enabled with owner-only policies: a signed-in user can only
-- read and write their own rows; anonymous requests see nothing.
--
-- The script is idempotent and can be re-run in the Supabase SQL editor.
-- v1 tables are left untouched; see the cleanup block at the end.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- Capital module
-- =====================================================================

-- One row per asset. Weights and tolerance are fractions (0.03 = 3%p).
create table if not exists public.portfolios (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  asset_name     text not null check (char_length(asset_name) between 1 and 100),
  ticker         text check (ticker is null or char_length(ticker) between 1 and 20),
  -- 지수ETF / 개별주 / 채권 / 원자재 / 코인 / 현금 / 기타
  category       text not null default 'index_etf'
                 check (category in ('index_etf', 'stock', 'bond', 'commodity', 'crypto', 'cash', 'other')),
  currency       text not null default 'KRW' check (currency in ('KRW', 'USD')),
  target_ratio   numeric(7, 6) not null default 0 check (target_ratio between 0 and 1),
  current_qty    numeric(24, 8) not null default 0 check (current_qty >= 0),
  avg_buy_price  numeric(20, 4) not null default 0 check (avg_buy_price >= 0),
  current_price  numeric(20, 4) not null default 0 check (current_price >= 0),
  tolerance_band numeric(5, 4) not null default 0.03 check (tolerance_band between 0 and 1),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, asset_name)
);

create index if not exists portfolios_user_id_idx on public.portfolios (user_id);

-- 저축 / 배당 입금 기록 (KRW).
create table if not exists public.cash_flows (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount     numeric(20, 2) not null check (amount > 0),
  flow_type  text not null check (flow_type in ('saving', 'dividend')),
  date       date not null default current_date,
  note       text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists cash_flows_user_date_idx on public.cash_flows (user_id, date desc);

-- Per-user settings needed to value USD assets in KRW.
create table if not exists public.capital_settings (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  usd_krw_rate numeric(12, 4) not null default 1400 check (usd_krw_rate > 0),
  updated_at   timestamptz not null default now()
);

-- =====================================================================
-- Mind module
-- =====================================================================

create table if not exists public.essays (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  -- Markdown
  content    text not null default '',
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists essays_user_created_idx on public.essays (user_id, created_at desc);
create index if not exists essays_tags_idx on public.essays using gin (tags);

create table if not exists public.principles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 투자 / 삶 / 신체
  category   text not null check (category in ('investment', 'life', 'body')),
  rule_text  text not null check (char_length(rule_text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists principles_user_category_idx on public.principles (user_id, category);

-- =====================================================================
-- Body module
-- =====================================================================

create table if not exists public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          date not null default current_date,
  -- 풀업 / 딥스 / 스쿼트 등 (free text so new exercises need no migration)
  exercise_type text not null check (char_length(exercise_type) between 1 and 50),
  -- 추가 중량 (kg), 0 = 맨몸
  weight        numeric(6, 2) not null default 0 check (weight between 0 and 500),
  reps          smallint not null check (reps between 1 and 1000),
  sets          smallint not null default 1 check (sets between 1 and 100),
  rpe           numeric(3, 1) check (rpe is null or rpe between 1 and 10),
  created_at    timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);

create table if not exists public.runs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date             date not null default current_date,
  distance_km      numeric(6, 2) not null check (distance_km > 0 and distance_km <= 500),
  duration_minutes numeric(7, 2) not null check (duration_minutes > 0),
  -- 평균 페이스 (분/km), derived so it can never disagree with the inputs
  avg_pace         numeric(6, 2) generated always as (duration_minutes / distance_km) stored,
  avg_heart_rate   smallint check (avg_heart_rate is null or avg_heart_rate between 30 and 250),
  created_at       timestamptz not null default now()
);

create index if not exists runs_user_date_idx on public.runs (user_id, date desc);

-- =====================================================================
-- Tower module (지원 관제탑)
--
-- The Control Tower page was written against a Firestore-style document
-- store, so its data is kept as JSON documents: one row per
-- (collection, doc_id), e.g. ('items', 'hanneung') or ('config', 'budget').
-- =====================================================================

create table if not exists public.tower_docs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (collection ~ '^[A-Za-z0-9_-]{1,100}$'),
  doc_id     text not null check (char_length(doc_id) between 1 and 200 and position('/' in doc_id) = 0),
  data       jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, doc_id)
);

-- Live updates across tabs/devices (Supabase Realtime), when available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tower_docs'
     ) then
    alter publication supabase_realtime add table public.tower_docs;
  end if;
end;
$$;

-- =====================================================================
-- updated_at triggers
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array['portfolios', 'capital_settings', 'essays']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- =====================================================================
-- Row Level Security — owner-only policies on every table
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'portfolios',
    'cash_flows',
    'capital_settings',
    'essays',
    'principles',
    'workouts',
    'runs',
    'tower_docs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);

    execute format(
      'create policy "%s_select_own" on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)', t, t);
    execute format(
      'create policy "%s_insert_own" on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t, t);
    execute format(
      'create policy "%s_update_own" on public.%I for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t, t);
    execute format(
      'create policy "%s_delete_own" on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)', t, t);
  end loop;
end;
$$;

-- =====================================================================
-- v1 cleanup (optional, destructive)
--
-- v1 of this schema created capital_portfolios, capital_holdings,
-- mind_notes, body_calisthenics_sets and body_runs. The app no longer
-- uses them. Once any data you need has been copied over, uncomment and
-- run the statements below.
-- =====================================================================

-- drop table if exists public.capital_holdings;
-- drop table if exists public.capital_portfolios;
-- drop table if exists public.mind_notes;
-- drop table if exists public.body_calisthenics_sets;
-- drop table if exists public.body_runs;
