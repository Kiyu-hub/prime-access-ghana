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
