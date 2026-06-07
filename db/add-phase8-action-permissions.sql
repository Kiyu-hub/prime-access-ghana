-- ============================================================
-- Clasikal Homes — Phase 8: Action permissions (what a role/user can DO)
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
