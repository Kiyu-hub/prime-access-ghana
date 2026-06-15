-- Prime Access Ghana — privileges for the Supabase API roles.
-- Run LAST. Supabase normally auto-grants the anon/authenticated roles on
-- public objects via default privileges, but `drop schema public cascade`
-- wipes that config — which shows up in the app as "permission denied for
-- table ...". This re-grants everything in public and restores the default
-- privileges so future objects are covered too. The app uses the anon key
-- for all access (custom auth + permissive RLS), so anon needs full DML here.
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
