-- Supabase schema init
create extension if not exists "pgcrypto";

create table if not exists public.knowledge_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic text not null,
  source_type text not null,
  difficulty text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_nodes (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.knowledge_maps(id) on delete cascade,
  user_id uuid not null,
  title text not null,
  summary text not null,
  level int not null,
  version bigint not null default 1,
  source_device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.note_sections (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.knowledge_nodes(id) on delete cascade,
  user_id uuid not null,
  markdown text not null,
  generated_by text not null,
  version bigint not null default 1,
  source_device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vision_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  focus_level text not null,
  emotion text not null,
  posture text not null,
  confidence numeric not null,
  sampled_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.intervention_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trigger_reason text not null,
  trigger_count int not null,
  message text not null,
  action_type text not null,
  accepted boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity_type text not null,
  entity_id text not null,
  version bigint not null,
  updated_at timestamptz not null default now(),
  unique(user_id, entity_type, entity_id)
);

create table if not exists public.note_sections_history (
  id uuid primary key default gen_random_uuid(),
  note_section_id uuid not null,
  user_id uuid not null,
  snapshot jsonb not null,
  conflict_snapshot_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_nodes_history (
  id uuid primary key default gen_random_uuid(),
  knowledge_node_id uuid not null,
  user_id uuid not null,
  snapshot jsonb not null,
  conflict_snapshot_id text,
  created_at timestamptz not null default now()
);

alter table public.knowledge_maps enable row level security;
alter table public.knowledge_nodes enable row level security;
alter table public.note_sections enable row level security;
alter table public.vision_states enable row level security;
alter table public.intervention_events enable row level security;
alter table public.sync_versions enable row level security;
alter table public.note_sections_history enable row level security;
alter table public.knowledge_nodes_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='knowledge_maps' and policyname='km_owner_rw'
  ) then
    create policy km_owner_rw on public.knowledge_maps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy kn_owner_rw on public.knowledge_nodes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy ns_owner_rw on public.note_sections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy vs_owner_rw on public.vision_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy ie_owner_rw on public.intervention_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy sv_owner_rw on public.sync_versions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy nsh_owner_rw on public.note_sections_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy knh_owner_rw on public.knowledge_nodes_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
