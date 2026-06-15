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
