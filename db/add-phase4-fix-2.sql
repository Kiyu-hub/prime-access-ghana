-- ============================================================
-- Prime Access Ghana — Phase 4 fix-pack #2
--   * Fix "column reference 'id' is ambiguous" on New Sale.
--     The create_customer_order RPC declared an OUT column named
--     `id` (in RETURNS TABLE) AND referenced customer_orders.id in
--     a RETURNING clause — Postgres can't tell them apart.
--   * Also tag new sales with the current env so dev-mode orders
--     don't leak into live reads.
--
-- Safe to re-run.
-- ============================================================

drop function if exists public.create_customer_order(uuid, uuid, text, text, text, uuid, text, text, text, uuid, boolean, text, jsonb);

create or replace function public.create_customer_order(
    p_branch_id uuid,
    p_warehouse_id uuid,
    p_client_name text,
    p_client_phone text,
    p_client_email text,
    p_initiated_by uuid,
    p_initiated_by_code text,
    p_payment_method text,
    p_payment_provider text,
    p_payment_account_id uuid,
    p_payment_confirmed boolean,
    p_note text,
    p_items jsonb,
    p_env text default 'live'
) returns table (order_id uuid, order_code text, order_invoice_code text)
language plpgsql security definer set search_path = public, extensions
as $$
declare
    v_order_id uuid;
    v_code text;
    v_invoice text;
    v_subtotal numeric := 0;
    v_attempts int := 0;
    v_item jsonb;
    v_qty int;
    v_price numeric;
    v_line numeric;
    v_has_env boolean;
begin
    if not exists (
        select 1 from staff s
        where s.id = p_initiated_by
          and (s.staff_code = p_initiated_by_code or s.staff_code is null)
    ) then
        raise exception 'staff code does not match initiator';
    end if;
    if p_items is null or jsonb_array_length(p_items) = 0 then
        raise exception 'order must have at least one item';
    end if;

    -- Generate unique order + invoice codes
    loop
        v_code := public.gen_order_code();
        exit when not exists (select 1 from customer_orders co where co.code = v_code);
        v_attempts := v_attempts + 1;
        if v_attempts > 8 then raise exception 'could not generate unique order code'; end if;
    end loop;
    v_attempts := 0;
    loop
        v_invoice := public.gen_invoice_code(p_branch_id);
        exit when not exists (select 1 from customer_orders co where co.invoice_code = v_invoice);
        v_attempts := v_attempts + 1;
        if v_attempts > 8 then raise exception 'could not generate unique invoice code'; end if;
    end loop;

    -- Subtotal from items
    for v_item in select * from jsonb_array_elements(p_items) loop
        v_qty   := coalesce((v_item->>'qty')::int, 0);
        v_price := coalesce((v_item->>'unit_price')::numeric, 0);
        v_subtotal := v_subtotal + (v_qty * v_price);
    end loop;

    -- env column may or may not exist depending on which migrations have run
    select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'customer_orders' and column_name = 'env'
    ) into v_has_env;

    if v_has_env then
        insert into customer_orders (
            code, invoice_code, branch_id, warehouse_id, client_name,
            client_phone, client_email, initiated_by, initiated_by_code,
            payment_method, payment_provider, payment_account_id,
            payment_confirmed, subtotal, total, note, env
        ) values (
            v_code, v_invoice, p_branch_id, p_warehouse_id, p_client_name,
            p_client_phone, p_client_email, p_initiated_by, p_initiated_by_code,
            p_payment_method, p_payment_provider, p_payment_account_id,
            coalesce(p_payment_confirmed, false), v_subtotal, v_subtotal, p_note,
            coalesce(nullif(p_env,''), 'live')
        ) returning customer_orders.id into v_order_id;
    else
        insert into customer_orders (
            code, invoice_code, branch_id, warehouse_id, client_name,
            client_phone, client_email, initiated_by, initiated_by_code,
            payment_method, payment_provider, payment_account_id,
            payment_confirmed, subtotal, total, note
        ) values (
            v_code, v_invoice, p_branch_id, p_warehouse_id, p_client_name,
            p_client_phone, p_client_email, p_initiated_by, p_initiated_by_code,
            p_payment_method, p_payment_provider, p_payment_account_id,
            coalesce(p_payment_confirmed, false), v_subtotal, v_subtotal, p_note
        ) returning customer_orders.id into v_order_id;
    end if;

    -- Insert line items
    for v_item in select * from jsonb_array_elements(p_items) loop
        v_qty   := coalesce((v_item->>'qty')::int, 0);
        v_price := coalesce((v_item->>'unit_price')::numeric, 0);
        v_line  := v_qty * v_price;
        insert into customer_order_items (
            order_id, product_id, item_no_snap, description_snap, qty,
            unit_price, subtotal, source, source_warehouse_id
        ) values (
            v_order_id,
            nullif(v_item->>'product_id','')::uuid,
            v_item->>'item_no',
            v_item->>'description',
            v_qty, v_price, v_line,
            coalesce(v_item->>'source', 'warehouse'),
            nullif(v_item->>'source_warehouse_id','')::uuid
        );
    end loop;

    return query select v_order_id, v_code, v_invoice;
end;
$$;

grant execute on function public.create_customer_order(
    uuid, uuid, text, text, text, uuid, text, text, text, uuid, boolean, text, jsonb, text
) to anon, authenticated;
