-- Extra ID card field toggles (show/hide more items on the staff ID card).
-- Adds columns backing the new tick/untick controls in the ID Card designer.
-- Safe to run multiple times.

alter table public.id_card_settings add column if not exists show_role        boolean not null default true;
alter table public.id_card_settings add column if not exists show_staff_id    boolean not null default true;
alter table public.id_card_settings add column if not exists show_issued      boolean not null default false;
alter table public.id_card_settings add column if not exists show_branch_name boolean not null default false;
