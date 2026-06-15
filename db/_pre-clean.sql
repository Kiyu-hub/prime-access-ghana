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
