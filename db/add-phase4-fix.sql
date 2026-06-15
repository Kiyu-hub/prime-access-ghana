-- ============================================================
-- Prime Access Ghana — Phase 4 fix-pack
--   * Rename `mode` -> `env` everywhere. `mode` clashes with the
--     built-in Postgres aggregate `mode()`, which triggered the
--     "WITHIN GROUP is required for ordered-set aggregate mode"
--     error on certain queries (e.g. Showroom).
--   * Seed the default System Admin account.
--   * Refresh staff_view + RPCs to use the new column name.
--
-- Safe to re-run.
-- ============================================================

-- 1) RENAME mode -> env on every table that got it -----------
do $$
declare
    t text;
    tbls text[] := array[
        'products', 'product_logs', 'branches', 'warehouses',
        'product_transfer_requests', 'customer_orders',
        'customer_order_items', 'payment_accounts', 'announcements',
        'messages', 'staff', 'media_assets'
    ];
begin
    foreach t in array tbls loop
        if exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name=t and column_name='mode') then
            execute format('alter table public.%I rename column mode to env', t);
        end if;
        if exists (select 1 from pg_indexes
                   where schemaname='public' and tablename=t and indexname=t||'_mode_idx') then
            execute format('alter index public.%I rename to %I', t||'_mode_idx', t||'_env_idx');
        end if;
    end loop;
end $$;

-- 2) staff_view rebuild with env -----------------------------
drop view if exists public.staff_view;
create view public.staff_view as
select s.id, s.email, s.name, s.role, s.branch_id, s.is_admin, s.created_at,
       b.name as branch_name, s.warehouse_id, s.staff_code, s.session_version,
       w.name as warehouse_name, s.manages_all_branches, s.manages_all_warehouses,
       s.image_url, s.started_at, s.env
from public.staff s
left join public.branches b on b.id = s.branch_id
left join public.warehouses w on w.id = s.warehouse_id;
grant select on public.staff_view to anon, authenticated;

-- 3) RPCs that used p_mode / mode are recreated with p_env / env
drop function if exists public.move_stock_direct(text, uuid, uuid, int, uuid, text, text);
create or replace function public.move_stock_direct(
    p_item_no text,
    p_from_warehouse_id uuid,
    p_to_warehouse_id uuid,
    p_qty int,
    p_by_staff_id uuid,
    p_note text default null,
    p_env text default 'live'
) returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
    v_role text; v_is_admin boolean; v_source_id uuid; v_source_stock int;
    v_dest_id uuid; v_item_no text; v_description text; v_actor_name text;
    v_from_branch uuid; v_to_branch uuid; v_code text; v_attempts int := 0;
    v_pt_id uuid;
begin
    select role, is_admin, name into v_role, v_is_admin, v_actor_name
    from staff where id = p_by_staff_id;
    if v_role is null then raise exception 'staff not found'; end if;
    if not (v_is_admin or v_role in ('admin','system_manager')) then
        raise exception 'not authorised';
    end if;
    if p_qty is null or p_qty <= 0 then raise exception 'qty must be > 0'; end if;
    if p_from_warehouse_id = p_to_warehouse_id then raise exception 'source and destination must differ'; end if;
    select id, stock, item_no, description
      into v_source_id, v_source_stock, v_item_no, v_description
    from products
    where warehouse_id = p_from_warehouse_id and item_no = p_item_no and env = p_env
    limit 1;
    if v_source_id is null then raise exception 'source warehouse does not stock item %', p_item_no; end if;
    if v_source_stock < p_qty then raise exception 'source has only % unit(s)', v_source_stock; end if;
    select id into v_dest_id
    from products
    where warehouse_id = p_to_warehouse_id and item_no = p_item_no and env = p_env
    limit 1;
    if v_dest_id is null then
        select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id and is_default = true limit 1;
        if v_to_branch is null then
            select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id limit 1;
        end if;
        insert into products (
            item_no, description, category, material, color,
            dim_l, dim_w, dim_h, price, stock, image_url, supplier,
            branch_id, warehouse_id, is_draft, env
        )
        select item_no, description, category, material, color,
               dim_l, dim_w, dim_h, price, 0, image_url, supplier,
               v_to_branch, p_to_warehouse_id, false, p_env
        from products where id = v_source_id
        returning id into v_dest_id;
    end if;
    update products set stock = stock - p_qty where id = v_source_id;
    update products set stock = stock + p_qty where id = v_dest_id;
    select branch_id into v_from_branch from branch_warehouses where warehouse_id = p_from_warehouse_id and is_default = true limit 1;
    if v_from_branch is null then
        select branch_id into v_from_branch from branch_warehouses where warehouse_id = p_from_warehouse_id limit 1;
    end if;
    if v_to_branch is null then
        select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id and is_default = true limit 1;
        if v_to_branch is null then
            select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id limit 1;
        end if;
    end if;
    loop
        v_code := 'MV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
        exit when not exists (select 1 from product_transfer_requests where code = upper(v_code));
        v_attempts := v_attempts + 1;
        if v_attempts > 8 then raise exception 'could not generate code'; end if;
    end loop;
    v_code := upper(v_code);
    insert into product_transfer_requests (
        code, product_id, item_no, description,
        from_warehouse_id, from_branch_id,
        to_warehouse_id,   to_branch_id,
        qty_requested, qty_received,
        payment_method, payment_confirmed,
        delivery_type, requested_by, requested_by_code,
        received_by, status, note, received_at, env
    ) values (
        v_code, v_dest_id, v_item_no, v_description,
        p_from_warehouse_id, v_from_branch,
        p_to_warehouse_id,   v_to_branch,
        p_qty, p_qty,
        null, true,
        'internal', p_by_staff_id, null,
        p_by_staff_id, 'received',
        coalesce(p_note, 'direct move by ' || coalesce(v_actor_name, 'super-user')),
        now(), p_env
    ) returning id into v_pt_id;
    insert into product_logs (action, staff_id, staff_name, note, env)
    values ('stock_moved_direct', p_by_staff_id, v_actor_name,
            v_code || ' · ' || coalesce(v_item_no, '?') || ' · qty ' || p_qty, p_env);
    return v_code;
end;
$$;
grant execute on function public.move_stock_direct(text, uuid, uuid, int, uuid, text, text) to anon, authenticated;

drop function if exists public.publish_dev_product(uuid);
create or replace function public.publish_dev_product(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_row products%rowtype;
begin
    select * into v_row from products where id = p_id and env = 'dev';
    if v_row.id is null then raise exception 'no dev product with that id'; end if;
    if exists (select 1 from products where id = p_id and env = 'live') then
        update products set
            item_no = v_row.item_no, description = v_row.description,
            category = v_row.category, material = v_row.material, color = v_row.color,
            dim_l = v_row.dim_l, dim_w = v_row.dim_w, dim_h = v_row.dim_h,
            price = v_row.price, stock = v_row.stock,
            image_url = v_row.image_url, supplier = v_row.supplier,
            branch_id = v_row.branch_id, warehouse_id = v_row.warehouse_id,
            is_draft = v_row.is_draft
        where id = p_id and env = 'live';
    else
        insert into products select v_row.*;
        update products set env = 'live' where id = p_id;
    end if;
end;
$$;
grant execute on function public.publish_dev_product(uuid) to anon, authenticated;

drop function if exists public.reset_dev_data();
create or replace function public.reset_dev_data()
returns void language plpgsql security definer set search_path = public as $$
begin
    delete from product_logs               where env = 'dev';
    delete from customer_order_items       where env = 'dev';
    delete from customer_orders            where env = 'dev';
    delete from product_transfer_requests  where env = 'dev';
    delete from announcements              where env = 'dev';
    delete from messages                   where env = 'dev';
    delete from products                   where env = 'dev';
    delete from payment_accounts           where env = 'dev';
    delete from media_assets               where env = 'dev';
end;
$$;
grant execute on function public.reset_dev_data() to anon, authenticated;

-- 4) Publish-everything-dev RPC: clones every dev row into live (best-effort).
-- For now: copies dev products into live. Other tables can be added as needed.
create or replace function public.publish_all_dev()
returns void language plpgsql security definer set search_path = public as $$
declare v_row products%rowtype;
begin
    for v_row in select * from products where env = 'dev' loop
        perform public.publish_dev_product(v_row.id);
    end loop;
end;
$$;
grant execute on function public.publish_all_dev() to anon, authenticated;

-- 5) Feature flags (single-row toggles managed by System Admin)
create table if not exists public.feature_flags (
    id int primary key default 1,
    transfers_enabled boolean not null default true,
    move_stock_enabled boolean not null default true,
    id_cards_visible_to_director boolean not null default false,
    director_id_card_template text not null default 'classic',
    updated_at timestamptz not null default now()
);
insert into public.feature_flags (id) values (1) on conflict (id) do nothing;
alter table public.feature_flags enable row level security;
drop policy if exists "ff_read"  on public.feature_flags;
drop policy if exists "ff_write" on public.feature_flags;
create policy "ff_read"  on public.feature_flags for select using (true);
create policy "ff_write" on public.feature_flags for all using (true) with check (true);

-- 6) Extend id_card_settings template enum + new toggles -----
alter table public.id_card_settings drop constraint if exists id_card_settings_template_check;
alter table public.id_card_settings add constraint id_card_settings_template_check check (template in ('classic','modern','minimal','heritage','bold'));
alter table public.id_card_settings add column if not exists show_branch_location boolean not null default true;

-- 7) Default System Admin account ----------------------------
-- Seeded only if not present. Password is hashed with pgcrypto.
do $$
declare v_id uuid;
begin
    if not exists (select 1 from staff where lower(email) = lower('blanc.69458@gmail.com')) then
        insert into staff (email, password_hash, name, role, is_admin)
        values (
            lower('blanc.69458@gmail.com'),
            extensions.crypt('Smart@399', extensions.gen_salt('bf'::text, 10)),
            'System Admin',
            'system_manager',
            true
        ) returning id into v_id;
    end if;
end $$;
