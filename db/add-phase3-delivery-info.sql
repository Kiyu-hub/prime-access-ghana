-- ============================================================
-- Prime Access Ghana — Phase 3 add-on: transfer delivery info
-- Adds external-delivery details to product_transfer_requests
-- and extends the request RPC to accept them.
-- Safe to re-run.
-- ============================================================

-- 1) Add columns ---------------------------------------------
alter table public.product_transfer_requests
    add column if not exists delivery_address text,
    add column if not exists delivery_recipient_name text,
    add column if not exists delivery_recipient_phone text;

-- 2) Replace the request RPC so the client can pass the new
--    fields atomically. Internal deliveries leave them null.
create or replace function public.request_product_transfer(
    p_product_id uuid,
    p_from_warehouse_id uuid,
    p_qty int,
    p_payment_method text,
    p_payment_provider text,
    p_delivery_type text,
    p_requester_staff_id uuid,
    p_requester_code text,
    p_note text,
    p_delivery_address text default null,
    p_delivery_recipient_name text default null,
    p_delivery_recipient_phone text default null
) returns text language plpgsql security definer set search_path = public, extensions as $$
declare
    v_code text;
    v_item_no text;
    v_description text;
    v_dest_warehouse_id uuid;
    v_dest_branch_id uuid;
    v_from_branch_id uuid;
    v_attempts int := 0;
begin
    if not exists (
        select 1 from staff
        where id = p_requester_staff_id
          and (staff_code = p_requester_code or staff_code is null)
    ) then
        raise exception 'staff code does not match requester';
    end if;
    if p_qty is null or p_qty <= 0 then
        raise exception 'quantity must be greater than zero';
    end if;
    select item_no, description, warehouse_id, branch_id
      into v_item_no, v_description, v_dest_warehouse_id, v_dest_branch_id
    from products where id = p_product_id;
    if v_item_no is null and v_description is null then
        raise exception 'product not found';
    end if;
    if v_dest_warehouse_id = p_from_warehouse_id then
        raise exception 'source and destination warehouse must differ';
    end if;
    if p_delivery_type = 'external'
       and (p_delivery_recipient_phone is null or btrim(p_delivery_recipient_phone) = '') then
        raise exception 'external delivery requires a recipient phone number';
    end if;
    select branch_id into v_from_branch_id
    from branch_warehouses
    where warehouse_id = p_from_warehouse_id and is_default = true
    limit 1;
    if v_from_branch_id is null then
        select branch_id into v_from_branch_id
        from branch_warehouses
        where warehouse_id = p_from_warehouse_id
        limit 1;
    end if;
    loop
        v_code := public.gen_product_transfer_code();
        exit when not exists (select 1 from product_transfer_requests where code = v_code);
        v_attempts := v_attempts + 1;
        if v_attempts > 8 then
            raise exception 'could not generate unique transfer code';
        end if;
    end loop;
    insert into product_transfer_requests (
        code, product_id, item_no, description,
        from_warehouse_id, from_branch_id,
        to_warehouse_id, to_branch_id,
        qty_requested, payment_method, payment_provider, delivery_type,
        requested_by, requested_by_code, note,
        delivery_address, delivery_recipient_name, delivery_recipient_phone
    ) values (
        v_code, p_product_id, v_item_no, v_description,
        p_from_warehouse_id, v_from_branch_id,
        v_dest_branch_id, v_dest_warehouse_id,
        p_qty, p_payment_method, p_payment_provider, p_delivery_type,
        p_requester_staff_id, p_requester_code, p_note,
        case when p_delivery_type = 'external' then nullif(btrim(p_delivery_address), '') else null end,
        case when p_delivery_type = 'external' then nullif(btrim(p_delivery_recipient_name), '') else null end,
        case when p_delivery_type = 'external' then nullif(btrim(p_delivery_recipient_phone), '') else null end
    );
    return v_code;
end;
$$;
grant execute on function public.request_product_transfer(uuid, uuid, int, text, text, text, uuid, text, text, text, text, text) to anon, authenticated;
