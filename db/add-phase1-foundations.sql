-- ============================================================
-- Clasikal Homes — Phase 1: warehouses + roles + staff codes
-- Safe to re-run. Run in Supabase SQL editor as one piece.
-- ============================================================

-- 1) WAREHOUSES TABLE -----------------------------------------
create table if not exists public.warehouses ( id uuid primary key default gen_random_uuid(), name text not null, code text unique not null, location text, manager_staff_id uuid references public.staff(id) on delete set null, created_at timestamptz not null default now() );
create index if not exists warehouses_name_idx on public.warehouses(name);

-- 2) BRANCH <-> WAREHOUSE many-to-many ------------------------
create table if not exists public.branch_warehouses ( id uuid primary key default gen_random_uuid(), branch_id uuid not null references public.branches(id) on delete cascade, warehouse_id uuid not null references public.warehouses(id) on delete cascade, is_default boolean not null default false, created_at timestamptz not null default now(), unique (branch_id, warehouse_id) );
create unique index if not exists branch_warehouses_one_default_per_branch on public.branch_warehouses(branch_id) where is_default = true;
create index if not exists bw_branch_idx on public.branch_warehouses(branch_id);
create index if not exists bw_warehouse_idx on public.branch_warehouses(warehouse_id);

-- 3) STAFF: role + warehouse_id + staff_code + session_version
alter table public.staff add column if not exists role text check (role in ('staff','branch_manager','warehouse_manager','admin')) default 'staff';
alter table public.staff add column if not exists warehouse_id uuid references public.warehouses(id) on delete set null;
alter table public.staff add column if not exists staff_code text;
alter table public.staff add column if not exists session_version int not null default 1;
create unique index if not exists staff_code_unique_idx on public.staff(staff_code) where staff_code is not null;
create index if not exists staff_role_idx on public.staff(role);
create index if not exists staff_warehouse_idx on public.staff(warehouse_id);

-- 4) PRODUCTS: warehouse_id -----------------------------------
alter table public.products add column if not exists warehouse_id uuid references public.warehouses(id) on delete set null;
create index if not exists products_warehouse_idx on public.products(warehouse_id);

-- 5) BACKFILL: role from is_admin (preserve existing admins) --
update public.staff set role = 'admin' where is_admin = true and role <> 'admin';

-- 6) MIGRATION: one default warehouse per existing branch -----
do $$ declare b record; wh_id uuid; begin for b in select id, name from public.branches loop if not exists (select 1 from public.branch_warehouses bw where bw.branch_id = b.id) then insert into public.warehouses (name, code, location) values (b.name || ' Warehouse', 'WH-' || upper(coalesce(substring(b.name from 1 for 1), 'X')) || '-' || lpad((floor(random() * 1000))::text, 3, '0'), b.name) returning id into wh_id; insert into public.branch_warehouses (branch_id, warehouse_id, is_default) values (b.id, wh_id, true); end if; end loop; end $$;

-- 7) BACKFILL: products -> default warehouse for their branch -
update public.products p set warehouse_id = bw.warehouse_id from public.branch_warehouses bw where p.branch_id = bw.branch_id and bw.is_default = true and p.warehouse_id is null;

-- 8) RPC: generate next staff code for a branch ---------------
create or replace function public.generate_staff_code(p_branch_id uuid) returns text language plpgsql security definer set search_path = public, extensions as $$ declare initial text; next_seq int; begin select upper(coalesce(substring(name from 1 for 1), 'X')) into initial from branches where id = p_branch_id; if initial is null then initial := 'X'; end if; select coalesce(max((regexp_match(staff_code, '^CH-' || initial || '-(\d+)$'))[1]::int), 0) + 1 into next_seq from staff where staff_code ~ ('^CH-' || initial || '-\d+$'); return 'CH-' || initial || '-' || lpad(next_seq::text, 3, '0'); end; $$;
grant execute on function public.generate_staff_code(uuid) to anon, authenticated;

-- 9) BACKFILL: every existing staff gets a code ---------------
do $$ declare s record; new_code text; begin for s in select id, branch_id from public.staff where staff_code is null and branch_id is not null order by created_at loop new_code := public.generate_staff_code(s.branch_id); update public.staff set staff_code = new_code where id = s.id; end loop; end $$;

-- 10) RPC: assign role (logs + bumps session_version) ---------
create or replace function public.assign_role(p_staff_id uuid, p_new_role text, p_changed_by uuid) returns void language plpgsql security definer set search_path = public, extensions as $$ declare old_role text; subject_name text; actor_name text; begin if p_new_role not in ('staff','branch_manager','warehouse_manager','admin') then raise exception 'invalid role: %', p_new_role; end if; select role, name into old_role, subject_name from staff where id = p_staff_id; select name into actor_name from staff where id = p_changed_by; update staff set role = p_new_role, is_admin = (p_new_role = 'admin'), session_version = session_version + 1 where id = p_staff_id; insert into product_logs (action, staff_id, staff_name, note) values ('role_assigned', p_changed_by, actor_name, subject_name || ': ' || coalesce(old_role, 'staff') || ' -> ' || p_new_role); end; $$;
grant execute on function public.assign_role(uuid, text, uuid) to anon, authenticated;

-- 11) RPC: check_session (client uses it to force logout) -----
create or replace function public.check_session(p_staff_id uuid, p_session_version int) returns boolean language sql stable security definer set search_path = public as $$ select coalesce((select session_version from staff where id = p_staff_id) = p_session_version, false); $$;
grant execute on function public.check_session(uuid, int) to anon, authenticated;

-- 12) RLS for new tables --------------------------------------
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
