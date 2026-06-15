-- Prime Access Ghana — pre-clean (makes setup-all.sql safely re-runnable)
-- Postgres refuses `create or replace function` when the return type changed.
-- Several RPCs gained columns across the migration history, so on a RE-RUN the
-- early definitions would fail with: "cannot change return type of existing function".
-- This drops those functions up-front (CASCADE drops only their grants); every one
-- is recreated later in this script. On a brand-new database this is a harmless no-op.
do $$
declare r record;
begin
  for r in
    select format('drop function if exists %s cascade;', p.oid::regprocedure) as cmd
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in (
         'verify_login',
         'create_customer_order',
         'move_stock_direct',
         'publish_dev_product',
         'reset_dev_data',
         'publish_all_dev',
         'request_product_transfer',
         'create_staff',
         'update_staff'
       )
  loop
    execute r.cmd;
  end loop;
end $$;

-- Views can't drop/reorder columns via CREATE OR REPLACE VIEW either, and
-- staff_view gained columns across migrations. Drop it so the early
-- definition can recreate it cleanly on a re-run. (No-op on a fresh DB.)
drop view if exists public.staff_view cascade;

-- Normalize the dev/live column name so this script replays cleanly.
-- phase4-foundations writes `mode`; phase4-fix renames it to `env`. On a
-- RE-RUN the tables already have `env`, so phase4-foundations' mode-based
-- statements fail ("column mode does not exist"). Rename `env` -> `mode`
-- (and the indexes) up-front so the sequence can run again; phase4-fix
-- renames them back to `env` at the end. No-op on a fresh database.
do $$
declare t text;
  tbls text[] := array['products','product_logs','branches','warehouses',
    'product_transfer_requests','customer_orders','customer_order_items',
    'payment_accounts','announcements','messages','staff','media_assets'];
begin
  foreach t in array tbls loop
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name=t and column_name='env')
       and not exists (select 1 from information_schema.columns
               where table_schema='public' and table_name=t and column_name='mode') then
      execute format('alter table public.%I rename column env to mode', t);
    end if;
    if exists (select 1 from pg_indexes where schemaname='public' and tablename=t and indexname=t||'_env_idx')
       and not exists (select 1 from pg_indexes where schemaname='public' and tablename=t and indexname=t||'_mode_idx') then
      execute format('alter index public.%I rename to %I', t||'_env_idx', t||'_mode_idx');
    end if;
  end loop;
end $$;
