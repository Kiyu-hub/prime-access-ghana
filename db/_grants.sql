-- ============================================================
-- Prime Access Ghana — PERMISSIONS NORMALIZER (run LAST; safe to re-run)
-- This app uses the Supabase anon key for all access and authorizes in the
-- client, so every public object must be reachable by the API roles.
-- `drop schema public cascade` (a common reset) wipes Supabase's default
-- privileges, which shows up as "permission denied for table ...". This block
-- re-grants everything AND guarantees a permissive RLS policy on every table,
-- so access is uniform no matter which migration created the object.
-- You can paste JUST this section into the SQL Editor anytime to fix perms.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Ensure every base table has RLS enabled with a permissive allow-all policy
-- for the API roles. (Views can't have RLS and are covered by the grant above.)
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('drop policy if exists pag_allow_all on public.%I', r.tablename);
    execute format(
      'create policy pag_allow_all on public.%I for all to anon, authenticated, service_role using (true) with check (true)',
      r.tablename
    );
  end loop;
end $$;
