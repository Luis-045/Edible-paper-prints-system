-- Delifesti - Order pricing and paper type model
-- Date: 2026-03-07

begin;

alter table public.orders
  add column if not exists paper_type text,
  add column if not exists base_price_mxn numeric(10,2),
  add column if not exists sheet_count integer,
  add column if not exists extra_cost_mxn numeric(10,2) not null default 0,
  add column if not exists total_price_mxn numeric(10,2);

-- Constraints (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_paper_type_check'
  ) then
    alter table public.orders
      add constraint orders_paper_type_check check (paper_type in ('rice', 'sugar'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_base_price_mxn_check'
  ) then
    alter table public.orders
      add constraint orders_base_price_mxn_check check (base_price_mxn >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_sheet_count_check'
  ) then
    alter table public.orders
      add constraint orders_sheet_count_check check (sheet_count is null or sheet_count >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_extra_cost_mxn_check'
  ) then
    alter table public.orders
      add constraint orders_extra_cost_mxn_check check (extra_cost_mxn >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_total_price_mxn_check'
  ) then
    alter table public.orders
      add constraint orders_total_price_mxn_check check (total_price_mxn is null or total_price_mxn >= 0);
  end if;
end $$;

-- Backfill existing rows
update public.orders
set paper_type = coalesce(paper_type, 'rice');

update public.orders
set base_price_mxn = case
  when paper_type = 'sugar' then 100
  else 50
end
where base_price_mxn is null;

update public.orders
set total_price_mxn = case
  when sheet_count is null then null
  else round((base_price_mxn * sheet_count) + coalesce(extra_cost_mxn, 0), 2)
end;

alter table public.orders
  alter column paper_type set not null,
  alter column base_price_mxn set not null,
  alter column extra_cost_mxn set not null;

create index if not exists idx_orders_paper_type on public.orders(paper_type);

commit;
