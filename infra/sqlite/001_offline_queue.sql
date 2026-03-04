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
