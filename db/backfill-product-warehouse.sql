-- Prime Access Ghana — backfill products missing a warehouse.
-- Warehouse Stock sums products by warehouse_id; products with a NULL
-- warehouse_id show as 0 stock. Assign each such product to its branch's
-- default warehouse (or any warehouse for that branch). Safe to re-run.
update public.products p
   set warehouse_id = bw.warehouse_id
  from public.branch_warehouses bw
 where p.branch_id = bw.branch_id
   and bw.is_default = true
   and p.warehouse_id is null;

-- Fallback for branches whose warehouse link isn't flagged default.
update public.products p
   set warehouse_id = bw.warehouse_id
  from public.branch_warehouses bw
 where p.branch_id = bw.branch_id
   and p.warehouse_id is null;
