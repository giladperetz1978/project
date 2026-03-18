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
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_lead_id, candidate_name, role_title)
);

create index if not exists idx_recruitment_processes_team_lead_id on public.recruitment_processes(team_lead_id);
create index if not exists idx_recruitment_processes_status on public.recruitment_processes(status);

alter table public.recruitment_processes enable row level security;

drop policy if exists "Public prototype can read recruitment processes" on public.recruitment_processes;
create policy "Public prototype can read recruitment processes" on public.recruitment_processes for select to anon, authenticated using (true);

drop policy if exists "Public prototype can insert recruitment processes" on public.recruitment_processes;
create policy "Public prototype can insert recruitment processes" on public.recruitment_processes for insert to anon, authenticated with check (true);

drop policy if exists "Public prototype can update recruitment processes" on public.recruitment_processes;
create policy "Public prototype can update recruitment processes" on public.recruitment_processes for update to anon, authenticated using (true);

drop policy if exists "Public prototype can delete recruitment processes" on public.recruitment_processes;
create policy "Public prototype can delete recruitment processes" on public.recruitment_processes for delete to anon, authenticated using (true);

create trigger set_recruitment_processes_updated_at before update on public.recruitment_processes
for each row execute function public.set_updated_at();

with tl as (
  select id, full_name from public.team_leads
)
insert into public.recruitment_processes (team_lead_id, candidate_name, role_title, status, source_channel, opened_at, notes)
values
  ((select id from tl where full_name = 'נועה כהן'), 'אלעד מזרחי', 'Frontend Developer', 'new', 'LinkedIn', current_date - 2, 'נפתחה משרה חדשה לצוות Web'),
  ((select id from tl where full_name = 'נועה כהן'), 'מיכל סעדון', 'Frontend Developer', 'sourcing', 'Employee Referral', current_date - 5, 'איסוף מועמדים פעיל'),
  ((select id from tl where full_name = 'נועה כהן'), 'רוני ברק', 'UX Engineer', 'screening', 'LinkedIn', current_date - 8, 'עבר סינון קורות חיים ראשוני'),
  ((select id from tl where full_name = 'נועה כהן'), 'שיר כהן', 'Frontend Developer', 'interview', 'Niche Job Board', current_date - 10, 'נקבע ראיון מקצועי ראשון'),
  ((select id from tl where full_name = 'נועה כהן'), 'אור קפלן', 'Frontend Developer', 'technical', 'Employee Referral', current_date - 13, 'ממתין לתרגיל בית'),
  ((select id from tl where full_name = 'נועה כהן'), 'תום גבע', 'Frontend Developer', 'final_interview', 'LinkedIn', current_date - 16, 'עבר בהצלחה ראיונות ביניים'),
  ((select id from tl where full_name = 'נועה כהן'), 'נועם יחזקאל', 'Frontend Developer', 'offer', 'LinkedIn', current_date - 19, 'הוגשה הצעת שכר'),
  ((select id from tl where full_name = 'נועה כהן'), 'מור אברהמי', 'Frontend Developer', 'hired', 'Employee Referral', current_date - 25, 'הצטרף לצוות החודש'),
  ((select id from tl where full_name = 'נועה כהן'), 'גל דהן', 'UX Engineer', 'on_hold', 'Niche Job Board', current_date - 12, 'מושהה עקב שינוי תקציב'),
  ((select id from tl where full_name = 'נועה כהן'), 'רז שפירא', 'Frontend Developer', 'rejected', 'LinkedIn', current_date - 9, 'לא נמצאה התאמה טכנית'),

  ((select id from tl where full_name = 'יואב לוי'), 'דניאל לוי', 'Data Analyst', 'new', 'LinkedIn', current_date - 1, 'פתיחת תקן חדש בתחום BI'),
  ((select id from tl where full_name = 'יואב לוי'), 'הילה דרור', 'Data Engineer', 'sourcing', 'Employee Referral', current_date - 4, 'פנייה ישירה למועמדים רלוונטיים'),
  ((select id from tl where full_name = 'יואב לוי'), 'שקד רפאל', 'Data Analyst', 'screening', 'LinkedIn', current_date - 6, 'עבר סינון טלפוני'),
  ((select id from tl where full_name = 'יואב לוי'), 'אדם פרידמן', 'Data Scientist', 'interview', 'Niche Job Board', current_date - 9, 'ראיון עם ראש צוות בוצע'),
  ((select id from tl where full_name = 'יואב לוי'), 'דין סלע', 'Data Engineer', 'technical', 'Employee Referral', current_date - 12, 'הועבר מבחן SQL ו-Python'),
  ((select id from tl where full_name = 'יואב לוי'), 'אופק שלו', 'Data Analyst', 'final_interview', 'LinkedIn', current_date - 15, 'בשלב ראיון הנהלה'),
  ((select id from tl where full_name = 'יואב לוי'), 'שי ברוך', 'Data Engineer', 'offer', 'LinkedIn', current_date - 18, 'ממתינים לאישור סופי מהנהלה'),
  ((select id from tl where full_name = 'יואב לוי'), 'אביב קורן', 'Data Analyst', 'hired', 'Employee Referral', current_date - 23, 'נקלט בהצלחה בצוות Data'),
  ((select id from tl where full_name = 'יואב לוי'), 'גיל הדר', 'Data Scientist', 'on_hold', 'Niche Job Board', current_date - 11, 'מוקפא זמנית עד אישור תקן נוסף'),
  ((select id from tl where full_name = 'יואב לוי'), 'עדי ליבנה', 'Data Analyst', 'rejected', 'LinkedIn', current_date - 7, 'פער בניסיון במודלים מתקדמים'),

  ((select id from tl where full_name = 'דנה שמיר'), 'יונתן גל', 'DevOps Engineer', 'new', 'LinkedIn', current_date - 3, 'תקן חדש לתמיכת אוטומציה'),
  ((select id from tl where full_name = 'דנה שמיר'), 'רותם ששון', 'Cloud Engineer', 'sourcing', 'Employee Referral', current_date - 5, 'תחילת מיפוי מועמדים'),
  ((select id from tl where full_name = 'דנה שמיר'), 'מתן פז', 'DevOps Engineer', 'screening', 'LinkedIn', current_date - 8, 'עבר סינון HR'),
  ((select id from tl where full_name = 'דנה שמיר'), 'עומר אדרי', 'Cloud Engineer', 'interview', 'Niche Job Board', current_date - 10, 'מתקיים ראיון טכני ראשון'),
  ((select id from tl where full_name = 'דנה שמיר'), 'זיו רפפורט', 'DevOps Engineer', 'technical', 'Employee Referral', current_date - 13, 'בשלב בדיקת תרחישי Production'),
  ((select id from tl where full_name = 'דנה שמיר'), 'רועי להב', 'Cloud Engineer', 'final_interview', 'LinkedIn', current_date - 16, 'ראיון מסכם מתוכנן לשבוע הבא'),
  ((select id from tl where full_name = 'דנה שמיר'), 'נעם אלון', 'SRE Engineer', 'offer', 'LinkedIn', current_date - 19, 'נשלחה הצעה מותנית בהמלצות'),
  ((select id from tl where full_name = 'דנה שמיר'), 'מאיה פרץ', 'DevOps Engineer', 'hired', 'Employee Referral', current_date - 27, 'הצטרפה לסבב Onboarding'),
  ((select id from tl where full_name = 'דנה שמיר'), 'שי לנדאו', 'Cloud Engineer', 'on_hold', 'Niche Job Board', current_date - 14, 'מושהה עד סיום פרויקט לקוח קריטי'),
  ((select id from tl where full_name = 'דנה שמיר'), 'יעל ציון', 'DevOps Engineer', 'rejected', 'LinkedIn', current_date - 9, 'לא עמדה בדרישות זמינות')
on conflict do nothing;
