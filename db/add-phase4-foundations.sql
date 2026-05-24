-- ============================================================
-- Clasikal Homes — Phase 4
--   1. Dev/Live mode foundation  (`mode` column on data tables)
--   2. Director / System Manager: move transfer without payment
--   3. Optional staff photo (`image_url`)
--   4. Media library (gallery for re-usable images)
--
-- Safe to re-run. Run in Supabase SQL editor in one go.
-- ============================================================

-- 1) DEV/LIVE MODE ---------------------------------------------
-- Every row carries a `mode` of either 'live' or 'dev'. The client
-- filters by the current mode on every read. Existing rows default
-- to 'live' so nothing changes for current data.

do $$
declare
    t text;
    tbls text[] := array[
        'products', 'product_logs', 'branches', 'warehouses',
        'product_transfer_requests', 'customer_orders',
        'customer_order_items', 'payment_accounts', 'announcements',
        'messages', 'staff'
    ];
begin
    foreach t in array tbls loop
        if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
            execute format(
                'alter table public.%I add column if not exists mode text not null default ''live'' check (mode in (''live'',''dev''))',
                t
            );
            execute format(
                'create index if not exists %I on public.%I(mode)',
                t || '_mode_idx', t
            );
        end if;
    end loop;
end $$;

-- Helper RPC: COPY a row's dev version into live (or update live to match).
-- For now this is a generic "publish a single product" — the same pattern
-- can be replicated for any table the System Manager wants to push.
create or replace function public.publish_dev_product(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_row products%rowtype;
begin
    select * into v_row from products where id = p_id and mode = 'dev';
    if v_row.id is null then raise exception 'no dev product with that id'; end if;
    -- If a matching live row exists (same id), update it; else insert as live.
    if exists (select 1 from products where id = p_id and mode = 'live') then
        update products set
            item_no = v_row.item_no,
            description = v_row.description,
            category = v_row.category,
            material = v_row.material,
            color = v_row.color,
            dim_l = v_row.dim_l, dim_w = v_row.dim_w, dim_h = v_row.dim_h,
            price = v_row.price,
            stock = v_row.stock,
            image_url = v_row.image_url,
            supplier = v_row.supplier,
            branch_id = v_row.branch_id,
            warehouse_id = v_row.warehouse_id,
            is_draft = v_row.is_draft
        where id = p_id and mode = 'live';
    else
        insert into products select v_row.* on conflict do nothing;
        update products set mode = 'live' where id = p_id;
    end if;
end;
$$;
grant execute on function public.publish_dev_product(uuid) to anon, authenticated;

-- Helper RPC: wipe all dev rows. Used by "Reset demo data" button.
create or replace function public.reset_dev_data()
returns void language plpgsql security definer set search_path = public as $$
begin
    delete from product_logs               where mode = 'dev';
    delete from customer_order_items       where mode = 'dev';
    delete from customer_orders            where mode = 'dev';
    delete from product_transfer_requests  where mode = 'dev';
    delete from announcements              where mode = 'dev';
    delete from messages                   where mode = 'dev';
    delete from products                   where mode = 'dev';
    delete from payment_accounts           where mode = 'dev';
end;
$$;
grant execute on function public.reset_dev_data() to anon, authenticated;

-- 2) MOVE TRANSFER WITHOUT PAYMENT (Director / System Manager) --
-- A direct-move RPC: skips the request/receive ceremony.
-- Atomic: decrements FROM warehouse, increments TO warehouse,
-- creates an audit row in product_transfer_requests with status='received'
-- AND a product_logs entry. Caller must be admin or system_manager.

create or replace function public.move_stock_direct(
    p_item_no text,
    p_from_warehouse_id uuid,
    p_to_warehouse_id uuid,
    p_qty int,
    p_by_staff_id uuid,
    p_note text default null,
    p_mode text default 'live'
) returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
    v_role text;
    v_is_admin boolean;
    v_source_id uuid;
    v_source_stock int;
    v_dest_id uuid;
    v_item_no text;
    v_description text;
    v_actor_name text;
    v_from_branch uuid;
    v_to_branch uuid;
    v_code text;
    v_attempts int := 0;
    v_pt_id uuid;
begin
    -- Authorize
    select role, is_admin, name into v_role, v_is_admin, v_actor_name
    from staff where id = p_by_staff_id;
    if v_role is null then raise exception 'staff not found'; end if;
    if not (v_is_admin or v_role in ('admin','system_manager')) then
        raise exception 'only Director or System Manager can move stock without payment';
    end if;
    if p_qty is null or p_qty <= 0 then raise exception 'qty must be > 0'; end if;
    if p_from_warehouse_id = p_to_warehouse_id then raise exception 'source and destination must differ'; end if;

    -- Locate source row by item_no in FROM warehouse
    select id, stock, item_no, description
      into v_source_id, v_source_stock, v_item_no, v_description
    from products
    where warehouse_id = p_from_warehouse_id and item_no = p_item_no and mode = p_mode
    limit 1;
    if v_source_id is null then raise exception 'source warehouse does not stock item %', p_item_no; end if;
    if v_source_stock < p_qty then raise exception 'source has only % unit(s)', v_source_stock; end if;

    -- Find or create destination row (same item_no in TO warehouse)
    select id into v_dest_id
    from products
    where warehouse_id = p_to_warehouse_id and item_no = p_item_no and mode = p_mode
    limit 1;

    if v_dest_id is null then
        -- Create a destination row mirroring the source (stock 0; the move adds qty)
        select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id and is_default = true limit 1;
        if v_to_branch is null then
            select branch_id into v_to_branch from branch_warehouses where warehouse_id = p_to_warehouse_id limit 1;
        end if;
        insert into products (
            item_no, description, category, material, color,
            dim_l, dim_w, dim_h, price, stock, image_url, supplier,
            branch_id, warehouse_id, is_draft, mode
        )
        select item_no, description, category, material, color,
               dim_l, dim_w, dim_h, price, 0, image_url, supplier,
               v_to_branch, p_to_warehouse_id, false, p_mode
        from products where id = v_source_id
        returning id into v_dest_id;
    end if;

    -- Stock move
    update products set stock = stock - p_qty where id = v_source_id;
    update products set stock = stock + p_qty where id = v_dest_id;

    -- Audit row in product_transfer_requests (status=received, no payment)
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
        to_warehouse_id, to_branch_id,
        qty_requested, qty_received,
        payment_method, payment_confirmed,
        delivery_type, requested_by, requested_by_code,
        received_by, status, note, received_at, mode
    ) values (
        v_code, v_dest_id, v_item_no, v_description,
        p_from_warehouse_id, v_from_branch,
        p_to_warehouse_id,   v_to_branch,
        p_qty, p_qty,
        null, true,
        'internal', p_by_staff_id, null,
        p_by_staff_id, 'received',
        coalesce(p_note, 'direct move by ' || coalesce(v_actor_name, 'super-user')),
        now(), p_mode
    ) returning id into v_pt_id;

    -- Activity log
    insert into product_logs (action, staff_id, staff_name, note, mode)
    values (
        'stock_moved_direct',
        p_by_staff_id,
        v_actor_name,
        v_code || ' · ' || coalesce(v_item_no, '?') || ' · qty ' || p_qty,
        p_mode
    );

    return v_code;
end;
$$;
grant execute on function public.move_stock_direct(text, uuid, uuid, int, uuid, text, text) to anon, authenticated;

-- 3) OPTIONAL STAFF PHOTO --------------------------------------
alter table public.staff add column if not exists image_url text;
alter table public.staff add column if not exists started_at date;

-- Refresh staff_view so the new columns surface in the existing list
drop view if exists public.staff_view;
create view public.staff_view as
select s.id, s.email, s.name, s.role, s.branch_id, s.is_admin, s.created_at,
       b.name as branch_name, s.warehouse_id, s.staff_code, s.session_version,
       w.name as warehouse_name, s.manages_all_branches, s.manages_all_warehouses,
       s.image_url, s.started_at, s.mode
from public.staff s
left join public.branches b on b.id = s.branch_id
left join public.warehouses w on w.id = s.warehouse_id;
grant select on public.staff_view to anon, authenticated;

-- 4) MEDIA LIBRARY ---------------------------------------------
create table if not exists public.media_assets (
    id uuid primary key default gen_random_uuid(),
    url text not null,
    public_id text,
    filename text,
    mime text,
    bytes int,
    uploaded_by uuid references public.staff(id) on delete set null,
    uploaded_by_name text,
    note text,
    created_at timestamptz not null default now(),
    mode text not null default 'live' check (mode in ('live','dev'))
);
create index if not exists media_assets_mode_idx on public.media_assets(mode);
create index if not exists media_assets_created_idx on public.media_assets(created_at desc);

alter table public.media_assets enable row level security;
drop policy if exists "media_read"  on public.media_assets;
drop policy if exists "media_write" on public.media_assets;
create policy "media_read"  on public.media_assets for select using (true);
create policy "media_write" on public.media_assets for all using (true) with check (true);

-- 5) ID CARD SETTINGS ------------------------------------------
-- Stores the system manager's choice of card template + accent + which
-- optional fields appear. One row, keyed by id=1, easy to read/write.
create table if not exists public.id_card_settings (
    id int primary key default 1,
    template text not null default 'classic' check (template in ('classic','modern','minimal')),
    accent_color text not null default '#0369A1',
    show_email boolean not null default true,
    show_started_at boolean not null default true,
    show_qr boolean not null default true,
    enabled_for_print boolean not null default false,
    updated_at timestamptz not null default now()
);
insert into public.id_card_settings (id) values (1) on conflict (id) do nothing;
alter table public.id_card_settings enable row level security;
drop policy if exists "id_card_read"  on public.id_card_settings;
drop policy if exists "id_card_write" on public.id_card_settings;
create policy "id_card_read"  on public.id_card_settings for select using (true);
create policy "id_card_write" on public.id_card_settings for all using (true) with check (true);
