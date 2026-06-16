-- Prime Access Ghana — set the right admin accounts on an EXISTING DB.
-- System Admin (owner) = blanc.69458@gmail.com
-- Director            = director@primeaccessgh.com
-- Run once in the SQL Editor. Safe to re-run. Default password: prime@2026.

-- 1) Ensure the System Admin (owner) account exists.
insert into public.staff (email, password_hash, name, role, is_admin)
select 'blanc.69458@gmail.com', crypt('prime@2026', gen_salt('bf', 10)), 'System Admin', 'system_manager', true
where not exists (select 1 from public.staff where lower(email) = 'blanc.69458@gmail.com');

-- 2) Make it a full System Admin (absolute access, no branch, has a code).
update public.staff
   set role = 'system_manager',
       is_admin = true,
       branch_id = null,
       manages_all_branches = true,
       manages_all_warehouses = true,
       staff_code = coalesce(nullif(staff_code, ''), 'CH-SA-001'),
       session_version = coalesce(session_version, 0) + 1
 where lower(email) = 'blanc.69458@gmail.com';

-- 3) Demote the old super account to Director.
update public.staff
   set role = 'admin',
       is_admin = true,
       name = 'Director',
       manages_all_branches = true,
       manages_all_warehouses = true,
       session_version = coalesce(session_version, 0) + 1
 where lower(email) = 'director@primeaccessgh.com';
