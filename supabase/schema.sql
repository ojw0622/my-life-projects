-- =====================================================================
-- My Life Dashboard — Supabase schema
--
-- Modules
--   * Capital : capital_portfolios, capital_holdings
--   * Mind    : mind_notes
--   * Body    : body_calisthenics_sets, body_runs
--
-- Every table carries a user_id (defaults to auth.uid()) and has Row Level
-- Security enabled with owner-only policies: a signed-in user can only
-- read and write their own rows; anonymous requests see nothing.
--
-- The script is idempotent and can be re-run in the Supabase SQL editor.
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

create table if not exists public.capital_portfolios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  base_currency char(3) not null default 'KRW',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists capital_portfolios_user_id_idx
  on public.capital_portfolios (user_id);

create table if not exists public.capital_holdings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  portfolio_id  uuid not null references public.capital_portfolios (id) on delete cascade,
  -- 자산군 (e.g. 'domestic_equity', 'global_equity', 'bond', 'gold', 'cash', 'crypto')
  asset_class   text not null check (char_length(asset_class) between 1 and 50),
  symbol        text,
  name          text not null check (char_length(name) between 1 and 100),
  -- 목표 비중: fraction in [0, 1]. The sum per portfolio should be 1 and is
  -- validated by the capital engine (cross-row checks are not expressible
  -- as a column constraint).
  target_weight numeric(7, 6) not null default 0 check (target_weight between 0 and 1),
  -- 현재 수량
  quantity      numeric(20, 8) not null default 0 check (quantity >= 0),
  -- 최소 매수 단위 (1 for whole shares, e.g. 0.0001 for crypto)
  lot_size      numeric(20, 8) not null default 1 check (lot_size > 0),
  -- 최근 단가
  unit_price    numeric(20, 4) not null default 0 check (unit_price >= 0),
  -- 현재 평가액
  market_value  numeric(24, 4) generated always as (quantity * unit_price) stored,
  price_updated_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (portfolio_id, name)
);

create index if not exists capital_holdings_user_id_idx
  on public.capital_holdings (user_id);
create index if not exists capital_holdings_portfolio_id_idx
  on public.capital_holdings (portfolio_id);

-- =====================================================================
-- Mind module
-- =====================================================================

create table if not exists public.mind_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null default 'memo' check (kind in ('essay', 'memo')),
  -- 제목
  title       text not null check (char_length(title) between 1 and 200),
  -- 마크다운 본문
  body_md     text not null default '',
  -- 단락 구조: ordered array of paragraphs, e.g.
  --   [{"order": 1, "heading": "서론", "text": "..."}, ...]
  paragraphs  jsonb not null default '[]'::jsonb check (jsonb_typeof(paragraphs) = 'array'),
  tags        text[] not null default '{}',
  -- 작성일
  written_on  date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists mind_notes_user_written_idx
  on public.mind_notes (user_id, written_on desc);

-- =====================================================================
-- Body module
-- =====================================================================

-- 맨몸운동: one row per set.
create table if not exists public.body_calisthenics_sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  performed_on date not null default current_date,
  -- 종목 (e.g. 'pull_up', 'push_up', 'dip', 'pistol_squat')
  exercise     text not null check (char_length(exercise) between 1 and 100),
  -- 세트 번호
  set_number   smallint not null check (set_number > 0),
  -- 중량 (추가 중량, kg; 0 = 맨몸, negative = assisted)
  weight_kg    numeric(6, 2) not null default 0 check (weight_kg between -200 and 500),
  -- 횟수
  reps         smallint not null check (reps >= 0),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, performed_on, exercise, set_number)
);

create index if not exists body_calisthenics_sets_user_date_idx
  on public.body_calisthenics_sets (user_id, performed_on desc);

-- 러닝
create table if not exists public.body_runs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 일자
  run_on           date not null default current_date,
  -- 거리 (km)
  distance_km      numeric(6, 3) not null check (distance_km > 0),
  duration_seconds integer not null check (duration_seconds > 0),
  -- 페이스 (초/km), derived from distance and duration
  pace_sec_per_km  numeric(8, 2) generated always as (duration_seconds / distance_km) stored,
  -- 심박 (bpm)
  avg_heart_rate   smallint check (avg_heart_rate between 30 and 250),
  max_heart_rate   smallint check (max_heart_rate between 30 and 250),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (max_heart_rate is null or avg_heart_rate is null or max_heart_rate >= avg_heart_rate)
);

create index if not exists body_runs_user_date_idx
  on public.body_runs (user_id, run_on desc);

-- =====================================================================
-- updated_at triggers
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'capital_portfolios',
    'capital_holdings',
    'mind_notes',
    'body_calisthenics_sets',
    'body_runs'
  ]
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
    'capital_portfolios',
    'mind_notes',
    'body_calisthenics_sets',
    'body_runs'
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

-- capital_holdings additionally requires the parent portfolio to belong to
-- the same user, so a holding cannot be attached to someone else's portfolio.
alter table public.capital_holdings enable row level security;

drop policy if exists "capital_holdings_select_own" on public.capital_holdings;
drop policy if exists "capital_holdings_insert_own" on public.capital_holdings;
drop policy if exists "capital_holdings_update_own" on public.capital_holdings;
drop policy if exists "capital_holdings_delete_own" on public.capital_holdings;

create policy "capital_holdings_select_own" on public.capital_holdings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "capital_holdings_insert_own" on public.capital_holdings
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.capital_portfolios p
      where p.id = portfolio_id and p.user_id = (select auth.uid())
    )
  );

create policy "capital_holdings_update_own" on public.capital_holdings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.capital_portfolios p
      where p.id = portfolio_id and p.user_id = (select auth.uid())
    )
  );

create policy "capital_holdings_delete_own" on public.capital_holdings
  for delete to authenticated
  using ((select auth.uid()) = user_id);
