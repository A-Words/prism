create table if not exists notes (
  user_id text not null,
  node_id text not null,
  markdown text not null,
  generated_by text not null,
  version integer not null default 1,
  updated_at text not null,
  primary key(user_id, node_id)
);

create table if not exists vision_states (
  id integer primary key autoincrement,
  user_id text not null,
  focus_level text not null,
  emotion text not null,
  posture text not null,
  confidence real not null,
  sampled_at text not null,
  created_at text not null
);

create table if not exists intervention_events (
  event_id text primary key,
  user_id text not null,
  trigger_reason text not null,
  trigger_count integer not null,
  message text not null,
  action_type text not null,
  accepted integer,
  created_at text not null
);

create table if not exists offline_queue (
  event_id text primary key,
  entity_type text not null,
  entity_id text not null,
  op_type text not null,
  payload_json text not null,
  version integer not null,
  idempotency_key text not null unique,
  status text not null default 'pending',
  retry_count integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_offline_queue_status_created_at on offline_queue(status, created_at);
create index if not exists idx_offline_queue_idempotency_key on offline_queue(idempotency_key);
