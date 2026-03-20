-- Run this in Supabase SQL Editor.
-- Safe to run multiple times.
-- Adds team lead targets + employee targets + limits + auto suggestions helper.

create table if not exists public.team_lead_targets (
  id uuid primary key default gen_random_uuid(),
  team_lead_id uuid not null references public.team_leads(id) on delete cascade,
  title text not null,
  description text,
  target_value numeric(12,2),
  period_start date,
  period_end date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_targets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  team_lead_target_id uuid references public.team_lead_targets(id) on delete set null,
  title text not null,
  description text,
  target_value numeric(12,2),
  period_start date,
  period_end date,
  target_year int not null default (extract(year from current_date)::int),
  is_continuing boolean not null default false,
  status text not null default 'proposed' check (status in ('proposed', 'selected', 'active', 'completed', 'cancelled')),
  source text not null default 'manual' check (source in ('manual', 'auto_history')),
  recommendation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employee_targets add column if not exists target_year int;
alter table public.employee_targets add column if not exists is_continuing boolean not null default false;
alter table public.employee_targets add column if not exists recommendation_reason text;
alter table public.employee_targets alter column target_year set default extract(year from current_date);
update public.employee_targets set target_year = extract(year from coalesce(period_start, created_at)) where target_year is null;
alter table public.employee_targets alter column target_year set not null;

create index if not exists idx_team_lead_targets_team_lead_id on public.team_lead_targets(team_lead_id);
create index if not exists idx_team_lead_targets_status on public.team_lead_targets(status);
create index if not exists idx_employee_targets_employee_id on public.employee_targets(employee_id);
create index if not exists idx_employee_targets_status on public.employee_targets(status);
create index if not exists idx_employee_targets_employee_year on public.employee_targets(employee_id, target_year);

alter table public.team_lead_targets enable row level security;
alter table public.employee_targets enable row level security;

drop policy if exists "Public prototype can read team lead targets" on public.team_lead_targets;
create policy "Public prototype can read team lead targets" on public.team_lead_targets for select to anon, authenticated using (true);

drop policy if exists "Public prototype can insert team lead targets" on public.team_lead_targets;
create policy "Public prototype can insert team lead targets" on public.team_lead_targets for insert to anon, authenticated with check (true);

drop policy if exists "Public prototype can update team lead targets" on public.team_lead_targets;
create policy "Public prototype can update team lead targets" on public.team_lead_targets for update to anon, authenticated using (true);

drop policy if exists "Public prototype can delete team lead targets" on public.team_lead_targets;
create policy "Public prototype can delete team lead targets" on public.team_lead_targets for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can read employee targets" on public.employee_targets;
create policy "Public prototype can read employee targets" on public.employee_targets for select to anon, authenticated using (true);

drop policy if exists "Public prototype can insert employee targets" on public.employee_targets;
create policy "Public prototype can insert employee targets" on public.employee_targets for insert to anon, authenticated with check (true);

drop policy if exists "Public prototype can update employee targets" on public.employee_targets;
create policy "Public prototype can update employee targets" on public.employee_targets for update to anon, authenticated using (true);

drop policy if exists "Public prototype can delete employee targets" on public.employee_targets;
create policy "Public prototype can delete employee targets" on public.employee_targets for delete to anon, authenticated using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_team_lead_targets_updated_at on public.team_lead_targets;
create trigger set_team_lead_targets_updated_at before update on public.team_lead_targets
for each row execute function public.set_updated_at();

drop trigger if exists set_employee_targets_updated_at on public.employee_targets;
create trigger set_employee_targets_updated_at before update on public.employee_targets
for each row execute function public.set_updated_at();

create or replace function public.enforce_employee_target_limits()
returns trigger
language plpgsql
as $$
declare
  proposed_count int;
  selected_count int;
  normalized_year int;
begin
  if new.employee_id is null then
    return new;
  end if;

  normalized_year := coalesce(new.target_year, extract(year from current_date)::int);
  new.target_year := normalized_year;

  if new.status = 'proposed' then
    select count(*)
    into proposed_count
    from public.employee_targets et
    where et.employee_id = new.employee_id
      and et.status = 'proposed'
      and et.target_year = normalized_year
      and (tg_op = 'INSERT' or et.id <> new.id);

    if proposed_count >= 20 then
      raise exception 'Only up to 20 proposed goals are allowed per employee per year';
    end if;
  end if;

  if new.status in ('selected', 'active') then
    select count(*)
    into selected_count
    from public.employee_targets et
    where et.employee_id = new.employee_id
      and et.status in ('selected', 'active')
      and et.target_year = normalized_year
      and (tg_op = 'INSERT' or et.id <> new.id);

    if selected_count >= 3 then
      raise exception 'Only up to 3 selected/active goals are allowed per employee per year';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_employee_target_limits on public.employee_targets;
create trigger trg_enforce_employee_target_limits
before insert or update of employee_id, status
on public.employee_targets
for each row
execute function public.enforce_employee_target_limits();

create or replace function public.generate_employee_target_suggestions(
  p_employee_id uuid,
  p_limit int default 20,
  p_target_year int default (extract(year from current_date)::int + 1)
)
returns int
language plpgsql
as $$
declare
  v_limit int := greatest(0, least(coalesce(p_limit, 20), 20));
  v_target_year int := coalesce(p_target_year, extract(year from current_date)::int + 1);
  inserted_count int := 0;
begin
  if p_employee_id is null or v_limit = 0 then
    return 0;
  end if;

  with employee_ctx as (
    select e.id as employee_id, e.team_lead_id, coalesce(e.role_title, '') as role_title
    from public.employees e
    where e.id = p_employee_id
  ),
  historical_ranked as (
    select
      et.title,
      min(et.description) as description,
      bool_or(coalesce(et.is_continuing, false)) as is_continuing,
      count(*)::int
        + case when et.employee_id = p_employee_id then 3 else 0 end
        + case when lower(coalesce(e.role_title, '')) = lower((select role_title from employee_ctx limit 1)) then 2 else 0 end as score,
      'מומלץ לפי יעדי עבר דומים של העובד/הצוות'::text as recommendation_reason
    from public.employee_targets et
    join public.employees e on e.id = et.employee_id
    join employee_ctx c on c.team_lead_id = e.team_lead_id
    where et.status in ('selected', 'active', 'completed')
    group by et.title, et.employee_id, e.role_title
  ),
  continuing_from_prev_year as (
    select
      et.title,
      et.description,
      true as is_continuing,
      100 as score,
      'יעד מתמשך משנה קודמת שניתן להמשיך גם בשנה הקרובה'::text as recommendation_reason
    from public.employee_targets et
    where et.employee_id = p_employee_id
      and et.target_year = v_target_year - 1
      and et.status in ('selected', 'active', 'completed')
  ),
  role_based_templates as (
    select *
    from (
      values
        ('frontend', 'להמשיך להצטיין באיכות פיתוח ו-UX', 'שיפור עקבי בחוויית משתמש ואיכות קוד', true, 40, 'מומלץ לפי תפקיד Frontend'),
        ('data', 'להמשיך להוביל תובנות עסקיות מבוססות נתונים', 'דיוק גבוה במדדים ושיפור דוחות', true, 40, 'מומלץ לפי תפקיד Data'),
        ('devops', 'להמשיך לשפר יציבות ותהליכי CI/CD', 'שיפור אמינות פרודקשן וזמני תגובה', true, 40, 'מומלץ לפי תפקיד DevOps'),
        ('qa', 'להמשיך להעלות איכות בדיקות וכיסוי', 'צמצום באגים חוזרים והקשחת בדיקות', true, 40, 'מומלץ לפי תפקיד QA'),
        ('generic', 'להמשיך להצטיין בתפקיד', 'יעד מתמשך לשמירה על רמת ביצוע גבוהה', true, 30, 'יעד מתמשך כללי לשנה הקרובה')
    ) as t(role_key, title, description, is_continuing, score, recommendation_reason)
    where role_key = 'generic'
       or lower((select role_title from employee_ctx limit 1)) like '%' || role_key || '%'
  ),
  historical as (
    select title, description, is_continuing, score, recommendation_reason from historical_ranked
    union all
    select title, description, is_continuing, score, recommendation_reason from continuing_from_prev_year
    union all
    select title, description, is_continuing, score, recommendation_reason from role_based_templates
  ),
  ranked as (
    select
      h.title,
      min(h.description) as description,
      bool_or(h.is_continuing) as is_continuing,
      max(h.score) as score,
      min(h.recommendation_reason) as recommendation_reason
    from historical h
    group by h.title
  ),
  filtered as (
    select r.*
    from ranked r
    where not exists (
      select 1
      from public.employee_targets existing
      where existing.employee_id = p_employee_id
        and existing.target_year = v_target_year
        and lower(trim(existing.title)) = lower(trim(r.title))
    )
    order by r.score desc, r.title
    limit v_limit
  ),
  inserted as (
    insert into public.employee_targets (
      employee_id,
      title,
      description,
      target_year,
      is_continuing,
      status,
      source,
      recommendation_reason,
      period_start
    )
    select
      p_employee_id,
      f.title,
      f.description,
      v_target_year,
      f.is_continuing,
      'proposed',
      'auto_history',
      f.recommendation_reason,
      make_date(v_target_year, 1, 1)
    from filtered f
    returning id
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;