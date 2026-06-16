-- Prime Access Ghana — sync EXISTING data to the new model.
-- Run once in the SQL Editor. Brings branches/warehouses/showrooms/products
-- created before the "branch -> warehouse -> showroom" change into line.
-- Safe to re-run (every step is guarded).

-- 1) Every branch must have a (default) warehouse.
do $$
declare b record; wh_id uuid;
begin
  for b in select id, name from public.branches loop
    if not exists (select 1 from public.branch_warehouses bw where bw.branch_id = b.id) then
      insert into public.warehouses (name, code, location)
      values (b.name || ' Warehouse',
              'WH-' || lpad((floor(random() * 1000000))::text, 6, '0'),
              null)
      returning id into wh_id;
      insert into public.branch_warehouses (branch_id, warehouse_id, is_default)
      values (b.id, wh_id, true);
    end if;
  end loop;
end $$;

-- 2) Every warehouse must have a paired showroom.
do $$
declare w record; b_id uuid;
begin
  for w in select * from public.warehouses loop
    if not exists (select 1 from public.showrooms s where s.warehouse_id = w.id) then
      select branch_id into b_id from public.branch_warehouses where warehouse_id = w.id and is_default = true limit 1;
      if b_id is null then select branch_id into b_id from public.branch_warehouses where warehouse_id = w.id limit 1; end if;
      if b_id is not null then
        insert into public.showrooms (name, branch_id, warehouse_id, location)
        values (w.name || ' Showroom', b_id, w.id, w.location);
      end if;
    end if;
  end loop;
end $$;

-- 3) Every product must live in its branch's warehouse.
update public.products p
   set warehouse_id = bw.warehouse_id
  from public.branch_warehouses bw
 where p.branch_id = bw.branch_id and bw.is_default = true and p.warehouse_id is null;
update public.products p
   set warehouse_id = bw.warehouse_id
  from public.branch_warehouses bw
 where p.branch_id = bw.branch_id and p.warehouse_id is null;
