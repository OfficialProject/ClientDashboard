-- Applied live via Supabase MCP on 2026-09-05. This file is the
-- version-controlled record of that migration, not a pending one to run -
-- if you're setting up a fresh Supabase project, run this against it.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  steam_id text not null,
  steam_name text,
  avatar text,
  premier_rating integer,
  faceit_level integer,
  faceit_elo integer,
  faceit_synced_at timestamptz,
  -- Sensitive per-account secret (CS2 match-history auth code) - flagged for
  -- encryption-at-rest review before real users (Linear: CLI-8).
  steam_auth_code text,
  last_known_share_code text,
  kovaaks_username text,
  assigned_benchmark_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_clients_owner on clients(owner_id);

create table if not exists benchmark_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  benchmark_id text not null,
  overall_rank_name text,
  groups jsonb not null,
  scenario_scores jsonb not null,
  scenario_leaderboard_ranks jsonb not null default '{}',
  synced_at timestamptz not null default now()
);
create index if not exists idx_snapshots_client_benchmark on benchmark_snapshots(client_id, benchmark_id, synced_at);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_notes_client on notes(client_id);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  benchmark_id text not null,
  category text not null,
  subcategory text not null,
  target_score numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_goals_client on goals(client_id);

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  benchmark_id text not null,
  name text not null,
  scenarios jsonb not null,
  source text not null check (source in ('manual', 'auto-progression')),
  created_at timestamptz not null default now()
);
create index if not exists idx_routines_client on routines(client_id);

create table if not exists premier_demo_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  share_code text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'error')),
  demo_url text,
  map text,
  error text,
  parsed_stats jsonb,
  parse_status text not null default 'unparsed' check (parse_status in ('unparsed', 'parsing', 'parsed', 'error')),
  parse_error text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_demo_jobs_client on premier_demo_jobs(client_id);
create index if not exists idx_demo_jobs_status on premier_demo_jobs(status) where status = 'pending';

alter table clients enable row level security;
alter table benchmark_snapshots enable row level security;
alter table notes enable row level security;
alter table goals enable row level security;
alter table routines enable row level security;
alter table premier_demo_jobs enable row level security;

create policy "owner full access" on clients for all using (owner_id = auth.uid());
create policy "owner via client" on benchmark_snapshots for all using (client_id in (select id from clients where owner_id = auth.uid()));
create policy "owner via client" on notes for all using (client_id in (select id from clients where owner_id = auth.uid()));
create policy "owner via client" on goals for all using (client_id in (select id from clients where owner_id = auth.uid()));
create policy "owner via client" on routines for all using (client_id in (select id from clients where owner_id = auth.uid()));
create policy "owner via client" on premier_demo_jobs for all using (client_id in (select id from clients where owner_id = auth.uid()));
