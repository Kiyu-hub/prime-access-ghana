-- ============================================================
-- Clasikal Homes — Phase 3 fix: System Manager role
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
