-- Prime Access Ghana — add optional Product name to products
-- Safe to run on an existing database; the column is nullable so old rows are fine.
-- (schema.sql already includes this column for fresh installs.)

alter table public.products
    add column if not exists name text;
