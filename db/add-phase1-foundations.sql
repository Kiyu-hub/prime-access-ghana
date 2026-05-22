-- ============================================================
-- Clasikal Homes — Phase 1: warehouses + roles + staff codes
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
create or replace view public.staff_view as
select s.id, s.email, s.name, s.role, s.branch_id, s.warehouse_id, s.staff_code, s.is_admin, s.session_version, s.created_at, b.name as branch_name, w.name as warehouse_name
from public.staff s
left join public.branches b on b.id = s.branch_id
left join public.warehouses w on w.id = s.warehouse_id;
grant select on public.staff_view to anon, authenticated;

-- 17) Update verify_login to return new fields ----------------
create or replace function public.verify_login(p_email text, p_password text) returns table (id uuid, email text, name text, role text, branch_id uuid, branch_name text, is_admin boolean, staff_code text, session_version int, warehouse_id uuid, warehouse_name text) language plpgsql security definer set search_path = public, extensions as $$ begin return query select s.id, s.email, s.name, s.role, s.branch_id, b.name as branch_name, s.is_admin, s.staff_code, s.session_version, s.warehouse_id, w.name as warehouse_name from public.staff s left join public.branches b on b.id = s.branch_id left join public.warehouses w on w.id = s.warehouse_id where lower(s.email) = lower(p_email) and s.password_hash = extensions.crypt(p_password, s.password_hash); end; $$;
grant execute on function public.verify_login(text, text) to anon, authenticated;
