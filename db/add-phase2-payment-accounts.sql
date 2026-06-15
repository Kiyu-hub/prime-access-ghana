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
