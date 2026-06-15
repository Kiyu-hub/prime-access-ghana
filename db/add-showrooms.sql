-- Prime Access Ghana — Showrooms (child of a branch)
-- A showroom belongs to a branch (the parent). Showrooms and warehouses
-- cannot exist without a branch — enforced by the NOT NULL FK + the UI.
create table if not exists public.showrooms (
    id           uuid primary key default gen_random_uuid(),
    name         text not null,
    branch_id    uuid not null references public.branches(id) on delete cascade,
    warehouse_id uuid references public.warehouses(id) on delete set null,
    location     text,
    created_at   timestamptz not null default now()
);
-- Each warehouse auto-creates a paired showroom (products live in the
-- warehouse, surface in its showroom). Backfill the column for older DBs.
alter table public.showrooms add column if not exists warehouse_id uuid references public.warehouses(id) on delete set null;
create index if not exists showrooms_branch_idx on public.showrooms(branch_id);
create index if not exists showrooms_warehouse_idx on public.showrooms(warehouse_id);

alter table public.showrooms enable row level security;
drop policy if exists "showrooms read"  on public.showrooms;
drop policy if exists "showrooms write" on public.showrooms;
create policy "showrooms read"  on public.showrooms for select using (true);
create policy "showrooms write" on public.showrooms for all    using (true) with check (true);

grant all on public.showrooms to anon, authenticated, service_role;
