-- ============================================================
-- Prime Access Ghana — categories & materials taxonomy
-- Single-line statements only. Idempotent — safe to re-run.
-- ============================================================

create table if not exists public.categories ( id uuid primary key default gen_random_uuid(), name text unique not null, sort_order int not null default 100, created_at timestamptz not null default now() );
create table if not exists public.materials ( id uuid primary key default gen_random_uuid(), name text unique not null, sort_order int not null default 100, created_at timestamptz not null default now() );

create index if not exists categories_sort_idx on public.categories(sort_order, name);
create index if not exists materials_sort_idx on public.materials(sort_order, name);

alter table public.categories enable row level security;
alter table public.materials enable row level security;

drop policy if exists "categories read" on public.categories;
drop policy if exists "categories write" on public.categories;
create policy "categories read"  on public.categories for select using (true);
create policy "categories write" on public.categories for all using (true) with check (true);

drop policy if exists "materials read" on public.materials;
drop policy if exists "materials write" on public.materials;
create policy "materials read"  on public.materials for select using (true);
create policy "materials write" on public.materials for all using (true) with check (true);

-- Seed with everything seen in the supplier catalog so far
insert into public.categories (name, sort_order) values ('Bathtub', 10), ('Basin', 20), ('Toilet', 30), ('Shower', 40), ('Faucet', 50), ('Mixer', 55), ('Mirror', 60), ('Lighting', 70), ('Furniture', 80), ('Tiles', 90), ('Kitchen', 95), ('Accessory', 100) on conflict (name) do nothing;

insert into public.materials (name, sort_order) values ('Acrylic', 10), ('Artificial stone', 20), ('Stone', 25), ('Ceramic', 30), ('Porcelain', 35), ('Transparent resin', 40), ('Stainless steel', 50), ('Inox 304', 55), ('Brass', 60), ('Chrome', 65), ('Glass', 70), ('Wood', 80), ('Other', 999) on conflict (name) do nothing;
