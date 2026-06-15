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
