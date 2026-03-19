-- Run this in Supabase SQL Editor.
-- Safe to run multiple times.
-- Adds employees roster and auto-sync from recruitment_processes when candidate is hired.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  team_lead_id uuid not null references public.team_leads(id) on delete cascade,
  full_name text not null,
  role_title text,
  email text,
  start_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_lead_id, full_name)
);

create index if not exists idx_employees_team_lead_id on public.employees(team_lead_id);
create index if not exists idx_employees_full_name on public.employees(full_name);

alter table public.employees enable row level security;

drop policy if exists "Public prototype can read employees" on public.employees;
create policy "Public prototype can read employees" on public.employees for select to anon, authenticated using (true);

drop policy if exists "Public prototype can insert employees" on public.employees;
create policy "Public prototype can insert employees" on public.employees for insert to anon, authenticated with check (true);

drop policy if exists "Public prototype can update employees" on public.employees;
create policy "Public prototype can update employees" on public.employees for update to anon, authenticated using (true);

drop policy if exists "Public prototype can delete employees" on public.employees;
create policy "Public prototype can delete employees" on public.employees for delete to anon, authenticated using (true);

create or replace function public.sync_employee_from_recruitment()
returns trigger
language plpgsql
as $$
declare
  stage_name_value text;
  should_promote boolean := false;
begin
  if new.current_stage_template_id is not null then
    select stage_name into stage_name_value
    from public.recruitment_stage_templates
    where id = new.current_stage_template_id;
  end if;

  should_promote :=
    new.status = 'hired'
    or lower(coalesce(stage_name_value, '')) in ('התקבל', 'hired', 'accepted');

  if should_promote and new.team_lead_id is not null and coalesce(trim(new.candidate_name), '') <> '' then
    insert into public.employees (team_lead_id, full_name, role_title, start_date, notes)
    values (
      new.team_lead_id,
      new.candidate_name,
      new.role_title,
      coalesce(new.opened_at, current_date),
      'נוסף אוטומטית מתהליך גיוס שהושלם'
    )
    on conflict (team_lead_id, full_name) do update
      set role_title = excluded.role_title,
          start_date = coalesce(public.employees.start_date, excluded.start_date),
          updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_employee_from_recruitment on public.recruitment_processes;
create trigger trg_sync_employee_from_recruitment
after insert or update of status, current_stage_template_id, team_lead_id, candidate_name, role_title
on public.recruitment_processes
for each row
execute function public.sync_employee_from_recruitment();

-- Backfill existing hired candidates.
insert into public.employees (team_lead_id, full_name, role_title, start_date, notes)
select
  rp.team_lead_id,
  rp.candidate_name,
  rp.role_title,
  coalesce(rp.opened_at, current_date),
  'נוסף אוטומטית מתהליך גיוס שהושלם'
from public.recruitment_processes rp
left join public.recruitment_stage_templates rst on rst.id = rp.current_stage_template_id
where rp.team_lead_id is not null
  and coalesce(trim(rp.candidate_name), '') <> ''
  and (
    rp.status = 'hired'
    or lower(coalesce(rst.stage_name, '')) in ('התקבל', 'hired', 'accepted')
  )
on conflict (team_lead_id, full_name) do nothing;
