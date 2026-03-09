-- Delifesti - Soft delete para pedidos
-- Date: 2026-03-09

begin;

alter table public.orders
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid;

create index if not exists idx_orders_deleted_at
  on public.orders(deleted_at);

create index if not exists idx_orders_user_deleted_at
  on public.orders(user_id, deleted_at);

commit;
