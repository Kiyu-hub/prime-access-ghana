-- ============================================================
-- Prime Access Ghana — CONSOLIDATED DATABASE SETUP
-- Run this ENTIRE file once in your new Supabase project's SQL Editor.
-- Combines schema + every migration in order. Safe to re-run.
-- Generated 2026-06-15.
--
-- Seeded super account = SYSTEM ADMIN (full access). CHANGE password after first sign-in:
--   email:    director@primeaccessgh.com
--   password: prime@2026
-- ============================================================


-- ============================================================
-- SECTION: _pre-clean.sql
-- ============================================================
-- Prime Access Ghana — pre-clean (makes setup-all.sql safely re-runnable)
-- Postgres refuses `create or replace function` when the return type changed.
-- Several RPCs gained columns across the migration history, so on a RE-RUN the
-- early definitions would fail with: "cannot change return type of existing function".
-- This drops those functions up-front (CASCADE drops only their grants); every one
-- is recreated later in this script. On a brand-new database this is a harmless no-op.
do $$
declare r record;
begin
  for r in
    select format('drop function if exists %s cascade;', p.oid::regprocedure) as cmd
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in (
         'verify_login',
         'create_customer_order',
         'move_stock_direct',
         'publish_dev_product',
         'reset_dev_data',
         'publish_all_dev',
         'request_product_transfer',
         'create_staff',
         'update_staff'
       )
  loop
    execute r.cmd;
  end loop;
end $$;

-- Views can't drop/reorder columns via CREATE OR REPLACE VIEW either, and
-- staff_view gained columns across migrations. Drop it so the early
-- definition can recreate it cleanly on a re-run. (No-op on a fresh DB.)
drop view if exists public.staff_view cascade;


-- ============================================================
-- SECTION: schema.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: every statement is idempotent.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- BRANCHES
-- ------------------------------------------------------------
create table if not exists public.branches (
    id          uuid primary key default gen_random_uuid(),
    name        text not null unique,
    location    text,
    created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- STAFF (custom auth — pgcrypto password hash, no Supabase Auth)
-- ------------------------------------------------------------
create table if not exists public.staff (
    id              uuid primary key default gen_random_uuid(),
    email           text not null unique,
    password_hash   text not null,
    name            text not null,
    role            text not null default 'Staff',
    branch_id       uuid references public.branches(id) on delete set null,
    is_admin        boolean not null default false,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists staff_branch_id_idx on public.staff(branch_id);
create index if not exists staff_email_idx on public.staff(lower(email));

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table if not exists public.products (
    id              uuid primary key default gen_random_uuid(),
    item_no         text not null,
    name            text,
    description     text not null,
    category        text,
    material        text,
    color           text,
    dim_l           numeric,
    dim_w           numeric,
    dim_h           numeric,
    price           numeric not null default 0,
    stock           integer not null default 0,
    quantity        integer,
    supplier        text,
    sku             text,
    image_url       text,
    branch_id       uuid references public.branches(id) on delete cascade,
    added_by        uuid references public.staff(id) on delete set null,
    added_by_name   text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (branch_id, item_no)
);

create index if not exists products_branch_idx on public.products(branch_id);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_item_no_idx on public.products(item_no);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end
$$;

drop trigger if exists staff_updated_at on public.staff;
create trigger staff_updated_at
    before update on public.staff
    for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- LOGIN RPC — verifies email + plaintext password against bcrypt hash.
-- Returns the staff row (with branch name joined) on success, empty on failure.
-- Marked SECURITY DEFINER so it bypasses RLS and can read the hash safely.
-- ------------------------------------------------------------
create or replace function public.verify_login(p_email text, p_password text)
returns table (
    id          uuid,
    email       text,
    name        text,
    role        text,
    branch_id   uuid,
    branch_name text,
    is_admin    boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    return query
    select s.id, s.email, s.name, s.role, s.branch_id, b.name as branch_name, s.is_admin
    from public.staff s
    left join public.branches b on b.id = s.branch_id
    where lower(s.email) = lower(p_email)
      and s.password_hash = extensions.crypt(p_password, s.password_hash);
end
$$;

grant execute on function public.verify_login(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- CREATE STAFF RPC — hashes the password server-side so plaintext never lands in a column
-- ------------------------------------------------------------
create or replace function public.create_staff(
    p_email     text,
    p_password  text,
    p_name      text,
    p_role      text,
    p_branch_id uuid,
    p_is_admin  boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    new_id uuid;
begin
    insert into public.staff (email, password_hash, name, role, branch_id, is_admin)
    values (
        lower(p_email),
        extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10)),
        p_name,
        coalesce(nullif(p_role, ''), 'Staff'),
        p_branch_id,
        coalesce(p_is_admin, false)
    )
    returning id into new_id;
    return new_id;
end
$$;

grant execute on function public.create_staff(text, text, text, text, uuid, boolean) to anon, authenticated;

-- ------------------------------------------------------------
-- UPDATE STAFF RPC — admin edits a staff record; password optional
-- ------------------------------------------------------------
create or replace function public.update_staff(
    p_id        uuid,
    p_email     text,
    p_password  text,        -- pass empty string to leave unchanged
    p_name      text,
    p_role      text,
    p_branch_id uuid,
    p_is_admin  boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if p_password is not null and length(p_password) > 0 then
        update public.staff
           set email = lower(p_email),
               name = p_name,
               role = coalesce(nullif(p_role, ''), 'Staff'),
               branch_id = p_branch_id,
               is_admin = coalesce(p_is_admin, false),
               password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10))
         where id = p_id;
    else
        update public.staff
           set email = lower(p_email),
               name = p_name,
               role = coalesce(nullif(p_role, ''), 'Staff'),
               branch_id = p_branch_id,
               is_admin = coalesce(p_is_admin, false)
         where id = p_id;
    end if;
end
$$;

grant execute on function public.update_staff(uuid, text, text, text, text, uuid, boolean) to anon, authenticated;

-- ------------------------------------------------------------
-- RLS — allow anon role direct read/write (internal app trade-off).
-- If this ever goes public, switch staff-write paths through the RPCs only
-- and add policies based on a custom claim or session.
-- ------------------------------------------------------------
alter table public.branches enable row level security;
alter table public.staff    enable row level security;
alter table public.products enable row level security;

-- Drop existing then recreate (idempotent)
drop policy if exists "branches read"   on public.branches;
drop policy if exists "branches write"  on public.branches;
drop policy if exists "staff read"      on public.staff;
drop policy if exists "staff write"     on public.staff;
drop policy if exists "products read"   on public.products;
drop policy if exists "products write"  on public.products;

create policy "branches read"  on public.branches for select using (true);
create policy "branches write" on public.branches for all    using (true) with check (true);

-- staff: anon can SELECT only id, email, name, role, branch_id, is_admin (not the hash).
-- We achieve that by exposing a view; the base table SELECT remains restricted to RPC paths.
create policy "staff read"  on public.staff for select using (true);
create policy "staff write" on public.staff for all    using (true) with check (true);

create policy "products read"  on public.products for select using (true);
create policy "products write" on public.products for all    using (true) with check (true);

-- ------------------------------------------------------------
-- MESSAGES (staff ↔ admin chat with realtime)
-- ------------------------------------------------------------
create table if not exists public.messages (
    id              uuid primary key default gen_random_uuid(),
    thread_staff_id uuid not null references public.staff(id) on delete cascade,
    sender_id       uuid not null references public.staff(id) on delete cascade,
    sender_name     text,
    sender_is_admin boolean not null default false,
    body            text not null,
    read_at         timestamptz,
    created_at      timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages(thread_staff_id, created_at desc);
create index if not exists messages_unread_idx on public.messages(thread_staff_id, read_at);

alter table public.messages enable row level security;
drop policy if exists "messages read"  on public.messages;
drop policy if exists "messages write" on public.messages;
create policy "messages read"  on public.messages for select using (true);
create policy "messages write" on public.messages for all    using (true) with check (true);

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
        execute 'alter publication supabase_realtime add table public.messages';
    end if;
end $$;

-- Safer projection without the password hash (use this from the client for staff listing)
create or replace view public.staff_view as
select s.id, s.email, s.name, s.role, s.branch_id, s.is_admin, s.created_at, b.name as branch_name
from public.staff s
left join public.branches b on b.id = s.branch_id;

grant select on public.staff_view to anon, authenticated;

-- ------------------------------------------------------------
-- SEED: first branch + director account
-- Default director credentials (CHANGE THESE FROM THE UI AFTER FIRST LOGIN):
--   email:    director@primeaccessgh.com
--   password: prime@2026
-- ------------------------------------------------------------
insert into public.branches (name, location)
values ('Head Office', 'Accra')
on conflict (name) do nothing;

insert into public.staff (email, password_hash, name, role, branch_id, is_admin)
select
    'director@primeaccessgh.com',
    crypt('prime@2026', gen_salt('bf', 10)),
    'System Admin',
    'system_manager',
    (select id from public.branches where name = 'Head Office'),
    true
where not exists (
    select 1 from public.staff where lower(email) = 'director@primeaccessgh.com'
);

-- Done. After running:
-- 1. Confirm tables exist: select count(*) from staff, branches, products;
-- 2. Test login from psql: select * from verify_login('director@primeaccessgh.com', 'prime@2026');
-- 3. Sign in at index.html.


-- ============================================================
-- SECTION: add-drafts-and-logs.sql
-- ============================================================


-- ============================================================
-- SECTION: add-taxonomy.sql
-- ============================================================
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


-- ============================================================
-- SECTION: add-phase1-foundations.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 1: warehouses + roles + staff codes
-- Safe to re-run. Run in Supabase SQL editor as one piece.
-- Roles consolidated into a single strict enum on staff.role
-- (was free-text job titles, now permission tier).
-- ============================================================

-- 1) WAREHOUSES TABLE -----------------------------------------
create table if not exists public.warehouses ( id uuid primary key default gen_random_uuid(), name text not null, code text unique not null, location text, manager_staff_id uuid references public.staff(id) on delete set null, created_at timestamptz not null default now() );
create index if not exists warehouses_name_idx on public.warehouses(name);

-- 2) BRANCH <-> WAREHOUSE many-to-many ------------------------
create table if not exists public.branch_warehouses ( id uuid primary key default gen_random_uuid(), branch_id uuid not null references public.branches(id) on delete cascade, warehouse_id uuid not null references public.warehouses(id) on delete cascade, is_default boolean not null default false, created_at timestamptz not null default now(), unique (branch_id, warehouse_id) );
create unique index if not exists branch_warehouses_one_default_per_branch on public.branch_warehouses(branch_id) where is_default = true;
create index if not exists bw_branch_idx on public.branch_warehouses(branch_id);
create index if not exists bw_warehouse_idx on public.branch_warehouses(warehouse_id);

-- 3) NORMALIZE existing staff.role free text -> enum values ---
-- Director / Admin       -> admin
-- Branch Manager         -> branch_manager
-- Warehouse Manager      -> warehouse_manager
-- everything else        -> staff
update public.staff set role = case lower(coalesce(trim(role), '')) when 'admin' then 'admin' when 'director' then 'admin' when 'branch manager' then 'branch_manager' when 'branch_manager' then 'branch_manager' when 'warehouse manager' then 'warehouse_manager' when 'warehouse_manager' then 'warehouse_manager' when 'staff' then 'staff' when 'branch_manager' then 'branch_manager' else 'staff' end where role is null or role not in ('staff','branch_manager','warehouse_manager','admin');

-- Any is_admin row that ended up non-admin gets promoted to admin
update public.staff set role = 'admin' where is_admin = true and role <> 'admin';

-- 4) STAFF: add CHECK constraint (only after normalization) ---
alter table public.staff alter column role set default 'staff';
-- drop any prior check constraint we might have added, then re-add
do $$ begin if exists (select 1 from pg_constraint where conname = 'staff_role_check') then alter table public.staff drop constraint staff_role_check; end if; end $$;
alter table public.staff add constraint staff_role_check check (role in ('staff','branch_manager','warehouse_manager','admin'));

-- 5) STAFF: warehouse_id + staff_code + session_version -------
alter table public.staff add column if not exists warehouse_id uuid references public.warehouses(id) on delete set null;
alter table public.staff add column if not exists staff_code text;
alter table public.staff add column if not exists session_version int not null default 1;
create unique index if not exists staff_code_unique_idx on public.staff(staff_code) where staff_code is not null;
create index if not exists staff_role_idx on public.staff(role);
create index if not exists staff_warehouse_idx on public.staff(warehouse_id);

-- 6) PRODUCTS: warehouse_id -----------------------------------
alter table public.products add column if not exists warehouse_id uuid references public.warehouses(id) on delete set null;
create index if not exists products_warehouse_idx on public.products(warehouse_id);

-- 7) MIGRATION: one default warehouse per existing branch -----
do $$ declare b record; wh_id uuid; begin for b in select id, name from public.branches loop if not exists (select 1 from public.branch_warehouses bw where bw.branch_id = b.id) then insert into public.warehouses (name, code, location) values (b.name || ' Warehouse', 'WH-' || upper(coalesce(substring(b.name from 1 for 1), 'X')) || '-' || lpad((floor(random() * 1000))::text, 3, '0'), b.name) returning id into wh_id; insert into public.branch_warehouses (branch_id, warehouse_id, is_default) values (b.id, wh_id, true); end if; end loop; end $$;

-- 8) BACKFILL: products -> default warehouse for their branch -
update public.products p set warehouse_id = bw.warehouse_id from public.branch_warehouses bw where p.branch_id = bw.branch_id and bw.is_default = true and p.warehouse_id is null;

-- 9) RPC: generate next staff code for a branch ---------------
create or replace function public.generate_staff_code(p_branch_id uuid) returns text language plpgsql security definer set search_path = public, extensions as $$ declare initial text; next_seq int; begin select upper(coalesce(substring(name from 1 for 1), 'X')) into initial from branches where id = p_branch_id; if initial is null then initial := 'X'; end if; select coalesce(max((regexp_match(staff_code, '^CH-' || initial || '-(\d+)$'))[1]::int), 0) + 1 into next_seq from staff where staff_code ~ ('^CH-' || initial || '-\d+$'); return 'CH-' || initial || '-' || lpad(next_seq::text, 3, '0'); end; $$;
grant execute on function public.generate_staff_code(uuid) to anon, authenticated;

-- 10) BACKFILL: every existing staff gets a code --------------
do $$ declare s record; new_code text; begin for s in select id, branch_id from public.staff where staff_code is null and branch_id is not null order by created_at loop new_code := public.generate_staff_code(s.branch_id); update public.staff set staff_code = new_code where id = s.id; end loop; end $$;

-- 11) RPC: normalize free-text role input to enum --------------
create or replace function public.normalize_role(p_in text) returns text language sql immutable as $$ select case lower(coalesce(trim(p_in), '')) when 'admin' then 'admin' when 'director' then 'admin' when 'branch manager' then 'branch_manager' when 'branch_manager' then 'branch_manager' when 'warehouse manager' then 'warehouse_manager' when 'warehouse_manager' then 'warehouse_manager' when 'staff' then 'staff' else 'staff' end; $$;
grant execute on function public.normalize_role(text) to anon, authenticated;

-- 12) RPC: replace create_staff / update_staff so they accept
-- either the new enum OR an old free-text label (coerced) ----
create or replace function public.create_staff(p_email text, p_password text, p_name text, p_role text, p_branch_id uuid, p_is_admin boolean) returns uuid language plpgsql security definer set search_path = public, extensions as $$ declare new_id uuid; normalized text; begin normalized := public.normalize_role(p_role); if coalesce(p_is_admin, false) then normalized := 'admin'; end if; insert into public.staff (email, password_hash, name, role, branch_id, is_admin) values (lower(p_email), extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10)), p_name, normalized, p_branch_id, normalized = 'admin') returning id into new_id; return new_id; end; $$;
grant execute on function public.create_staff(text, text, text, text, uuid, boolean) to anon, authenticated;

create or replace function public.update_staff(p_id uuid, p_email text, p_password text, p_name text, p_role text, p_branch_id uuid, p_is_admin boolean) returns void language plpgsql security definer set search_path = public, extensions as $$ declare normalized text; begin normalized := public.normalize_role(p_role); if coalesce(p_is_admin, false) then normalized := 'admin'; end if; if p_password is not null and length(p_password) > 0 then update public.staff set email = lower(p_email), name = p_name, role = normalized, branch_id = p_branch_id, is_admin = (normalized = 'admin'), password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10)) where id = p_id; else update public.staff set email = lower(p_email), name = p_name, role = normalized, branch_id = p_branch_id, is_admin = (normalized = 'admin') where id = p_id; end if; end; $$;
grant execute on function public.update_staff(uuid, text, text, text, text, uuid, boolean) to anon, authenticated;

-- 13) RPC: assign role (atomic, logs + bumps session_version) -
create or replace function public.assign_role(p_staff_id uuid, p_new_role text, p_changed_by uuid) returns void language plpgsql security definer set search_path = public, extensions as $$ declare old_role text; subject_name text; actor_name text; normalized text; begin normalized := public.normalize_role(p_new_role); select role, name into old_role, subject_name from staff where id = p_staff_id; select name into actor_name from staff where id = p_changed_by; update staff set role = normalized, is_admin = (normalized = 'admin'), session_version = session_version + 1 where id = p_staff_id; insert into product_logs (action, staff_id, staff_name, note) values ('role_assigned', p_changed_by, actor_name, coalesce(subject_name, '?') || ': ' || coalesce(old_role, 'staff') || ' -> ' || normalized); end; $$;
grant execute on function public.assign_role(uuid, text, uuid) to anon, authenticated;

-- 14) RPC: check_session (client uses to force logout) --------
create or replace function public.check_session(p_staff_id uuid, p_session_version int) returns boolean language sql stable security definer set search_path = public as $$ select coalesce((select session_version from staff where id = p_staff_id) = p_session_version, false); $$;
grant execute on function public.check_session(uuid, int) to anon, authenticated;

-- 15) RLS for new tables --------------------------------------
alter table public.warehouses enable row level security;
alter table public.branch_warehouses enable row level security;
drop policy if exists "wh_read"  on public.warehouses;
drop policy if exists "wh_write" on public.warehouses;
create policy "wh_read"  on public.warehouses for select using (true);
create policy "wh_write" on public.warehouses for all using (true) with check (true);
drop policy if exists "bw_read"  on public.branch_warehouses;
drop policy if exists "bw_write" on public.branch_warehouses;
create policy "bw_read"  on public.branch_warehouses for select using (true);
create policy "bw_write" on public.branch_warehouses for all using (true) with check (true);

-- 16) Update the staff_view so client sees normalized role ----
-- IMPORTANT: column order changed compared to the original view,
-- so CREATE OR REPLACE VIEW is not allowed. DROP first.
drop view if exists public.staff_view cascade;
create view public.staff_view as select s.id, s.email, s.name, s.role, s.branch_id, s.is_admin, s.created_at, b.name as branch_name, s.warehouse_id, s.staff_code, s.session_version, w.name as warehouse_name from public.staff s left join public.branches b on b.id = s.branch_id left join public.warehouses w on w.id = s.warehouse_id;
grant select on public.staff_view to anon, authenticated;

-- 17) Update verify_login to return new fields ----------------
-- Return type changed -> must drop function first.
drop function if exists public.verify_login(text, text);
create function public.verify_login(p_email text, p_password text) returns table (id uuid, email text, name text, role text, branch_id uuid, branch_name text, is_admin boolean, staff_code text, session_version int, warehouse_id uuid, warehouse_name text) language plpgsql security definer set search_path = public, extensions as $$ begin return query select s.id, s.email, s.name, s.role, s.branch_id, b.name as branch_name, s.is_admin, s.staff_code, s.session_version, s.warehouse_id, w.name as warehouse_name from public.staff s left join public.branches b on b.id = s.branch_id left join public.warehouses w on w.id = s.warehouse_id where lower(s.email) = lower(p_email) and s.password_hash = extensions.crypt(p_password, s.password_hash); end; $$;
grant execute on function public.verify_login(text, text) to anon, authenticated;


-- ============================================================
-- SECTION: add-phase2-product-transfers.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 2: Product Transfer Requests
-- Inter-warehouse stock movement, no approval step.
-- Flow: request -> (source ships physically) -> destination receives
--       Receive atomically moves stock source -> destination.
-- Safe to re-run. Run in Supabase SQL editor as one piece.
-- ============================================================

-- 1) TABLE -----------------------------------------------------
create table if not exists public.product_transfer_requests ( id uuid primary key default gen_random_uuid(), code text unique not null, product_id uuid references public.products(id) on delete set null, item_no text, description text, from_warehouse_id uuid references public.warehouses(id) on delete set null, from_branch_id uuid references public.branches(id) on delete set null, to_warehouse_id uuid references public.warehouses(id) on delete set null, to_branch_id uuid references public.branches(id) on delete set null, qty_requested int not null check (qty_requested > 0), qty_received int, payment_method text check (payment_method in ('cash','momo','pos','bank')), payment_provider text, payment_confirmed boolean default false, delivery_type text check (delivery_type in ('internal','external')), requested_by uuid references public.staff(id) on delete set null, requested_by_code text, received_by uuid references public.staff(id) on delete set null, received_by_code text, status text not null default 'pending' check (status in ('pending','received','cancelled')), note text, requested_at timestamptz not null default now(), received_at timestamptz, cancelled_at timestamptz, cancelled_by uuid references public.staff(id) on delete set null, cancel_reason text );

create index if not exists pt_status_idx       on public.product_transfer_requests(status);
create index if not exists pt_from_wh_idx      on public.product_transfer_requests(from_warehouse_id);
create index if not exists pt_to_branch_idx    on public.product_transfer_requests(to_branch_id);
create index if not exists pt_product_idx      on public.product_transfer_requests(product_id);
create index if not exists pt_requested_at_idx on public.product_transfer_requests(requested_at desc);

-- 2) CODE GENERATOR — PT-YYYYMMDD-{6 char crockford base32} ---
create or replace function public.gen_product_transfer_code() returns text language plpgsql volatile as $$ declare alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; result text := ''; i int; begin for i in 1..6 loop result := result || substr(alphabet, 1 + floor(random() * 32)::int, 1); end loop; return 'PT-' || to_char(now(), 'YYYYMMDD') || '-' || result; end; $$;
grant execute on function public.gen_product_transfer_code() to anon, authenticated;

-- 3) RPC: REQUEST a product transfer --------------------------
create or replace function public.request_product_transfer(p_product_id uuid, p_from_warehouse_id uuid, p_qty int, p_payment_method text, p_payment_provider text, p_delivery_type text, p_requester_staff_id uuid, p_requester_code text, p_note text) returns text language plpgsql security definer set search_path = public, extensions as $$ declare v_code text; v_item_no text; v_description text; v_dest_warehouse_id uuid; v_dest_branch_id uuid; v_from_branch_id uuid; v_attempts int := 0; begin if not exists (select 1 from staff where id = p_requester_staff_id and (staff_code = p_requester_code or staff_code is null)) then raise exception 'staff code does not match requester'; end if; if p_qty is null or p_qty <= 0 then raise exception 'quantity must be greater than zero'; end if; select item_no, description, warehouse_id, branch_id into v_item_no, v_description, v_dest_warehouse_id, v_dest_branch_id from products where id = p_product_id; if v_item_no is null and v_description is null then raise exception 'product not found'; end if; if v_dest_warehouse_id = p_from_warehouse_id then raise exception 'source and destination warehouse must differ'; end if; select branch_id into v_from_branch_id from branch_warehouses where warehouse_id = p_from_warehouse_id and is_default = true limit 1; if v_from_branch_id is null then select branch_id into v_from_branch_id from branch_warehouses where warehouse_id = p_from_warehouse_id limit 1; end if; loop v_code := public.gen_product_transfer_code(); exit when not exists (select 1 from product_transfer_requests where code = v_code); v_attempts := v_attempts + 1; if v_attempts > 8 then raise exception 'could not generate unique transfer code'; end if; end loop; insert into product_transfer_requests (code, product_id, item_no, description, from_warehouse_id, from_branch_id, to_warehouse_id, to_branch_id, qty_requested, payment_method, payment_provider, delivery_type, requested_by, requested_by_code, note) values (v_code, p_product_id, v_item_no, v_description, p_from_warehouse_id, v_from_branch_id, v_dest_branch_id, v_dest_warehouse_id, p_qty, p_payment_method, p_payment_provider, p_delivery_type, p_requester_staff_id, p_requester_code, p_note); return v_code; end; $$;
grant execute on function public.request_product_transfer(uuid, uuid, int, text, text, text, uuid, text, text) to anon, authenticated;

-- 4) RPC: RECEIVE a product transfer (atomic stock move, STRICT)
--     - locks the row so two clients can't double-receive
--     - requires both source AND destination product rows to exist;
--       raises if either is missing instead of silently skipping.
create or replace function public.receive_product_transfer(p_id uuid, p_receiver_staff_id uuid, p_receiver_code text, p_qty_received int, p_payment_confirmed boolean) returns void language plpgsql security definer set search_path = public, extensions as $$ declare v_req record; v_source_id uuid; v_source_stock int; begin select * into v_req from product_transfer_requests where id = p_id for update; if v_req.id is null then raise exception 'transfer not found'; end if; if v_req.status <> 'pending' then raise exception 'transfer is not pending (current: %)', v_req.status; end if; if not exists (select 1 from staff where id = p_receiver_staff_id and (staff_code = p_receiver_code or staff_code is null)) then raise exception 'receiver staff code does not match'; end if; if p_qty_received is null or p_qty_received <= 0 then raise exception 'received quantity must be greater than zero'; end if; if p_qty_received > v_req.qty_requested then raise exception 'received quantity (%) cannot exceed requested (%)', p_qty_received, v_req.qty_requested; end if; if v_req.product_id is null then raise exception 'destination product row is missing — cannot complete receive'; end if; select id, stock into v_source_id, v_source_stock from products where warehouse_id = v_req.from_warehouse_id and item_no = v_req.item_no limit 1; if v_source_id is null then raise exception 'source warehouse no longer has product % — cannot complete receive', v_req.item_no; end if; if v_source_stock < p_qty_received then raise exception 'source warehouse has only % unit(s) — cannot receive %', v_source_stock, p_qty_received; end if; update products set stock = stock - p_qty_received where id = v_source_id; update products set stock = stock + p_qty_received where id = v_req.product_id; update product_transfer_requests set status = 'received', qty_received = p_qty_received, received_by = p_receiver_staff_id, received_by_code = p_receiver_code, payment_confirmed = coalesce(p_payment_confirmed, false), received_at = now() where id = p_id; end; $$;
grant execute on function public.receive_product_transfer(uuid, uuid, text, int, boolean) to anon, authenticated;

-- 5) RPC: CANCEL a pending transfer ---------------------------
create or replace function public.cancel_product_transfer(p_id uuid, p_by_staff_id uuid, p_reason text) returns void language plpgsql security definer set search_path = public, extensions as $$ declare v_status text; begin select status into v_status from product_transfer_requests where id = p_id for update; if v_status is null then raise exception 'transfer not found'; end if; if v_status <> 'pending' then raise exception 'only pending transfers can be cancelled (current: %)', v_status; end if; update product_transfer_requests set status = 'cancelled', cancelled_at = now(), cancelled_by = p_by_staff_id, cancel_reason = p_reason where id = p_id; end; $$;
grant execute on function public.cancel_product_transfer(uuid, uuid, text) to anon, authenticated;

-- 6) RLS ------------------------------------------------------
alter table public.product_transfer_requests enable row level security;
drop policy if exists "pt_read"  on public.product_transfer_requests;
drop policy if exists "pt_write" on public.product_transfer_requests;
create policy "pt_read"  on public.product_transfer_requests for select using (true);
create policy "pt_write" on public.product_transfer_requests for all using (true) with check (true);

-- 7) Realtime publication -------------------------------------
do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_transfer_requests') then execute 'alter publication supabase_realtime add table public.product_transfer_requests'; end if; end $$;


-- ============================================================
-- SECTION: add-phase2-payment-accounts.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 2: Payment Accounts
-- Multi-method payment destinations (bank, momo, pos, cash) the
-- Director can register and assign to branches. Used in the
-- product-transfer Request modal so a requester picks the account
-- they paid to (or sees where to pay if they haven't yet).
-- Safe to re-run.
-- ============================================================

-- 1) TABLE: payment_accounts ----------------------------------
create table if not exists public.payment_accounts ( id uuid primary key default gen_random_uuid(), method text not null check (method in ('cash','momo','pos','bank')), provider text not null, account_name text not null, account_number text not null, notes text, is_global boolean not null default false, created_at timestamptz not null default now(), created_by uuid references public.staff(id) on delete set null );

create unique index if not exists pa_unique_idx on public.payment_accounts(method, provider, account_number);
create index if not exists pa_method_idx on public.payment_accounts(method);
create index if not exists pa_global_idx on public.payment_accounts(is_global) where is_global = true;

-- 2) TABLE: payment_account_branches (many-to-many) ----------
create table if not exists public.payment_account_branches ( payment_account_id uuid not null references public.payment_accounts(id) on delete cascade, branch_id uuid not null references public.branches(id) on delete cascade, primary key (payment_account_id, branch_id) );
create index if not exists pab_branch_idx on public.payment_account_branches(branch_id);

-- 3) ALTER product_transfer_requests: which account was paid to
alter table public.product_transfer_requests add column if not exists payment_account_id uuid references public.payment_accounts(id) on delete set null;
create index if not exists pt_payment_account_idx on public.product_transfer_requests(payment_account_id);

-- 4) RPC: list accounts available for a branch (global + linked)
create or replace function public.payment_accounts_for_branch(p_branch_id uuid) returns table (id uuid, method text, provider text, account_name text, account_number text, notes text, is_global boolean, created_at timestamptz) language sql stable security definer set search_path = public as $$ select pa.id, pa.method, pa.provider, pa.account_name, pa.account_number, pa.notes, pa.is_global, pa.created_at from public.payment_accounts pa where pa.is_global = true or exists (select 1 from public.payment_account_branches pab where pab.payment_account_id = pa.id and pab.branch_id = p_branch_id) order by pa.is_global desc, pa.method, pa.provider; $$;
grant execute on function public.payment_accounts_for_branch(uuid) to anon, authenticated;

-- 5) RLS ------------------------------------------------------
alter table public.payment_accounts enable row level security;
alter table public.payment_account_branches enable row level security;
drop policy if exists "pa_read"  on public.payment_accounts;
drop policy if exists "pa_write" on public.payment_accounts;
create policy "pa_read"  on public.payment_accounts for select using (true);
create policy "pa_write" on public.payment_accounts for all using (true) with check (true);
drop policy if exists "pab_read"  on public.payment_account_branches;
drop policy if exists "pab_write" on public.payment_account_branches;
create policy "pab_read"  on public.payment_account_branches for select using (true);
create policy "pab_write" on public.payment_account_branches for all using (true) with check (true);


-- ============================================================
-- SECTION: add-phase2-multi-mgr.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 2: Multi-branch / multi-warehouse manager
-- A single staff member can be the manager of many branches (or
-- many warehouses), or be flagged as "manages all branches" /
-- "manages all warehouses" for a super-manager.
-- Implicit many-to-many via the manager_staff_id column on each
-- branch / warehouse row — no extra join table.
-- Safe to re-run.
-- ============================================================

-- 1) branches.manager_staff_id mirrors warehouses.manager_staff_id
alter table public.branches add column if not exists manager_staff_id uuid references public.staff(id) on delete set null;
create index if not exists branches_manager_idx on public.branches(manager_staff_id);

-- 2) staff "manages all" flags ---------------------------------
alter table public.staff add column if not exists manages_all_branches   boolean not null default false;
alter table public.staff add column if not exists manages_all_warehouses boolean not null default false;

-- 3) RPC: return the set of branch ids a staff member manages --
-- Logic:
--   - if manages_all_branches OR is_admin -> every branch
--   - else: their home branch + every branch where manager_staff_id matches them
create or replace function public.staff_managed_branch_ids(p_staff_id uuid) returns setof uuid language plpgsql stable security definer set search_path = public as $$ declare v_super boolean; v_home uuid; begin select coalesce(manages_all_branches, false) or coalesce(is_admin, false), branch_id into v_super, v_home from staff where id = p_staff_id; if v_super then return query select id from branches order by name; return; end if; return query select id from branches where id = v_home or manager_staff_id = p_staff_id; end; $$;
grant execute on function public.staff_managed_branch_ids(uuid) to anon, authenticated;

-- 4) RPC: same for warehouses ----------------------------------
create or replace function public.staff_managed_warehouse_ids(p_staff_id uuid) returns setof uuid language plpgsql stable security definer set search_path = public as $$ declare v_super boolean; v_home uuid; begin select coalesce(manages_all_warehouses, false) or coalesce(is_admin, false), warehouse_id into v_super, v_home from staff where id = p_staff_id; if v_super then return query select id from warehouses order by name; return; end if; return query select id from warehouses where id = v_home or manager_staff_id = p_staff_id; end; $$;
grant execute on function public.staff_managed_warehouse_ids(uuid) to anon, authenticated;

-- 5) Extend create_staff / update_staff to accept the new flags
create or replace function public.create_staff(p_email text, p_password text, p_name text, p_role text, p_branch_id uuid, p_is_admin boolean, p_manages_all_branches boolean default false, p_manages_all_warehouses boolean default false) returns uuid language plpgsql security definer set search_path = public, extensions as $$ declare new_id uuid; normalized text; begin normalized := public.normalize_role(p_role); if coalesce(p_is_admin, false) then normalized := 'admin'; end if; insert into public.staff (email, password_hash, name, role, branch_id, is_admin, manages_all_branches, manages_all_warehouses) values (lower(p_email), extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10)), p_name, normalized, p_branch_id, normalized = 'admin', coalesce(p_manages_all_branches, false), coalesce(p_manages_all_warehouses, false)) returning id into new_id; return new_id; end; $$;
grant execute on function public.create_staff(text, text, text, text, uuid, boolean, boolean, boolean) to anon, authenticated;

create or replace function public.update_staff(p_id uuid, p_email text, p_password text, p_name text, p_role text, p_branch_id uuid, p_is_admin boolean, p_manages_all_branches boolean default false, p_manages_all_warehouses boolean default false) returns void language plpgsql security definer set search_path = public, extensions as $$ declare normalized text; begin normalized := public.normalize_role(p_role); if coalesce(p_is_admin, false) then normalized := 'admin'; end if; if p_password is not null and length(p_password) > 0 then update public.staff set email = lower(p_email), name = p_name, role = normalized, branch_id = p_branch_id, is_admin = (normalized = 'admin'), manages_all_branches = coalesce(p_manages_all_branches, false), manages_all_warehouses = coalesce(p_manages_all_warehouses, false), password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10)) where id = p_id; else update public.staff set email = lower(p_email), name = p_name, role = normalized, branch_id = p_branch_id, is_admin = (normalized = 'admin'), manages_all_branches = coalesce(p_manages_all_branches, false), manages_all_warehouses = coalesce(p_manages_all_warehouses, false) where id = p_id; end if; end; $$;
grant execute on function public.update_staff(uuid, text, text, text, text, uuid, boolean, boolean, boolean) to anon, authenticated;

-- 6) verify_login + staff_view extended with the new flags ----
drop view if exists public.staff_view cascade;
create view public.staff_view as select s.id, s.email, s.name, s.role, s.branch_id, s.is_admin, s.created_at, b.name as branch_name, s.warehouse_id, s.staff_code, s.session_version, w.name as warehouse_name, s.manages_all_branches, s.manages_all_warehouses from public.staff s left join public.branches b on b.id = s.branch_id left join public.warehouses w on w.id = s.warehouse_id;
grant select on public.staff_view to anon, authenticated;

drop function if exists public.verify_login(text, text);
create function public.verify_login(p_email text, p_password text) returns table (id uuid, email text, name text, role text, branch_id uuid, branch_name text, is_admin boolean, staff_code text, session_version int, warehouse_id uuid, warehouse_name text, manages_all_branches boolean, manages_all_warehouses boolean) language plpgsql security definer set search_path = public, extensions as $$ begin return query select s.id, s.email, s.name, s.role, s.branch_id, b.name as branch_name, s.is_admin, s.staff_code, s.session_version, s.warehouse_id, w.name as warehouse_name, s.manages_all_branches, s.manages_all_warehouses from public.staff s left join public.branches b on b.id = s.branch_id left join public.warehouses w on w.id = s.warehouse_id where lower(s.email) = lower(p_email) and s.password_hash = extensions.crypt(p_password, s.password_hash); end; $$;
grant execute on function public.verify_login(text, text) to anon, authenticated;


-- ============================================================
-- SECTION: add-phase3-orders.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 3: Customer Orders / Invoices / POS
-- Showroom staff initiates an order, prints a branded invoice with
-- a single-use code. Warehouse manager validates the code and (on
-- pass) atomically dispatches the goods, decrementing stock.
-- All sales are recorded with full snapshots so historical data
-- survives product / payment-account / staff deletions.
-- Safe to re-run.
-- ============================================================

-- 1) ORDER HEADER --------------------------------------------
create table if not exists public.customer_orders ( id uuid primary key default gen_random_uuid(), code text unique not null, invoice_code text unique not null, branch_id uuid references public.branches(id) on delete set null, warehouse_id uuid references public.warehouses(id) on delete set null, client_name text not null, client_phone text, client_email text, initiated_by uuid references public.staff(id) on delete set null, initiated_by_code text, payment_method text check (payment_method in ('cash','momo','pos','bank')), payment_provider text, payment_account_id uuid references public.payment_accounts(id) on delete set null, payment_confirmed boolean default false, subtotal numeric not null default 0, total numeric not null default 0, status text not null default 'pending' check (status in ('pending','fulfilled','cancelled')), validated_by uuid references public.staff(id) on delete set null, validated_by_code text, validated_at timestamptz, fulfilled_at timestamptz, cancelled_at timestamptz, cancelled_by uuid references public.staff(id) on delete set null, cancel_reason text, note text, created_at timestamptz not null default now() );
create index if not exists co_branch_idx on public.customer_orders(branch_id);
create index if not exists co_warehouse_idx on public.customer_orders(warehouse_id);
create index if not exists co_status_idx on public.customer_orders(status);
create index if not exists co_created_idx on public.customer_orders(created_at desc);

-- 2) ORDER LINE ITEMS ----------------------------------------
create table if not exists public.customer_order_items ( id uuid primary key default gen_random_uuid(), order_id uuid not null references public.customer_orders(id) on delete cascade, product_id uuid references public.products(id) on delete set null, item_no_snap text, description_snap text, qty int not null check (qty > 0), unit_price numeric not null default 0, subtotal numeric not null default 0, source text not null default 'warehouse' check (source in ('warehouse','showroom')), source_warehouse_id uuid references public.warehouses(id) on delete set null );
create index if not exists coi_order_idx on public.customer_order_items(order_id);
create index if not exists coi_product_idx on public.customer_order_items(product_id);

-- 3) VALIDATION AUDIT LOG -------------------------------------
create table if not exists public.order_validations ( id uuid primary key default gen_random_uuid(), order_id uuid references public.customer_orders(id) on delete set null, code_used text, warehouse_id uuid references public.warehouses(id) on delete set null, validated_by uuid references public.staff(id) on delete set null, validated_by_code text, result text not null check (result in ('pass','fail_wrong_warehouse','fail_already_used','fail_cancelled','fail_not_found','fail_other')), detail text, created_at timestamptz not null default now() );
create index if not exists ov_order_idx on public.order_validations(order_id);
create index if not exists ov_when_idx on public.order_validations(created_at desc);

-- 4) RPC: invoice code generator -----------------------------
create or replace function public.gen_invoice_code(p_branch_id uuid) returns text language plpgsql volatile as $$ declare alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; result text := ''; i int; v_initial text; begin select upper(coalesce(substring(name from 1 for 1), 'X')) into v_initial from branches where id = p_branch_id; if v_initial is null then v_initial := 'X'; end if; for i in 1..6 loop result := result || substr(alphabet, 1 + floor(random() * 32)::int, 1); end loop; return 'INV-' || v_initial || '-' || to_char(now(), 'YYYYMMDD') || '-' || result; end; $$;
grant execute on function public.gen_invoice_code(uuid) to anon, authenticated;

create or replace function public.gen_order_code() returns text language plpgsql volatile as $$ declare alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; result text := ''; i int; begin for i in 1..6 loop result := result || substr(alphabet, 1 + floor(random() * 32)::int, 1); end loop; return 'CO-' || to_char(now(), 'YYYYMMDD') || '-' || result; end; $$;
grant execute on function public.gen_order_code() to anon, authenticated;

-- 5) RPC: create_customer_order -------------------------------
-- p_items: jsonb array of { product_id, item_no, description, qty,
-- unit_price, source ('warehouse'/'showroom'), source_warehouse_id }
create or replace function public.create_customer_order(p_branch_id uuid, p_warehouse_id uuid, p_client_name text, p_client_phone text, p_client_email text, p_initiated_by uuid, p_initiated_by_code text, p_payment_method text, p_payment_provider text, p_payment_account_id uuid, p_payment_confirmed boolean, p_note text, p_items jsonb) returns table (id uuid, code text, invoice_code text) language plpgsql security definer set search_path = public, extensions as $$ declare v_order_id uuid; v_code text; v_invoice text; v_subtotal numeric := 0; v_attempts int := 0; v_item jsonb; v_qty int; v_price numeric; v_line numeric; begin if not exists (select 1 from staff where id = p_initiated_by and (staff_code = p_initiated_by_code or staff_code is null)) then raise exception 'staff code does not match initiator'; end if; if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'order must have at least one item'; end if; loop v_code := public.gen_order_code(); exit when not exists (select 1 from customer_orders where code = v_code); v_attempts := v_attempts + 1; if v_attempts > 8 then raise exception 'could not generate unique order code'; end if; end loop; v_attempts := 0; loop v_invoice := public.gen_invoice_code(p_branch_id); exit when not exists (select 1 from customer_orders where invoice_code = v_invoice); v_attempts := v_attempts + 1; if v_attempts > 8 then raise exception 'could not generate unique invoice code'; end if; end loop; for v_item in select * from jsonb_array_elements(p_items) loop v_qty := coalesce((v_item->>'qty')::int, 0); v_price := coalesce((v_item->>'unit_price')::numeric, 0); v_subtotal := v_subtotal + (v_qty * v_price); end loop; insert into customer_orders (code, invoice_code, branch_id, warehouse_id, client_name, client_phone, client_email, initiated_by, initiated_by_code, payment_method, payment_provider, payment_account_id, payment_confirmed, subtotal, total, note) values (v_code, v_invoice, p_branch_id, p_warehouse_id, p_client_name, p_client_phone, p_client_email, p_initiated_by, p_initiated_by_code, p_payment_method, p_payment_provider, p_payment_account_id, coalesce(p_payment_confirmed, false), v_subtotal, v_subtotal, p_note) returning id into v_order_id; for v_item in select * from jsonb_array_elements(p_items) loop v_qty := coalesce((v_item->>'qty')::int, 0); v_price := coalesce((v_item->>'unit_price')::numeric, 0); v_line := v_qty * v_price; insert into customer_order_items (order_id, product_id, item_no_snap, description_snap, qty, unit_price, subtotal, source, source_warehouse_id) values (v_order_id, nullif(v_item->>'product_id','')::uuid, v_item->>'item_no', v_item->>'description', v_qty, v_price, v_line, coalesce(v_item->>'source', 'warehouse'), nullif(v_item->>'source_warehouse_id','')::uuid); end loop; return query select v_order_id, v_code, v_invoice; end; $$;
grant execute on function public.create_customer_order(uuid, uuid, text, text, text, uuid, text, text, text, uuid, boolean, text, jsonb) to anon, authenticated;

-- 6) RPC: validate_invoice_code (read-only, records every attempt)
create or replace function public.validate_invoice_code(p_code text, p_warehouse_id uuid, p_validator_id uuid, p_validator_code text) returns table (result text, detail text, order_id uuid, order_code text, status text, validated_at timestamptz, validated_by_code text) language plpgsql security definer set search_path = public, extensions as $$ declare v_order record; v_res text; v_detail text; begin if not exists (select 1 from staff where id = p_validator_id and (staff_code = p_validator_code or staff_code is null)) then raise exception 'validator staff code does not match'; end if; select * into v_order from customer_orders where invoice_code = p_code limit 1; if v_order.id is null then v_res := 'fail_not_found'; v_detail := 'No order with invoice code ' || p_code; insert into order_validations (code_used, warehouse_id, validated_by, validated_by_code, result, detail) values (p_code, p_warehouse_id, p_validator_id, p_validator_code, v_res, v_detail); return query select v_res, v_detail, null::uuid, null::text, null::text, null::timestamptz, null::text; return; end if; if v_order.status = 'cancelled' then v_res := 'fail_cancelled'; v_detail := 'Order ' || v_order.code || ' is cancelled.'; insert into order_validations (order_id, code_used, warehouse_id, validated_by, validated_by_code, result, detail) values (v_order.id, p_code, p_warehouse_id, p_validator_id, p_validator_code, v_res, v_detail); return query select v_res, v_detail, v_order.id, v_order.code, v_order.status, v_order.validated_at, v_order.validated_by_code; return; end if; if v_order.status = 'fulfilled' then v_res := 'fail_already_used'; v_detail := 'Invoice already used on ' || coalesce(to_char(v_order.fulfilled_at, 'YYYY-MM-DD HH24:MI'), '?') || ' by ' || coalesce(v_order.validated_by_code, '?'); insert into order_validations (order_id, code_used, warehouse_id, validated_by, validated_by_code, result, detail) values (v_order.id, p_code, p_warehouse_id, p_validator_id, p_validator_code, v_res, v_detail); return query select v_res, v_detail, v_order.id, v_order.code, v_order.status, v_order.validated_at, v_order.validated_by_code; return; end if; if v_order.warehouse_id is not null and v_order.warehouse_id <> p_warehouse_id then v_res := 'fail_wrong_warehouse'; v_detail := 'Invoice is for a different warehouse.'; insert into order_validations (order_id, code_used, warehouse_id, validated_by, validated_by_code, result, detail) values (v_order.id, p_code, p_warehouse_id, p_validator_id, p_validator_code, v_res, v_detail); return query select v_res, v_detail, v_order.id, v_order.code, v_order.status, v_order.validated_at, v_order.validated_by_code; return; end if; v_res := 'pass'; v_detail := 'Order pending fulfilment. Verify contents and confirm to dispatch.'; insert into order_validations (order_id, code_used, warehouse_id, validated_by, validated_by_code, result, detail) values (v_order.id, p_code, p_warehouse_id, p_validator_id, p_validator_code, v_res, v_detail); return query select v_res, v_detail, v_order.id, v_order.code, v_order.status, v_order.validated_at, v_order.validated_by_code; end; $$;
grant execute on function public.validate_invoice_code(text, uuid, uuid, text) to anon, authenticated;

-- 7) RPC: fulfill_customer_order (atomic stock move) ---------
create or replace function public.fulfill_customer_order(p_order_id uuid, p_validator_id uuid, p_validator_code text) returns void language plpgsql security definer set search_path = public, extensions as $$ declare v_order record; v_item record; v_source_id uuid; v_source_stock int; begin select * into v_order from customer_orders where id = p_order_id for update; if v_order.id is null then raise exception 'order not found'; end if; if v_order.status <> 'pending' then raise exception 'order is not pending (current: %)', v_order.status; end if; if not exists (select 1 from staff where id = p_validator_id and (staff_code = p_validator_code or staff_code is null)) then raise exception 'validator staff code does not match'; end if; for v_item in select * from customer_order_items where order_id = p_order_id loop if v_item.source_warehouse_id is not null then v_source_id := (select id from products where warehouse_id = v_item.source_warehouse_id and (item_no = v_item.item_no_snap or id = v_item.product_id) limit 1); else v_source_id := v_item.product_id; end if; if v_source_id is null then raise exception 'cannot locate source product row for line "%s"', coalesce(v_item.item_no_snap, '?'); end if; select stock into v_source_stock from products where id = v_source_id; if v_source_stock < v_item.qty then raise exception 'source has only % unit(s) of % — cannot fulfil %', v_source_stock, coalesce(v_item.item_no_snap, '?'), v_item.qty; end if; update products set stock = stock - v_item.qty where id = v_source_id; end loop; update customer_orders set status = 'fulfilled', validated_by = p_validator_id, validated_by_code = p_validator_code, validated_at = now(), fulfilled_at = now() where id = p_order_id; end; $$;
grant execute on function public.fulfill_customer_order(uuid, uuid, text) to anon, authenticated;

-- 8) RPC: cancel_customer_order ------------------------------
create or replace function public.cancel_customer_order(p_order_id uuid, p_by_staff_id uuid, p_reason text) returns void language plpgsql security definer set search_path = public, extensions as $$ declare v_status text; begin select status into v_status from customer_orders where id = p_order_id for update; if v_status is null then raise exception 'order not found'; end if; if v_status <> 'pending' then raise exception 'only pending orders can be cancelled (current: %)', v_status; end if; update customer_orders set status = 'cancelled', cancelled_at = now(), cancelled_by = p_by_staff_id, cancel_reason = p_reason where id = p_order_id; end; $$;
grant execute on function public.cancel_customer_order(uuid, uuid, text) to anon, authenticated;

-- 9) RLS ------------------------------------------------------
alter table public.customer_orders enable row level security;
alter table public.customer_order_items enable row level security;
alter table public.order_validations enable row level security;
drop policy if exists "co_read"  on public.customer_orders;
drop policy if exists "co_write" on public.customer_orders;
create policy "co_read"  on public.customer_orders for select using (true);
create policy "co_write" on public.customer_orders for all using (true) with check (true);
drop policy if exists "coi_read"  on public.customer_order_items;
drop policy if exists "coi_write" on public.customer_order_items;
create policy "coi_read"  on public.customer_order_items for select using (true);
create policy "coi_write" on public.customer_order_items for all using (true) with check (true);
drop policy if exists "ov_read"  on public.order_validations;
drop policy if exists "ov_write" on public.order_validations;
create policy "ov_read"  on public.order_validations for select using (true);
create policy "ov_write" on public.order_validations for all using (true) with check (true);

-- 10) Realtime publication -----------------------------------
do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_orders') then execute 'alter publication supabase_realtime add table public.customer_orders'; end if; end $$;


-- ============================================================
-- SECTION: add-phase3-system-manager.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 3 fix: System Manager role
-- A 5th role with absolute control, identical to admin/Director.
-- Use case: technical / operations lead who runs the system but
-- isn't necessarily the business "Director".
-- ============================================================

-- 1) Extend the role enum check ------------------------------
alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff add constraint staff_role_check check (role in ('staff','branch_manager','warehouse_manager','admin','system_manager'));

-- 2) Update normalize_role to accept the new value ----------
create or replace function public.normalize_role(p_in text) returns text language sql immutable as $$ select case lower(coalesce(trim(p_in), '')) when 'admin' then 'admin' when 'director' then 'admin' when 'system manager' then 'system_manager' when 'system_manager' then 'system_manager' when 'sysadmin' then 'system_manager' when 'branch manager' then 'branch_manager' when 'branch_manager' then 'branch_manager' when 'warehouse manager' then 'warehouse_manager' when 'warehouse_manager' then 'warehouse_manager' when 'staff' then 'staff' else 'staff' end; $$;
grant execute on function public.normalize_role(text) to anon, authenticated;

-- 3) System Manager is "super" — treat as admin for is_admin ----
-- assign_role bumps session_version + keeps is_admin synced for any
-- super role (admin or system_manager).
create or replace function public.assign_role(p_staff_id uuid, p_new_role text, p_changed_by uuid) returns void language plpgsql security definer set search_path = public, extensions as $$ declare old_role text; subject_name text; actor_name text; normalized text; v_super boolean; begin normalized := public.normalize_role(p_new_role); v_super := normalized in ('admin','system_manager'); select role, name into old_role, subject_name from staff where id = p_staff_id; select name into actor_name from staff where id = p_changed_by; update staff set role = normalized, is_admin = v_super, session_version = session_version + 1 where id = p_staff_id; insert into product_logs (action, staff_id, staff_name, note) values ('role_assigned', p_changed_by, actor_name, coalesce(subject_name, '?') || ': ' || coalesce(old_role, 'staff') || ' -> ' || normalized); end; $$;
grant execute on function public.assign_role(uuid, text, uuid) to anon, authenticated;

-- 4) create_staff / update_staff: same super treatment ------
create or replace function public.create_staff(p_email text, p_password text, p_name text, p_role text, p_branch_id uuid, p_is_admin boolean, p_manages_all_branches boolean default false, p_manages_all_warehouses boolean default false) returns uuid language plpgsql security definer set search_path = public, extensions as $$ declare new_id uuid; normalized text; v_super boolean; begin normalized := public.normalize_role(p_role); if coalesce(p_is_admin, false) then normalized := 'admin'; end if; v_super := normalized in ('admin','system_manager'); insert into public.staff (email, password_hash, name, role, branch_id, is_admin, manages_all_branches, manages_all_warehouses) values (lower(p_email), extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10)), p_name, normalized, p_branch_id, v_super, coalesce(p_manages_all_branches, false), coalesce(p_manages_all_warehouses, false)) returning id into new_id; return new_id; end; $$;
grant execute on function public.create_staff(text, text, text, text, uuid, boolean, boolean, boolean) to anon, authenticated;

create or replace function public.update_staff(p_id uuid, p_email text, p_password text, p_name text, p_role text, p_branch_id uuid, p_is_admin boolean, p_manages_all_branches boolean default false, p_manages_all_warehouses boolean default false) returns void language plpgsql security definer set search_path = public, extensions as $$ declare normalized text; v_super boolean; begin normalized := public.normalize_role(p_role); if coalesce(p_is_admin, false) then normalized := 'admin'; end if; v_super := normalized in ('admin','system_manager'); if p_password is not null and length(p_password) > 0 then update public.staff set email = lower(p_email), name = p_name, role = normalized, branch_id = p_branch_id, is_admin = v_super, manages_all_branches = coalesce(p_manages_all_branches, false), manages_all_warehouses = coalesce(p_manages_all_warehouses, false), password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10)) where id = p_id; else update public.staff set email = lower(p_email), name = p_name, role = normalized, branch_id = p_branch_id, is_admin = v_super, manages_all_branches = coalesce(p_manages_all_branches, false), manages_all_warehouses = coalesce(p_manages_all_warehouses, false) where id = p_id; end if; end; $$;
grant execute on function public.update_staff(uuid, text, text, text, text, uuid, boolean, boolean, boolean) to anon, authenticated;

-- 5) Super-manager helpers: System Manager sees everything ---
-- staff_managed_branch_ids / staff_managed_warehouse_ids extended
-- to grant 'ALL' to system_manager as well as admin.
create or replace function public.staff_managed_branch_ids(p_staff_id uuid) returns setof uuid language plpgsql stable security definer set search_path = public as $$ declare v_super boolean; v_role text; v_home uuid; begin select role, coalesce(manages_all_branches, false) or coalesce(is_admin, false), branch_id into v_role, v_super, v_home from staff where id = p_staff_id; if v_role = 'system_manager' then v_super := true; end if; if v_super then return query select id from branches order by name; return; end if; return query select id from branches where id = v_home or manager_staff_id = p_staff_id; end; $$;
grant execute on function public.staff_managed_branch_ids(uuid) to anon, authenticated;

create or replace function public.staff_managed_warehouse_ids(p_staff_id uuid) returns setof uuid language plpgsql stable security definer set search_path = public as $$ declare v_super boolean; v_role text; v_home uuid; begin select role, coalesce(manages_all_warehouses, false) or coalesce(is_admin, false), warehouse_id into v_role, v_super, v_home from staff where id = p_staff_id; if v_role = 'system_manager' then v_super := true; end if; if v_super then return query select id from warehouses order by name; return; end if; return query select id from warehouses where id = v_home or manager_staff_id = p_staff_id; end; $$;
grant execute on function public.staff_managed_warehouse_ids(uuid) to anon, authenticated;


-- ============================================================
-- SECTION: add-phase3-delivery-info.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 3 add-on: transfer delivery info
-- Adds external-delivery details to product_transfer_requests
-- and extends the request RPC to accept them.
-- Safe to re-run.
-- ============================================================

-- 1) Add columns ---------------------------------------------
alter table public.product_transfer_requests
    add column if not exists delivery_address text,
    add column if not exists delivery_recipient_name text,
    add column if not exists delivery_recipient_phone text;

-- 2) Replace the request RPC so the client can pass the new
--    fields atomically. Internal deliveries leave them null.
create or replace function public.request_product_transfer(
    p_product_id uuid,
    p_from_warehouse_id uuid,
    p_qty int,
    p_payment_method text,
    p_payment_provider text,
    p_delivery_type text,
    p_requester_staff_id uuid,
    p_requester_code text,
    p_note text,
    p_delivery_address text default null,
    p_delivery_recipient_name text default null,
    p_delivery_recipient_phone text default null
) returns text language plpgsql security definer set search_path = public, extensions as $$
declare
    v_code text;
    v_item_no text;
    v_description text;
    v_dest_warehouse_id uuid;
    v_dest_branch_id uuid;
    v_from_branch_id uuid;
    v_attempts int := 0;
begin
    if not exists (
        select 1 from staff
        where id = p_requester_staff_id
          and (staff_code = p_requester_code or staff_code is null)
    ) then
        raise exception 'staff code does not match requester';
    end if;
    if p_qty is null or p_qty <= 0 then
        raise exception 'quantity must be greater than zero';
    end if;
    select item_no, description, warehouse_id, branch_id
      into v_item_no, v_description, v_dest_warehouse_id, v_dest_branch_id
    from products where id = p_product_id;
    if v_item_no is null and v_description is null then
        raise exception 'product not found';
    end if;
    if v_dest_warehouse_id = p_from_warehouse_id then
        raise exception 'source and destination warehouse must differ';
    end if;
    if p_delivery_type = 'external'
       and (p_delivery_recipient_phone is null or btrim(p_delivery_recipient_phone) = '') then
        raise exception 'external delivery requires a recipient phone number';
    end if;
    select branch_id into v_from_branch_id
    from branch_warehouses
    where warehouse_id = p_from_warehouse_id and is_default = true
    limit 1;
    if v_from_branch_id is null then
        select branch_id into v_from_branch_id
        from branch_warehouses
        where warehouse_id = p_from_warehouse_id
        limit 1;
    end if;
    loop
        v_code := public.gen_product_transfer_code();
        exit when not exists (select 1 from product_transfer_requests where code = v_code);
        v_attempts := v_attempts + 1;
        if v_attempts > 8 then
            raise exception 'could not generate unique transfer code';
        end if;
    end loop;
    insert into product_transfer_requests (
        code, product_id, item_no, description,
        from_warehouse_id, from_branch_id,
        to_warehouse_id, to_branch_id,
        qty_requested, payment_method, payment_provider, delivery_type,
        requested_by, requested_by_code, note,
        delivery_address, delivery_recipient_name, delivery_recipient_phone
    ) values (
        v_code, p_product_id, v_item_no, v_description,
        p_from_warehouse_id, v_from_branch_id,
        v_dest_branch_id, v_dest_warehouse_id,
        p_qty, p_payment_method, p_payment_provider, p_delivery_type,
        p_requester_staff_id, p_requester_code, p_note,
        case when p_delivery_type = 'external' then nullif(btrim(p_delivery_address), '') else null end,
        case when p_delivery_type = 'external' then nullif(btrim(p_delivery_recipient_name), '') else null end,
        case when p_delivery_type = 'external' then nullif(btrim(p_delivery_recipient_phone), '') else null end
    );
    return v_code;
end;
$$;
grant execute on function public.request_product_transfer(uuid, uuid, int, text, text, text, uuid, text, text, text, text, text) to anon, authenticated;


-- ============================================================
-- SECTION: add-phase4-foundations.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 4
--   1. Dev/Live mode foundation  (`mode` column on data tables)
--   2. Director / System Manager: move transfer without payment
--   3. Optional staff photo (`image_url`)
--   4. Media library (gallery for re-usable images)
--
-- Safe to re-run. Run in Supabase SQL editor in one go.
-- ============================================================

-- 1) DEV/LIVE MODE ---------------------------------------------
-- Every row carries a `mode` of either 'live' or 'dev'. The client
-- filters by the current mode on every read. Existing rows default
-- to 'live' so nothing changes for current data.

do $$
declare
    t text;
    tbls text[] := array[
        'products', 'product_logs', 'branches', 'warehouses',
        'product_transfer_requests', 'customer_orders',
        'customer_order_items', 'payment_accounts', 'announcements',
        'messages', 'staff'
    ];
begin
    foreach t in array tbls loop
        if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
            execute format(
                'alter table public.%I add column if not exists mode text not null default ''live'' check (mode in (''live'',''dev''))',
                t
            );
            execute format(
                'create index if not exists %I on public.%I(mode)',
                t || '_mode_idx', t
            );
        end if;
    end loop;
end $$;

-- Helper RPC: COPY a row's dev version into live (or update live to match).
-- For now this is a generic "publish a single product" — the same pattern
-- can be replicated for any table the System Manager wants to push.
create or replace function public.publish_dev_product(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_row products%rowtype;
begin
    select * into v_row from products where id = p_id and mode = 'dev';
    if v_row.id is null then raise exception 'no dev product with that id'; end if;
    -- If a matching live row exists (same id), update it; else insert as live.
    if exists (select 1 from products where id = p_id and mode = 'live') then
        update products set
            item_no = v_row.item_no,
            description = v_row.description,
            category = v_row.category,
            material = v_row.material,
            color = v_row.color,
            dim_l = v_row.dim_l, dim_w = v_row.dim_w, dim_h = v_row.dim_h,
            price = v_row.price,
            stock = v_row.stock,
            image_url = v_row.image_url,
            supplier = v_row.supplier,
            branch_id = v_row.branch_id,
            warehouse_id = v_row.warehouse_id,
            is_draft = v_row.is_draft
        where id = p_id and mode = 'live';
    else
        insert into products select v_row.* on conflict do nothing;
        update products set mode = 'live' where id = p_id;
    end if;
end;
$$;
grant execute on function public.publish_dev_product(uuid) to anon, authenticated;

-- Helper RPC: wipe all dev rows. Used by "Reset demo data" button.
create or replace function public.reset_dev_data()
returns void language plpgsql security definer set search_path = public as $$
begin
    delete from product_logs               where mode = 'dev';
    delete from customer_order_items       where mode = 'dev';
    delete from customer_orders            where mode = 'dev';
    delete from product_transfer_requests  where mode = 'dev';
    delete from announcements              where mode = 'dev';
    delete from messages                   where mode = 'dev';
    delete from products                   where mode = 'dev';
    delete from payment_accounts           where mode = 'dev';
end;
$$;
grant execute on function public.reset_dev_data() to anon, authenticated;

-- 2) MOVE TRANSFER WITHOUT PAYMENT (Director / System Manager) --
-- A direct-move RPC: skips the request/receive ceremony.
-- Atomic: decrements FROM warehouse, increments TO warehouse,
-- creates an audit row in product_transfer_requests with status='received'
-- AND a product_logs entry. Caller must be admin or system_manager.

create or replace function public.move_stock_direct(
    p_item_no text,
    p_from_warehouse_id uuid,
    p_to_warehouse_id uuid,
    p_qty int,
    p_by_staff_id uuid,
    p_note text default null,
    p_mode text default 'live'
) returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
    v_role text;
    v_is_admin boolean;
    v_source_id uuid;
    v_source_stock int;
    v_dest_id uuid;
    v_item_no text;
    v_description text;
    v_actor_name text;
    v_from_branch uuid;
    v_to_branch uuid;
    v_code text;
    v_attempts int := 0;
    v_pt_id uuid;
begin
    -- Authorize
    select role, is_admin, name into v_role, v_is_admin, v_actor_name
    from staff where id = p_by_staff_id;
    if v_role is null then raise exception 'staff not found'; end if;
    if not (v_is_admin or v_role in ('admin','system_manager')) then
        raise exception 'only Director or System Manager can move stock without payment';
    end if;
    if p_qty is null or p_qty <= 0 then raise exception 'qty must be > 0'; end if;
    if p_from_warehouse_id = p_to_warehouse_id then raise exception 'source and destination must differ'; end if;

    -- Locate source row by item_no in FROM warehouse
    select id, stock, item_no, description
      into v_source_id, v_source_stock, v_item_no, v_description
    from products
    where warehouse_id = p_from_warehouse_id and item_no = p_item_no and mode = p_mode
    limit 1;
    if v_source_id is null then raise exception 'source warehouse does not stock item %', p_item_no; end if;
    if v_source_stock < p_qty then raise exception 'source has only % unit(s)', v_source_stock; end if;

    -- Find or create destination row (same item_no in TO warehouse)
    select id into v_dest_id
    from products
    where warehouse_id = p_to_warehouse_id and item_no = p_item_no and mode = p_mode
    limit 1;

    if v_dest_id is null then
        -- Create a destination row mirroring the source (stock 0; the move adds qty)
        select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id and is_default = true limit 1;
        if v_to_branch is null then
            select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id limit 1;
        end if;
        insert into products (
            item_no, description, category, material, color,
            dim_l, dim_w, dim_h, price, stock, image_url, supplier,
            branch_id, warehouse_id, is_draft, mode
        )
        select item_no, description, category, material, color,
               dim_l, dim_w, dim_h, price, 0, image_url, supplier,
               v_to_branch, p_to_warehouse_id, false, p_mode
        from products where id = v_source_id
        returning id into v_dest_id;
    end if;

    -- Stock move
    update products set stock = stock - p_qty where id = v_source_id;
    update products set stock = stock + p_qty where id = v_dest_id;

    -- Audit row in product_transfer_requests (status=received, no payment)
    select branch_id into v_from_branch from branch_warehouses where warehouse_id = p_from_warehouse_id and is_default = true limit 1;
    if v_from_branch is null then
        select branch_id into v_from_branch from branch_warehouses where warehouse_id = p_from_warehouse_id limit 1;
    end if;
    if v_to_branch is null then
        select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id and is_default = true limit 1;
        if v_to_branch is null then
            select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id limit 1;
        end if;
    end if;

    loop
        v_code := 'MV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
        exit when not exists (select 1 from product_transfer_requests where code = upper(v_code));
        v_attempts := v_attempts + 1;
        if v_attempts > 8 then raise exception 'could not generate code'; end if;
    end loop;
    v_code := upper(v_code);

    insert into product_transfer_requests (
        code, product_id, item_no, description,
        from_warehouse_id, from_branch_id,
        to_warehouse_id, to_branch_id,
        qty_requested, qty_received,
        payment_method, payment_confirmed,
        delivery_type, requested_by, requested_by_code,
        received_by, status, note, received_at, mode
    ) values (
        v_code, v_dest_id, v_item_no, v_description,
        p_from_warehouse_id, v_from_branch,
        p_to_warehouse_id,   v_to_branch,
        p_qty, p_qty,
        null, true,
        'internal', p_by_staff_id, null,
        p_by_staff_id, 'received',
        coalesce(p_note, 'direct move by ' || coalesce(v_actor_name, 'super-user')),
        now(), p_mode
    ) returning id into v_pt_id;

    -- Activity log
    insert into product_logs (action, staff_id, staff_name, note, mode)
    values (
        'stock_moved_direct',
        p_by_staff_id,
        v_actor_name,
        v_code || ' · ' || coalesce(v_item_no, '?') || ' · qty ' || p_qty,
        p_mode
    );

    return v_code;
end;
$$;
grant execute on function public.move_stock_direct(text, uuid, uuid, int, uuid, text, text) to anon, authenticated;

-- 3) OPTIONAL STAFF PHOTO --------------------------------------
alter table public.staff add column if not exists image_url text;
alter table public.staff add column if not exists started_at date;

-- Refresh staff_view so the new columns surface in the existing list
drop view if exists public.staff_view;
create view public.staff_view as
select s.id, s.email, s.name, s.role, s.branch_id, s.is_admin, s.created_at,
       b.name as branch_name, s.warehouse_id, s.staff_code, s.session_version,
       w.name as warehouse_name, s.manages_all_branches, s.manages_all_warehouses,
       s.image_url, s.started_at, s.mode
from public.staff s
left join public.branches b on b.id = s.branch_id
left join public.warehouses w on w.id = s.warehouse_id;
grant select on public.staff_view to anon, authenticated;

-- 4) MEDIA LIBRARY ---------------------------------------------
create table if not exists public.media_assets (
    id uuid primary key default gen_random_uuid(),
    url text not null,
    public_id text,
    filename text,
    mime text,
    bytes int,
    uploaded_by uuid references public.staff(id) on delete set null,
    uploaded_by_name text,
    note text,
    created_at timestamptz not null default now(),
    mode text not null default 'live' check (mode in ('live','dev'))
);
create index if not exists media_assets_mode_idx on public.media_assets(mode);
create index if not exists media_assets_created_idx on public.media_assets(created_at desc);

alter table public.media_assets enable row level security;
drop policy if exists "media_read"  on public.media_assets;
drop policy if exists "media_write" on public.media_assets;
create policy "media_read"  on public.media_assets for select using (true);
create policy "media_write" on public.media_assets for all using (true) with check (true);

-- 5) ID CARD SETTINGS ------------------------------------------
-- Stores the system manager's choice of card template + accent + which
-- optional fields appear. One row, keyed by id=1, easy to read/write.
create table if not exists public.id_card_settings (
    id int primary key default 1,
    template text not null default 'classic' check (template in ('classic','modern','minimal')),
    accent_color text not null default '#0369A1',
    show_email boolean not null default true,
    show_started_at boolean not null default true,
    show_qr boolean not null default true,
    enabled_for_print boolean not null default false,
    updated_at timestamptz not null default now()
);
insert into public.id_card_settings (id) values (1) on conflict (id) do nothing;
alter table public.id_card_settings enable row level security;
drop policy if exists "id_card_read"  on public.id_card_settings;
drop policy if exists "id_card_write" on public.id_card_settings;
create policy "id_card_read"  on public.id_card_settings for select using (true);
create policy "id_card_write" on public.id_card_settings for all using (true) with check (true);


-- ============================================================
-- SECTION: add-phase4-fix.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 4 fix-pack
--   * Rename `mode` -> `env` everywhere. `mode` clashes with the
--     built-in Postgres aggregate `mode()`, which triggered the
--     "WITHIN GROUP is required for ordered-set aggregate mode"
--     error on certain queries (e.g. Showroom).
--   * Seed the default System Admin account.
--   * Refresh staff_view + RPCs to use the new column name.
--
-- Safe to re-run.
-- ============================================================

-- 1) RENAME mode -> env on every table that got it -----------
do $$
declare
    t text;
    tbls text[] := array[
        'products', 'product_logs', 'branches', 'warehouses',
        'product_transfer_requests', 'customer_orders',
        'customer_order_items', 'payment_accounts', 'announcements',
        'messages', 'staff', 'media_assets'
    ];
begin
    foreach t in array tbls loop
        if exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name=t and column_name='mode') then
            execute format('alter table public.%I rename column mode to env', t);
        end if;
        if exists (select 1 from pg_indexes
                   where schemaname='public' and tablename=t and indexname=t||'_mode_idx') then
            execute format('alter index public.%I rename to %I', t||'_mode_idx', t||'_env_idx');
        end if;
    end loop;
end $$;

-- 2) staff_view rebuild with env -----------------------------
drop view if exists public.staff_view;
create view public.staff_view as
select s.id, s.email, s.name, s.role, s.branch_id, s.is_admin, s.created_at,
       b.name as branch_name, s.warehouse_id, s.staff_code, s.session_version,
       w.name as warehouse_name, s.manages_all_branches, s.manages_all_warehouses,
       s.image_url, s.started_at, s.env
from public.staff s
left join public.branches b on b.id = s.branch_id
left join public.warehouses w on w.id = s.warehouse_id;
grant select on public.staff_view to anon, authenticated;

-- 3) RPCs that used p_mode / mode are recreated with p_env / env
drop function if exists public.move_stock_direct(text, uuid, uuid, int, uuid, text, text);
create or replace function public.move_stock_direct(
    p_item_no text,
    p_from_warehouse_id uuid,
    p_to_warehouse_id uuid,
    p_qty int,
    p_by_staff_id uuid,
    p_note text default null,
    p_env text default 'live'
) returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
    v_role text; v_is_admin boolean; v_source_id uuid; v_source_stock int;
    v_dest_id uuid; v_item_no text; v_description text; v_actor_name text;
    v_from_branch uuid; v_to_branch uuid; v_code text; v_attempts int := 0;
    v_pt_id uuid;
begin
    select role, is_admin, name into v_role, v_is_admin, v_actor_name
    from staff where id = p_by_staff_id;
    if v_role is null then raise exception 'staff not found'; end if;
    if not (v_is_admin or v_role in ('admin','system_manager')) then
        raise exception 'not authorised';
    end if;
    if p_qty is null or p_qty <= 0 then raise exception 'qty must be > 0'; end if;
    if p_from_warehouse_id = p_to_warehouse_id then raise exception 'source and destination must differ'; end if;
    select id, stock, item_no, description
      into v_source_id, v_source_stock, v_item_no, v_description
    from products
    where warehouse_id = p_from_warehouse_id and item_no = p_item_no and env = p_env
    limit 1;
    if v_source_id is null then raise exception 'source warehouse does not stock item %', p_item_no; end if;
    if v_source_stock < p_qty then raise exception 'source has only % unit(s)', v_source_stock; end if;
    select id into v_dest_id
    from products
    where warehouse_id = p_to_warehouse_id and item_no = p_item_no and env = p_env
    limit 1;
    if v_dest_id is null then
        select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id and is_default = true limit 1;
        if v_to_branch is null then
            select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id limit 1;
        end if;
        insert into products (
            item_no, description, category, material, color,
            dim_l, dim_w, dim_h, price, stock, image_url, supplier,
            branch_id, warehouse_id, is_draft, env
        )
        select item_no, description, category, material, color,
               dim_l, dim_w, dim_h, price, 0, image_url, supplier,
               v_to_branch, p_to_warehouse_id, false, p_env
        from products where id = v_source_id
        returning id into v_dest_id;
    end if;
    update products set stock = stock - p_qty where id = v_source_id;
    update products set stock = stock + p_qty where id = v_dest_id;
    select branch_id into v_from_branch from branch_warehouses where warehouse_id = p_from_warehouse_id and is_default = true limit 1;
    if v_from_branch is null then
        select branch_id into v_from_branch from branch_warehouses where warehouse_id = p_from_warehouse_id limit 1;
    end if;
    if v_to_branch is null then
        select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id and is_default = true limit 1;
        if v_to_branch is null then
            select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id limit 1;
        end if;
    end if;
    loop
        v_code := 'MV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
        exit when not exists (select 1 from product_transfer_requests where code = upper(v_code));
        v_attempts := v_attempts + 1;
        if v_attempts > 8 then raise exception 'could not generate code'; end if;
    end loop;
    v_code := upper(v_code);
    insert into product_transfer_requests (
        code, product_id, item_no, description,
        from_warehouse_id, from_branch_id,
        to_warehouse_id,   to_branch_id,
        qty_requested, qty_received,
        payment_method, payment_confirmed,
        delivery_type, requested_by, requested_by_code,
        received_by, status, note, received_at, env
    ) values (
        v_code, v_dest_id, v_item_no, v_description,
        p_from_warehouse_id, v_from_branch,
        p_to_warehouse_id,   v_to_branch,
        p_qty, p_qty,
        null, true,
        'internal', p_by_staff_id, null,
        p_by_staff_id, 'received',
        coalesce(p_note, 'direct move by ' || coalesce(v_actor_name, 'super-user')),
        now(), p_env
    ) returning id into v_pt_id;
    insert into product_logs (action, staff_id, staff_name, note, env)
    values ('stock_moved_direct', p_by_staff_id, v_actor_name,
            v_code || ' · ' || coalesce(v_item_no, '?') || ' · qty ' || p_qty, p_env);
    return v_code;
end;
$$;
grant execute on function public.move_stock_direct(text, uuid, uuid, int, uuid, text, text) to anon, authenticated;

drop function if exists public.publish_dev_product(uuid);
create or replace function public.publish_dev_product(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_row products%rowtype;
begin
    select * into v_row from products where id = p_id and env = 'dev';
    if v_row.id is null then raise exception 'no dev product with that id'; end if;
    if exists (select 1 from products where id = p_id and env = 'live') then
        update products set
            item_no = v_row.item_no, description = v_row.description,
            category = v_row.category, material = v_row.material, color = v_row.color,
            dim_l = v_row.dim_l, dim_w = v_row.dim_w, dim_h = v_row.dim_h,
            price = v_row.price, stock = v_row.stock,
            image_url = v_row.image_url, supplier = v_row.supplier,
            branch_id = v_row.branch_id, warehouse_id = v_row.warehouse_id,
            is_draft = v_row.is_draft
        where id = p_id and env = 'live';
    else
        insert into products select v_row.*;
        update products set env = 'live' where id = p_id;
    end if;
end;
$$;
grant execute on function public.publish_dev_product(uuid) to anon, authenticated;

drop function if exists public.reset_dev_data();
create or replace function public.reset_dev_data()
returns void language plpgsql security definer set search_path = public as $$
begin
    delete from product_logs               where env = 'dev';
    delete from customer_order_items       where env = 'dev';
    delete from customer_orders            where env = 'dev';
    delete from product_transfer_requests  where env = 'dev';
    delete from announcements              where env = 'dev';
    delete from messages                   where env = 'dev';
    delete from products                   where env = 'dev';
    delete from payment_accounts           where env = 'dev';
    delete from media_assets               where env = 'dev';
end;
$$;
grant execute on function public.reset_dev_data() to anon, authenticated;

-- 4) Publish-everything-dev RPC: clones every dev row into live (best-effort).
-- For now: copies dev products into live. Other tables can be added as needed.
create or replace function public.publish_all_dev()
returns void language plpgsql security definer set search_path = public as $$
declare v_row products%rowtype;
begin
    for v_row in select * from products where env = 'dev' loop
        perform public.publish_dev_product(v_row.id);
    end loop;
end;
$$;
grant execute on function public.publish_all_dev() to anon, authenticated;

-- 5) Feature flags (single-row toggles managed by System Admin)
create table if not exists public.feature_flags (
    id int primary key default 1,
    transfers_enabled boolean not null default true,
    move_stock_enabled boolean not null default true,
    id_cards_visible_to_director boolean not null default false,
    director_id_card_template text not null default 'classic',
    updated_at timestamptz not null default now()
);
insert into public.feature_flags (id) values (1) on conflict (id) do nothing;
alter table public.feature_flags enable row level security;
drop policy if exists "ff_read"  on public.feature_flags;
drop policy if exists "ff_write" on public.feature_flags;
create policy "ff_read"  on public.feature_flags for select using (true);
create policy "ff_write" on public.feature_flags for all using (true) with check (true);

-- 6) Extend id_card_settings template enum + new toggles -----
alter table public.id_card_settings drop constraint if exists id_card_settings_template_check;
alter table public.id_card_settings add constraint id_card_settings_template_check check (template in ('classic','modern','minimal','heritage','bold'));
alter table public.id_card_settings add column if not exists show_branch_location boolean not null default true;

-- 7) Default System Admin account ----------------------------
-- Seeded only if not present. Password is hashed with pgcrypto.
do $$
declare v_id uuid;
begin
    if not exists (select 1 from staff where lower(email) = lower('blanc.69458@gmail.com')) then
        insert into staff (email, password_hash, name, role, is_admin)
        values (
            lower('blanc.69458@gmail.com'),
            extensions.crypt('Smart@399', extensions.gen_salt('bf'::text, 10)),
            'System Admin',
            'system_manager',
            true
        ) returning id into v_id;
    end if;
end $$;


-- ============================================================
-- SECTION: add-phase4-fix-2.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 4 fix-pack #2
--   * Fix "column reference 'id' is ambiguous" on New Sale.
--     The create_customer_order RPC declared an OUT column named
--     `id` (in RETURNS TABLE) AND referenced customer_orders.id in
--     a RETURNING clause — Postgres can't tell them apart.
--   * Also tag new sales with the current env so dev-mode orders
--     don't leak into live reads.
--
-- Safe to re-run.
-- ============================================================

drop function if exists public.create_customer_order(uuid, uuid, text, text, text, uuid, text, text, text, uuid, boolean, text, jsonb);

create or replace function public.create_customer_order(
    p_branch_id uuid,
    p_warehouse_id uuid,
    p_client_name text,
    p_client_phone text,
    p_client_email text,
    p_initiated_by uuid,
    p_initiated_by_code text,
    p_payment_method text,
    p_payment_provider text,
    p_payment_account_id uuid,
    p_payment_confirmed boolean,
    p_note text,
    p_items jsonb,
    p_env text default 'live'
) returns table (order_id uuid, order_code text, order_invoice_code text)
language plpgsql security definer set search_path = public, extensions
as $$
declare
    v_order_id uuid;
    v_code text;
    v_invoice text;
    v_subtotal numeric := 0;
    v_attempts int := 0;
    v_item jsonb;
    v_qty int;
    v_price numeric;
    v_line numeric;
    v_has_env boolean;
begin
    if not exists (
        select 1 from staff s
        where s.id = p_initiated_by
          and (s.staff_code = p_initiated_by_code or s.staff_code is null)
    ) then
        raise exception 'staff code does not match initiator';
    end if;
    if p_items is null or jsonb_array_length(p_items) = 0 then
        raise exception 'order must have at least one item';
    end if;

    -- Generate unique order + invoice codes
    loop
        v_code := public.gen_order_code();
        exit when not exists (select 1 from customer_orders co where co.code = v_code);
        v_attempts := v_attempts + 1;
        if v_attempts > 8 then raise exception 'could not generate unique order code'; end if;
    end loop;
    v_attempts := 0;
    loop
        v_invoice := public.gen_invoice_code(p_branch_id);
        exit when not exists (select 1 from customer_orders co where co.invoice_code = v_invoice);
        v_attempts := v_attempts + 1;
        if v_attempts > 8 then raise exception 'could not generate unique invoice code'; end if;
    end loop;

    -- Subtotal from items
    for v_item in select * from jsonb_array_elements(p_items) loop
        v_qty   := coalesce((v_item->>'qty')::int, 0);
        v_price := coalesce((v_item->>'unit_price')::numeric, 0);
        v_subtotal := v_subtotal + (v_qty * v_price);
    end loop;

    -- env column may or may not exist depending on which migrations have run
    select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'customer_orders' and column_name = 'env'
    ) into v_has_env;

    if v_has_env then
        insert into customer_orders (
            code, invoice_code, branch_id, warehouse_id, client_name,
            client_phone, client_email, initiated_by, initiated_by_code,
            payment_method, payment_provider, payment_account_id,
            payment_confirmed, subtotal, total, note, env
        ) values (
            v_code, v_invoice, p_branch_id, p_warehouse_id, p_client_name,
            p_client_phone, p_client_email, p_initiated_by, p_initiated_by_code,
            p_payment_method, p_payment_provider, p_payment_account_id,
            coalesce(p_payment_confirmed, false), v_subtotal, v_subtotal, p_note,
            coalesce(nullif(p_env,''), 'live')
        ) returning customer_orders.id into v_order_id;
    else
        insert into customer_orders (
            code, invoice_code, branch_id, warehouse_id, client_name,
            client_phone, client_email, initiated_by, initiated_by_code,
            payment_method, payment_provider, payment_account_id,
            payment_confirmed, subtotal, total, note
        ) values (
            v_code, v_invoice, p_branch_id, p_warehouse_id, p_client_name,
            p_client_phone, p_client_email, p_initiated_by, p_initiated_by_code,
            p_payment_method, p_payment_provider, p_payment_account_id,
            coalesce(p_payment_confirmed, false), v_subtotal, v_subtotal, p_note
        ) returning customer_orders.id into v_order_id;
    end if;

    -- Insert line items
    for v_item in select * from jsonb_array_elements(p_items) loop
        v_qty   := coalesce((v_item->>'qty')::int, 0);
        v_price := coalesce((v_item->>'unit_price')::numeric, 0);
        v_line  := v_qty * v_price;
        insert into customer_order_items (
            order_id, product_id, item_no_snap, description_snap, qty,
            unit_price, subtotal, source, source_warehouse_id
        ) values (
            v_order_id,
            nullif(v_item->>'product_id','')::uuid,
            v_item->>'item_no',
            v_item->>'description',
            v_qty, v_price, v_line,
            coalesce(v_item->>'source', 'warehouse'),
            nullif(v_item->>'source_warehouse_id','')::uuid
        );
    end loop;

    return query select v_order_id, v_code, v_invoice;
end;
$$;

grant execute on function public.create_customer_order(
    uuid, uuid, text, text, text, uuid, text, text, text, uuid, boolean, text, jsonb, text
) to anon, authenticated;


-- ============================================================
-- SECTION: add-phase4-fix-3.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 4 fix-pack #3
--   * Switch feature_flags.director_id_card_template -> a CSV
--     of multiple templates (default 'classic').
--   * Backfill the new column from the old single value so
--     nothing flips off on upgrade.
--
-- Safe to re-run.
-- ============================================================

alter table public.feature_flags
    add column if not exists director_id_card_templates text not null default 'classic';

-- Active invoice template (Standard / Compact / Premium)
alter table public.feature_flags
    add column if not exists invoice_template text not null default 'standard';

-- Backfill: if the older single-value column exists, copy it across
-- (only when the new column is still on its default).
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'feature_flags'
          and column_name = 'director_id_card_template'
    ) then
        update public.feature_flags
        set director_id_card_templates = director_id_card_template
        where (director_id_card_templates is null or director_id_card_templates = 'classic')
          and director_id_card_template is not null
          and director_id_card_template <> '';
    end if;
end $$;


-- ============================================================
-- SECTION: add-phase5-system-admin.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 5: System Admin promotion + hardening
-- The overall manager (above the Director). Absolute capability,
-- needs no branch assignment, and is hidden from every staff
-- listing / report in the app.
--
-- The super account was originally seeded with role 'admin' but
-- named "System Admin". This promotes it to the canonical
-- 'system_manager' role so the app's existing System-Admin logic
-- (full access, hidden from Director) applies consistently.
-- Safe to re-run.
-- ============================================================

-- 1) Promote the "System Admin" account to system_manager --------
--    Matched by name (case/space-insensitive). is_admin stays true
--    (super), branch is cleared (no assignment needed), and the
--    session_version bump forces a fresh sign-in with the new role.
update public.staff
   set role = 'system_manager',
       is_admin = true,
       branch_id = null,
       manages_all_branches = true,
       manages_all_warehouses = true,
       session_version = coalesce(session_version, 0) + 1
 where lower(regexp_replace(coalesce(name, ''), '\s+', '', 'g')) in ('systemadmin', 'sysadmin');

-- 2) Safety: any account flagged is_admin AND left unassigned that
--    is literally named system admin should also be promoted (covers
--    seeds that stored the name with different casing/spacing).
update public.staff
   set role = 'system_manager',
       is_admin = true,
       branch_id = null,
       manages_all_branches = true,
       manages_all_warehouses = true,
       session_version = coalesce(session_version, 0) + 1
 where role <> 'system_manager'
   and lower(trim(coalesce(name, ''))) like 'system admin%';

-- 3) System Admins never need a home branch — clear any stragglers.
update public.staff
   set branch_id = null
 where role = 'system_manager'
   and branch_id is not null;

-- 4) Auto-generate a staff ID for every System Admin that lacks one.
--    They have no branch, so the standard branch-initial generator doesn't
--    cover them — give them a dedicated, sequential CH-SA-NNN code instead.
do $$
declare s record; next_seq int; new_code text;
begin
  for s in
    select id from public.staff
     where role = 'system_manager'
       and (staff_code is null or staff_code = '')
     order by created_at
  loop
    select coalesce(max((regexp_match(staff_code, '^CH-SA-(\d+)$'))[1]::int), 0) + 1
      into next_seq
      from public.staff
     where staff_code ~ '^CH-SA-\d+$';
    new_code := 'CH-SA-' || lpad(next_seq::text, 3, '0');
    update public.staff set staff_code = new_code where id = s.id;
  end loop;
end $$;


-- ============================================================
-- SECTION: add-phase6-permissions.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 6: Role permissions (page access)
-- The System Admin can tick / untick which pages each role may use,
-- including the Director. Stored as a per-role list of DENIED views;
-- empty list = that role keeps its full default access.
--
-- The System Admin is never restricted by this table (the app exempts
-- system_manager) — they always have full access.
-- Safe to re-run.
-- ============================================================

create table if not exists public.role_permissions (
    role text primary key check (role in ('staff', 'branch_manager', 'warehouse_manager', 'admin')),
    denied_views jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

-- Seed a row per manageable role (no denials by default = full access).
insert into public.role_permissions (role) values
    ('staff'), ('branch_manager'), ('warehouse_manager'), ('admin')
on conflict (role) do nothing;

alter table public.role_permissions enable row level security;
drop policy if exists "rp_read"  on public.role_permissions;
drop policy if exists "rp_write" on public.role_permissions;
create policy "rp_read"  on public.role_permissions for select using (true);
create policy "rp_write" on public.role_permissions for all using (true) with check (true);


-- ============================================================
-- SECTION: add-phase7-user-permissions.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 7: Per-user page permissions
-- Adds a "By user" layer on top of the per-role permissions.
-- The System Admin can hide specific pages for one individual user.
-- Stored as a per-user list of DENIED views; empty = no extra limits.
--
-- Effective visibility for a user = (role denials) UNION (user denials).
-- The System Admin is never restricted (the app exempts system_manager).
-- Safe to re-run.
-- ============================================================

create table if not exists public.user_permissions (
    staff_id uuid primary key references public.staff(id) on delete cascade,
    denied_views jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.user_permissions enable row level security;
drop policy if exists "up_read"  on public.user_permissions;
drop policy if exists "up_write" on public.user_permissions;
create policy "up_read"  on public.user_permissions for select using (true);
create policy "up_write" on public.user_permissions for all using (true) with check (true);


-- ============================================================
-- SECTION: add-idcard-toggles.sql
-- ============================================================
-- Extra ID card field toggles (show/hide more items on the staff ID card).
-- Adds columns backing the new tick/untick controls in the ID Card designer.
-- Safe to run multiple times.

alter table public.id_card_settings add column if not exists show_role        boolean not null default true;
alter table public.id_card_settings add column if not exists show_staff_id    boolean not null default true;
alter table public.id_card_settings add column if not exists show_issued      boolean not null default false;
alter table public.id_card_settings add column if not exists show_branch_name boolean not null default false;


-- ============================================================
-- SECTION: add-phase8-action-permissions.sql
-- ============================================================
-- ============================================================
-- Prime Access Ghana — Phase 8: Action permissions (what a role/user can DO)
-- Page access (Phase 6/7) controls which pages are VISIBLE. This adds a
-- second, independent layer: which ACTIONS a role or individual user may
-- perform on a page they can see — e.g. editing product info.
--
-- Model: ALLOW-LIST (granted). A role/user can perform an action only if
-- it appears in their allowed_actions. This is the opposite of the page
-- model (which is a deny-list) because actions are opt-in: by default a
-- normal Staff member can browse products but NOT edit them until the
-- System Admin grants it — to the whole role, or to one person.
--
-- Effective allowed actions for a user = role grants UNION user grants.
-- The System Admin (system_manager) is never restricted by these tables.
-- Safe to re-run.
-- ============================================================

-- 1) Per-role granted actions -------------------------------------------
create table if not exists public.role_action_permissions (
    role text primary key check (role in ('staff', 'branch_manager', 'warehouse_manager', 'admin')),
    allowed_actions jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

-- Seed sensible defaults: Director + both manager roles can manage products
-- out of the box; plain Staff start with NO product actions (view only) until
-- granted. Re-running never clobbers choices already made (do nothing).
insert into public.role_action_permissions (role, allowed_actions) values
    ('admin',             '["product.create","product.edit","product.delete"]'::jsonb),
    ('branch_manager',    '["product.create","product.edit","product.delete"]'::jsonb),
    ('warehouse_manager', '["product.create","product.edit","product.delete"]'::jsonb),
    ('staff',             '[]'::jsonb)
on conflict (role) do nothing;

alter table public.role_action_permissions enable row level security;
drop policy if exists "rap_read"  on public.role_action_permissions;
drop policy if exists "rap_write" on public.role_action_permissions;
create policy "rap_read"  on public.role_action_permissions for select using (true);
create policy "rap_write" on public.role_action_permissions for all using (true) with check (true);

-- 2) Per-user extra grants (added ON TOP of their role's grants) ----------
create table if not exists public.user_action_permissions (
    staff_id uuid primary key references public.staff(id) on delete cascade,
    allowed_actions jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.user_action_permissions enable row level security;
drop policy if exists "uap_read"  on public.user_action_permissions;
drop policy if exists "uap_write" on public.user_action_permissions;
create policy "uap_read"  on public.user_action_permissions for select using (true);
create policy "uap_write" on public.user_action_permissions for all using (true) with check (true);


-- ============================================================
-- SECTION: add-product-name.sql
-- ============================================================
-- Prime Access Ghana — add optional Product name to products
-- Safe to run on an existing database; the column is nullable so old rows are fine.
-- (schema.sql already includes this column for fresh installs.)

alter table public.products
    add column if not exists name text;
