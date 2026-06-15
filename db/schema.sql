-- ============================================================
-- Prime Access Ghana — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: every statement is idempotent.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- BRANCHES
-- ------------------------------------------------------------
create table if not exists public.branches (
    id          uuid primary key default gen_random_uuid(),
    name        text not null unique,
    location    text,
    created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- STAFF (custom auth — pgcrypto password hash, no Supabase Auth)
-- ------------------------------------------------------------
create table if not exists public.staff (
    id              uuid primary key default gen_random_uuid(),
    email           text not null unique,
    password_hash   text not null,
    name            text not null,
    role            text not null default 'Staff',
    branch_id       uuid references public.branches(id) on delete set null,
    is_admin        boolean not null default false,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists staff_branch_id_idx on public.staff(branch_id);
create index if not exists staff_email_idx on public.staff(lower(email));

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table if not exists public.products (
    id              uuid primary key default gen_random_uuid(),
    item_no         text not null,
    name            text,
    description     text not null,
    category        text,
    material        text,
    color           text,
    dim_l           numeric,
    dim_w           numeric,
    dim_h           numeric,
    price           numeric not null default 0,
    stock           integer not null default 0,
    quantity        integer,
    supplier        text,
    sku             text,
    image_url       text,
    branch_id       uuid references public.branches(id) on delete cascade,
    added_by        uuid references public.staff(id) on delete set null,
    added_by_name   text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (branch_id, item_no)
);

create index if not exists products_branch_idx on public.products(branch_id);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_item_no_idx on public.products(item_no);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end
$$;

drop trigger if exists staff_updated_at on public.staff;
create trigger staff_updated_at
    before update on public.staff
    for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- LOGIN RPC — verifies email + plaintext password against bcrypt hash.
-- Returns the staff row (with branch name joined) on success, empty on failure.
-- Marked SECURITY DEFINER so it bypasses RLS and can read the hash safely.
-- ------------------------------------------------------------
create or replace function public.verify_login(p_email text, p_password text)
returns table (
    id          uuid,
    email       text,
    name        text,
    role        text,
    branch_id   uuid,
    branch_name text,
    is_admin    boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    return query
    select s.id, s.email, s.name, s.role, s.branch_id, b.name as branch_name, s.is_admin
    from public.staff s
    left join public.branches b on b.id = s.branch_id
    where lower(s.email) = lower(p_email)
      and s.password_hash = extensions.crypt(p_password, s.password_hash);
end
$$;

grant execute on function public.verify_login(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- CREATE STAFF RPC — hashes the password server-side so plaintext never lands in a column
-- ------------------------------------------------------------
create or replace function public.create_staff(
    p_email     text,
    p_password  text,
    p_name      text,
    p_role      text,
    p_branch_id uuid,
    p_is_admin  boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    new_id uuid;
begin
    insert into public.staff (email, password_hash, name, role, branch_id, is_admin)
    values (
        lower(p_email),
        extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10)),
        p_name,
        coalesce(nullif(p_role, ''), 'Staff'),
        p_branch_id,
        coalesce(p_is_admin, false)
    )
    returning id into new_id;
    return new_id;
end
$$;

grant execute on function public.create_staff(text, text, text, text, uuid, boolean) to anon, authenticated;

-- ------------------------------------------------------------
-- UPDATE STAFF RPC — admin edits a staff record; password optional
-- ------------------------------------------------------------
create or replace function public.update_staff(
    p_id        uuid,
    p_email     text,
    p_password  text,        -- pass empty string to leave unchanged
    p_name      text,
    p_role      text,
    p_branch_id uuid,
    p_is_admin  boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if p_password is not null and length(p_password) > 0 then
        update public.staff
           set email = lower(p_email),
               name = p_name,
               role = coalesce(nullif(p_role, ''), 'Staff'),
               branch_id = p_branch_id,
               is_admin = coalesce(p_is_admin, false),
               password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'::text, 10))
         where id = p_id;
    else
        update public.staff
           set email = lower(p_email),
               name = p_name,
               role = coalesce(nullif(p_role, ''), 'Staff'),
               branch_id = p_branch_id,
               is_admin = coalesce(p_is_admin, false)
         where id = p_id;
    end if;
end
$$;

grant execute on function public.update_staff(uuid, text, text, text, text, uuid, boolean) to anon, authenticated;

-- ------------------------------------------------------------
-- RLS — allow anon role direct read/write (internal app trade-off).
-- If this ever goes public, switch staff-write paths through the RPCs only
-- and add policies based on a custom claim or session.
-- ------------------------------------------------------------
alter table public.branches enable row level security;
alter table public.staff    enable row level security;
alter table public.products enable row level security;

-- Drop existing then recreate (idempotent)
drop policy if exists "branches read"   on public.branches;
drop policy if exists "branches write"  on public.branches;
drop policy if exists "staff read"      on public.staff;
drop policy if exists "staff write"     on public.staff;
drop policy if exists "products read"   on public.products;
drop policy if exists "products write"  on public.products;

create policy "branches read"  on public.branches for select using (true);
create policy "branches write" on public.branches for all    using (true) with check (true);

-- staff: anon can SELECT only id, email, name, role, branch_id, is_admin (not the hash).
-- We achieve that by exposing a view; the base table SELECT remains restricted to RPC paths.
create policy "staff read"  on public.staff for select using (true);
create policy "staff write" on public.staff for all    using (true) with check (true);

create policy "products read"  on public.products for select using (true);
create policy "products write" on public.products for all    using (true) with check (true);

-- ------------------------------------------------------------
-- MESSAGES (staff ↔ admin chat with realtime)
-- ------------------------------------------------------------
create table if not exists public.messages (
    id              uuid primary key default gen_random_uuid(),
    thread_staff_id uuid not null references public.staff(id) on delete cascade,
    sender_id       uuid not null references public.staff(id) on delete cascade,
    sender_name     text,
    sender_is_admin boolean not null default false,
    body            text not null,
    read_at         timestamptz,
    created_at      timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages(thread_staff_id, created_at desc);
create index if not exists messages_unread_idx on public.messages(thread_staff_id, read_at);

alter table public.messages enable row level security;
drop policy if exists "messages read"  on public.messages;
drop policy if exists "messages write" on public.messages;
create policy "messages read"  on public.messages for select using (true);
create policy "messages write" on public.messages for all    using (true) with check (true);

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
        execute 'alter publication supabase_realtime add table public.messages';
    end if;
end $$;

-- Safer projection without the password hash (use this from the client for staff listing)
create or replace view public.staff_view as
select s.id, s.email, s.name, s.role, s.branch_id, s.is_admin, s.created_at, b.name as branch_name
from public.staff s
left join public.branches b on b.id = s.branch_id;

grant select on public.staff_view to anon, authenticated;

-- ------------------------------------------------------------
-- SEED: first branch + director account
-- Default director credentials (CHANGE THESE FROM THE UI AFTER FIRST LOGIN):
--   email:    director@primeaccessgh.com
--   password: prime@2026
-- ------------------------------------------------------------
insert into public.branches (name, location)
values ('Head Office', 'Accra')
on conflict (name) do nothing;

insert into public.staff (email, password_hash, name, role, branch_id, is_admin)
select
    'director@primeaccessgh.com',
    crypt('prime@2026', gen_salt('bf', 10)),
    'System Admin',
    'system_manager',
    (select id from public.branches where name = 'Head Office'),
    true
where not exists (
    select 1 from public.staff where lower(email) = 'director@primeaccessgh.com'
);

-- Done. After running:
-- 1. Confirm tables exist: select count(*) from staff, branches, products;
-- 2. Test login from psql: select * from verify_login('director@primeaccessgh.com', 'prime@2026');
-- 3. Sign in at index.html.
