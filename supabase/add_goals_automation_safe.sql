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
  status text not null default 'proposed' check (status in ('proposed', 'selected', 'active', 'completed', 'cancelled')),
  source text not null default 'manual' check (source in ('manual', 'auto_history')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_lead_targets_team_lead_id on public.team_lead_targets(team_lead_id);
create index if not exists idx_team_lead_targets_status on public.team_lead_targets(status);
create index if not exists idx_employee_targets_employee_id on public.employee_targets(employee_id);
create index if not exists idx_employee_targets_status on public.employee_targets(status);

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
begin
  if new.employee_id is null then
    return new;
  end if;

  if new.status = 'proposed' then
    select count(*)
    into proposed_count
    from public.employee_targets et
    where et.employee_id = new.employee_id
      and et.status = 'proposed'
      and (tg_op = 'INSERT' or et.id <> new.id);

    if proposed_count >= 20 then
      raise exception 'Only up to 20 proposed goals are allowed per employee';
    end if;
  end if;

  if new.status in ('selected', 'active') then
    select count(*)
    into selected_count
    from public.employee_targets et
    where et.employee_id = new.employee_id
      and et.status in ('selected', 'active')
      and (tg_op = 'INSERT' or et.id <> new.id);

    if selected_count >= 3 then
      raise exception 'Only up to 3 selected/active goals are allowed per employee';
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

create or replace function public.generate_employee_target_suggestions(p_employee_id uuid, p_limit int default 20)
returns int
language plpgsql
as $$
declare
  v_limit int := greatest(0, least(coalesce(p_limit, 20), 20));
  inserted_count int := 0;
begin
  if p_employee_id is null or v_limit = 0 then
    return 0;
  end if;

  with employee_ctx as (
    select e.id as employee_id, e.team_lead_id
    from public.employees e
    where e.id = p_employee_id
  ),
  historical as (
    select
      et.title,
      min(et.description) as description,
      count(*) as score
    from public.employee_targets et
    join public.employees e on e.id = et.employee_id
    join employee_ctx c on c.team_lead_id = e.team_lead_id
    where et.status in ('selected', 'active', 'completed')
    group by et.title
  ),
  ranked as (
    select h.*
    from historical h
    where not exists (
      select 1
      from public.employee_targets existing
      where existing.employee_id = p_employee_id
        and lower(trim(existing.title)) = lower(trim(h.title))
    )
    order by h.score desc, h.title
    limit v_limit
  ),
  inserted as (
    insert into public.employee_targets (
      employee_id,
      title,
      description,
      status,
      source,
      period_start
    )
    select
      p_employee_id,
      r.title,
      r.description,
      'proposed',
      'auto_history',
      current_date
    from ranked r
    returning id
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;