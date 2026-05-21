-- ============================================================
-- Run this once in the Supabase SQL editor to wipe ALL products.
-- Branches + staff + messages are unaffected.
-- After running, re-import via Dashboard → Import Excel using
-- assets/products/catalog-2025-03-25.csv
-- ============================================================

delete from public.products;

-- Confirm:
select count(*) as remaining_products from public.products;
