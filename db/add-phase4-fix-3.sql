-- ============================================================
-- Prime Access Ghana — Phase 4 fix-pack #3
--   * Switch feature_flags.director_id_card_template -> a CSV
--     of multiple templates (default 'classic').
--   * Backfill the new column from the old single value so
--     nothing flips off on upgrade.
--
-- Safe to re-run.
-- ============================================================

alter table public.feature_flags
    add column if not exists director_id_card_templates text not null default 'classic';

-- Active invoice template (Standard / Compact / Premium)
alter table public.feature_flags
    add column if not exists invoice_template text not null default 'standard';

-- Backfill: if the older single-value column exists, copy it across
-- (only when the new column is still on its default).
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'feature_flags'
          and column_name = 'director_id_card_template'
    ) then
        update public.feature_flags
        set director_id_card_templates = director_id_card_template
        where (director_id_card_templates is null or director_id_card_templates = 'classic')
          and director_id_card_template is not null
          and director_id_card_template <> '';
    end if;
end $$;
