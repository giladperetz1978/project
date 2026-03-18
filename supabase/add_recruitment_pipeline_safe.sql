-- Run this in Supabase SQL Editor on an existing project.
-- Safe to run multiple times.
-- Adds recruitment pipeline table + policies + demo rows under each team lead.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'recruitment_status') then
    create type recruitment_status as enum ('new', 'sourcing', 'screening', 'interview', 'technical', 'final_interview', 'offer', 'hired', 'on_hold', 'rejected');
  end if;
end;
$$;

create table if not exists public.recruitment_processes (
  id uuid primary key default gen_random_uuid(),
  team_lead_id uuid not null references public.team_leads(id) on delete cascade,
  candidate_name text not null,
  role_title text not null,
  status recruitment_status not null default 'new',
  source_channel text,
  opened_at date not null default current_date,
  next_status_check_date date,
  reminder_enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_lead_id, candidate_name, role_title)
);

alter table public.recruitment_processes add column if not exists next_status_check_date date;
alter table public.recruitment_processes add column if not exists reminder_enabled boolean not null default true;

create table if not exists public.recruitment_process_steps (
  id uuid primary key default gen_random_uuid(),
  recruitment_process_id uuid not null references public.recruitment_processes(id) on delete cascade,
  step_name text not null,
  step_status text not null default 'pending' check (step_status in ('pending', 'in_progress', 'done', 'blocked')),
  next_check_date date,
  reminder_enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recruitment_process_id, step_name)
);

create index if not exists idx_recruitment_processes_team_lead_id on public.recruitment_processes(team_lead_id);
create index if not exists idx_recruitment_processes_status on public.recruitment_processes(status);
create index if not exists idx_recruitment_process_steps_process_id on public.recruitment_process_steps(recruitment_process_id);
create index if not exists idx_recruitment_process_steps_status on public.recruitment_process_steps(step_status);

alter table public.recruitment_processes enable row level security;
alter table public.recruitment_process_steps enable row level security;

drop policy if exists "Public prototype can read recruitment processes" on public.recruitment_processes;
create policy "Public prototype can read recruitment processes" on public.recruitment_processes for select to anon, authenticated using (true);

drop policy if exists "Public prototype can insert recruitment processes" on public.recruitment_processes;
create policy "Public prototype can insert recruitment processes" on public.recruitment_processes for insert to anon, authenticated with check (true);

drop policy if exists "Public prototype can update recruitment processes" on public.recruitment_processes;
create policy "Public prototype can update recruitment processes" on public.recruitment_processes for update to anon, authenticated using (true);

drop policy if exists "Public prototype can delete recruitment processes" on public.recruitment_processes;
create policy "Public prototype can delete recruitment processes" on public.recruitment_processes for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can read recruitment process steps" on public.recruitment_process_steps;
create policy "Public prototype can read recruitment process steps" on public.recruitment_process_steps for select to anon, authenticated using (true);

drop policy if exists "Public prototype can insert recruitment process steps" on public.recruitment_process_steps;
create policy "Public prototype can insert recruitment process steps" on public.recruitment_process_steps for insert to anon, authenticated with check (true);

drop policy if exists "Public prototype can update recruitment process steps" on public.recruitment_process_steps;
create policy "Public prototype can update recruitment process steps" on public.recruitment_process_steps for update to anon, authenticated using (true);

drop policy if exists "Public prototype can delete recruitment process steps" on public.recruitment_process_steps;
create policy "Public prototype can delete recruitment process steps" on public.recruitment_process_steps for delete to anon, authenticated using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_recruitment_processes_updated_at on public.recruitment_processes;
create trigger set_recruitment_processes_updated_at before update on public.recruitment_processes
for each row execute function public.set_updated_at();

drop trigger if exists set_recruitment_process_steps_updated_at on public.recruitment_process_steps;
create trigger set_recruitment_process_steps_updated_at before update on public.recruitment_process_steps
for each row execute function public.set_updated_at();

with seed(preferred_team_lead, candidate_name, role_title, status, source_channel, opened_at, notes) as (
  values
    ('נועה כהן', 'אלעד מזרחי', 'Frontend Developer', 'new', 'LinkedIn', current_date - 2, 'נפתחה משרה חדשה לצוות Web'),
    ('נועה כהן', 'מיכל סעדון', 'Frontend Developer', 'sourcing', 'Employee Referral', current_date - 5, 'איסוף מועמדים פעיל'),
    ('נועה כהן', 'רוני ברק', 'UX Engineer', 'screening', 'LinkedIn', current_date - 8, 'עבר סינון קורות חיים ראשוני'),
    ('נועה כהן', 'שיר כהן', 'Frontend Developer', 'interview', 'Niche Job Board', current_date - 10, 'נקבע ראיון מקצועי ראשון'),
    ('נועה כהן', 'אור קפלן', 'Frontend Developer', 'technical', 'Employee Referral', current_date - 13, 'ממתין לתרגיל בית'),
    ('נועה כהן', 'תום גבע', 'Frontend Developer', 'final_interview', 'LinkedIn', current_date - 16, 'עבר בהצלחה ראיונות ביניים'),
    ('נועה כהן', 'נועם יחזקאל', 'Frontend Developer', 'offer', 'LinkedIn', current_date - 19, 'הוגשה הצעת שכר'),
    ('נועה כהן', 'מור אברהמי', 'Frontend Developer', 'hired', 'Employee Referral', current_date - 25, 'הצטרף לצוות החודש'),
    ('נועה כהן', 'גל דהן', 'UX Engineer', 'on_hold', 'Niche Job Board', current_date - 12, 'מושהה עקב שינוי תקציב'),
    ('נועה כהן', 'רז שפירא', 'Frontend Developer', 'rejected', 'LinkedIn', current_date - 9, 'לא נמצאה התאמה טכנית'),

    ('יואב לוי', 'דניאל לוי', 'Data Analyst', 'new', 'LinkedIn', current_date - 1, 'פתיחת תקן חדש בתחום BI'),
    ('יואב לוי', 'הילה דרור', 'Data Engineer', 'sourcing', 'Employee Referral', current_date - 4, 'פנייה ישירה למועמדים רלוונטיים'),
    ('יואב לוי', 'שקד רפאל', 'Data Analyst', 'screening', 'LinkedIn', current_date - 6, 'עבר סינון טלפוני'),
    ('יואב לוי', 'אדם פרידמן', 'Data Scientist', 'interview', 'Niche Job Board', current_date - 9, 'ראיון עם ראש צוות בוצע'),
    ('יואב לוי', 'דין סלע', 'Data Engineer', 'technical', 'Employee Referral', current_date - 12, 'הועבר מבחן SQL ו-Python'),
    ('יואב לוי', 'אופק שלו', 'Data Analyst', 'final_interview', 'LinkedIn', current_date - 15, 'בשלב ראיון הנהלה'),
    ('יואב לוי', 'שי ברוך', 'Data Engineer', 'offer', 'LinkedIn', current_date - 18, 'ממתינים לאישור סופי מהנהלה'),
    ('יואב לוי', 'אביב קורן', 'Data Analyst', 'hired', 'Employee Referral', current_date - 23, 'נקלט בהצלחה בצוות Data'),
    ('יואב לוי', 'גיל הדר', 'Data Scientist', 'on_hold', 'Niche Job Board', current_date - 11, 'מוקפא זמנית עד אישור תקן נוסף'),
    ('יואב לוי', 'עדי ליבנה', 'Data Analyst', 'rejected', 'LinkedIn', current_date - 7, 'פער בניסיון במודלים מתקדמים'),

    ('דנה שמיר', 'יונתן גל', 'DevOps Engineer', 'new', 'LinkedIn', current_date - 3, 'תקן חדש לתמיכת אוטומציה'),
    ('דנה שמיר', 'רותם ששון', 'Cloud Engineer', 'sourcing', 'Employee Referral', current_date - 5, 'תחילת מיפוי מועמדים'),
    ('דנה שמיר', 'מתן פז', 'DevOps Engineer', 'screening', 'LinkedIn', current_date - 8, 'עבר סינון HR'),
    ('דנה שמיר', 'עומר אדרי', 'Cloud Engineer', 'interview', 'Niche Job Board', current_date - 10, 'מתקיים ראיון טכני ראשון'),
    ('דנה שמיר', 'זיו רפפורט', 'DevOps Engineer', 'technical', 'Employee Referral', current_date - 13, 'בשלב בדיקת תרחישי Production'),
    ('דנה שמיר', 'רועי להב', 'Cloud Engineer', 'final_interview', 'LinkedIn', current_date - 16, 'ראיון מסכם מתוכנן לשבוע הבא'),
    ('דנה שמיר', 'נעם אלון', 'SRE Engineer', 'offer', 'LinkedIn', current_date - 19, 'נשלחה הצעה מותנית בהמלצות'),
    ('דנה שמיר', 'מאיה פרץ', 'DevOps Engineer', 'hired', 'Employee Referral', current_date - 27, 'הצטרפה לסבב Onboarding'),
    ('דנה שמיר', 'שי לנדאו', 'Cloud Engineer', 'on_hold', 'Niche Job Board', current_date - 14, 'מושהה עד סיום פרויקט לקוח קריטי'),
    ('דנה שמיר', 'יעל ציון', 'DevOps Engineer', 'rejected', 'LinkedIn', current_date - 9, 'לא עמדה בדרישות זמינות')
),
team_leads_ranked as (
  select
    id,
    full_name,
    row_number() over (order by full_name, id) as rn,
    count(*) over () as cnt
  from public.team_leads
),
seed_ranked as (
  select
    row_number() over (order by candidate_name, role_title) as seq,
    *
  from seed
),
mapped as (
  select
    coalesce(
      exact.id,
      (
        select tlr.id
        from team_leads_ranked tlr
        where tlr.cnt > 0
          and tlr.rn = ((sr.seq - 1) % tlr.cnt) + 1
      )
    ) as team_lead_id,
    sr.candidate_name,
    sr.role_title,
    sr.status::recruitment_status as status,
    sr.source_channel,
    sr.opened_at,
    sr.notes
  from seed_ranked sr
  left join public.team_leads exact on exact.full_name = sr.preferred_team_lead
)
insert into public.recruitment_processes (team_lead_id, candidate_name, role_title, status, source_channel, opened_at, notes)
select team_lead_id, candidate_name, role_title, status, source_channel, opened_at, notes
from mapped
where team_lead_id is not null
on conflict do nothing;
