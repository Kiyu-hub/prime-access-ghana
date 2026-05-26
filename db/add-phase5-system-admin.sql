-- ============================================================
-- Clasikal Homes — Phase 5: System Admin promotion + hardening
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
