-- Prime Access Ghana — repair missing Activity Logs + Drafts on an EXISTING DB.
-- The drafts/logs migration shipped empty, so product_logs was never created
-- (and the Phase-4 dev/live step skipped it because it didn't exist). This
-- creates it WITH the env column directly. Run once in the SQL Editor; safe to re-run.

alter table public.products add column if not exists is_draft boolean not null default false;
create index if not exists products_is_draft_idx on public.products(is_draft);

create table if not exists public.product_logs (
    id           uuid primary key default gen_random_uuid(),
    product_id   uuid references public.products(id) on delete set null,
    item_no      text,
    action       text not null,
    branch_id    uuid references public.branches(id) on delete set null,
    branch_name  text,
    staff_id     uuid references public.staff(id) on delete set null,
    staff_name   text,
    note         text,
    created_at   timestamptz not null default now()
);
-- This DB already passed the dev/live phase (which won't add it now) — add env.
alter table public.product_logs add column if not exists env text not null default 'live';
create index if not exists product_logs_created_idx on public.product_logs(created_at desc);

alter table public.product_logs enable row level security;
drop policy if exists "logs read"  on public.product_logs;
drop policy if exists "logs write" on public.product_logs;
create policy "logs read"  on public.product_logs for select using (true);
create policy "logs write" on public.product_logs for all    using (true) with check (true);

grant all on public.product_logs to anon, authenticated, service_role;
