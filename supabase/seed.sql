-- Seed data for quick demo
-- Run after schema.sql

insert into public.team_leads (full_name, team_name, domain, email, is_available)
values
  ('נועה כהן', 'Delivery A', 'Web', 'noa@amarel.co.il', true),
  ('יואב לוי', 'Delivery B', 'Data', 'yoav@amarel.co.il', true),
  ('דנה שמיר', 'Delivery C', 'Infra', 'dana@amarel.co.il', false)
on conflict do nothing;

insert into public.clients (company_name, primary_contact_name, primary_contact_email, primary_contact_phone, satisfaction_score, is_sensitive, last_contact_at)
values
  ('Contoso Israel', 'Avi Ben-David', 'avi@contoso.co.il', '+972-50-1111111', 8, false, now() - interval '2 day'),
  ('Northwind Labs', 'Maya Shalev', 'maya@northwind.com', '+972-50-2222222', 6, true, now() - interval '10 day'),
  ('Fabrikam Tech', 'Ron Mizrahi', 'ron@fabrikam.io', '+972-50-3333333', 9, false, now() - interval '1 day')
on conflict do nothing;

with c as (
  select id, company_name from public.clients
),
tl as (
  select id, full_name from public.team_leads
)
insert into public.projects (name, description, client_id, team_lead_id, start_date, target_date, status, health_status, progress_percent, budget_planned, budget_actual, sla_target_hours)
values
  ('PMO Digital Portal', 'פורטל ניהול פרויקטים פנימי', (select id from c where company_name = 'Contoso Israel'), (select id from tl where full_name = 'נועה כהן'), current_date - 30, current_date + 30, 'active', 'yellow', 62, 300000, 198000, 24),
  ('Customer SLA Upgrade', 'שדרוג זמני תגובה ופתרון', (select id from c where company_name = 'Northwind Labs'), (select id from tl where full_name = 'יואב לוי'), current_date - 60, current_date - 2, 'active', 'red', 74, 240000, 260000, 12),
  ('Infra Automation', 'אוטומציה לתהליכי DevOps', (select id from c where company_name = 'Fabrikam Tech'), (select id from tl where full_name = 'דנה שמיר'), current_date - 10, current_date + 80, 'planning', 'green', 18, 420000, 45000, 48)
on conflict do nothing;

with p as (
  select id, name from public.projects
),
tl as (
  select id, full_name from public.team_leads
)
insert into public.tasks (project_id, title, description, assignee_team_lead_id, priority, status, due_date)
values
  ((select id from p where name = 'PMO Digital Portal'), 'אפיון דשבורד KPI', 'הגדרת כל המדדים לשבוע ראשון', (select id from tl where full_name = 'נועה כהן'), 'high', 'in_progress', current_date + 2),
  ((select id from p where name = 'PMO Digital Portal'), 'חיבור ל-Supabase', 'CRUD מלא למסך פרויקטים', (select id from tl where full_name = 'נועה כהן'), 'critical', 'todo', current_date + 5),
  ((select id from p where name = 'Customer SLA Upgrade'), 'ניתוח חריגות SLA', 'בדיקה חודשית על כל הקריאות', (select id from tl where full_name = 'יואב לוי'), 'critical', 'blocked', current_date - 1),
  ((select id from p where name = 'Customer SLA Upgrade'), 'שיחת סטטוס לקוח', 'תיאום תוכנית שיפור מול הלקוח', (select id from tl where full_name = 'יואב לוי'), 'high', 'todo', current_date + 1),
  ((select id from p where name = 'Infra Automation'), 'בניית PoC', 'סקריפטים לפריסה אוטומטית', (select id from tl where full_name = 'דנה שמיר'), 'medium', 'todo', current_date + 14)
on conflict do nothing;

with p as (
  select id, name from public.projects
)
insert into public.project_risks (project_id, title, description, severity, probability, mitigation_plan, is_open)
values
  ((select id from p where name = 'Customer SLA Upgrade'), 'עיכוב בתגובת צוות תמיכה', 'זמן תגובה חורג מה-SLA המוגדר', 'critical', 'likely', 'הוספת תורן בכיר ומשמרת ערב', true),
  ((select id from p where name = 'PMO Digital Portal'), 'שינוי דרישות תכוף', 'הלקוח מבקש שינויים בכל ספרינט', 'high', 'possible', 'הקפאת scope לשבועיים בכל פעם', true)
on conflict do nothing;

with p as (
  select id, name from public.projects
),
c as (
  select id, company_name from public.clients
)
insert into public.client_requests (client_id, project_id, request_type, title, details, status)
values
  ((select id from c where company_name = 'Northwind Labs'), (select id from p where name = 'Customer SLA Upgrade'), 'complaint', 'זמן פתרון ארוך', '3 תקלות נשארו פתוחות מעל יומיים', 'open'),
  ((select id from c where company_name = 'Contoso Israel'), (select id from p where name = 'PMO Digital Portal'), 'feature', 'ייצוא דוח שבועי לאקסל', 'דרוש מסך דוחות עם CSV', 'in_review')
on conflict do nothing;

with p as (
  select id, name from public.projects
),
c as (
  select id, company_name from public.clients
)
insert into public.meetings (title, meeting_date, attendees, client_id, project_id, summary)
values
  ('Weekly Status - PMO Portal', now() - interval '1 day', array['Gilad', 'נועה כהן', 'Avi Ben-David'], (select id from c where company_name = 'Contoso Israel'), (select id from p where name = 'PMO Digital Portal'), 'הוחלט לתעדף את מסך ההתראות'),
  ('SLA Recovery Plan', now() - interval '2 day', array['Gilad', 'יואב לוי', 'Maya Shalev'], (select id from c where company_name = 'Northwind Labs'), (select id from p where name = 'Customer SLA Upgrade'), 'הוגדרה תוכנית התאוששות ל-30 יום')
on conflict do nothing;

with m as (
  select id, title from public.meetings
),
p as (
  select id, name from public.projects
),
tl as (
  select id, full_name from public.team_leads
)
insert into public.meeting_action_items (meeting_id, project_id, title, assignee_team_lead_id, due_date, status, create_task)
values
  ((select id from m where title = 'Weekly Status - PMO Portal'), (select id from p where name = 'PMO Digital Portal'), 'לסגור רשימת KPI סופית', (select id from tl where full_name = 'נועה כהן'), current_date + 3, 'todo', true),
  ((select id from m where title = 'SLA Recovery Plan'), (select id from p where name = 'Customer SLA Upgrade'), 'לשפר זמני תגובה בשעות ערב', (select id from tl where full_name = 'יואב לוי'), current_date + 2, 'in_progress', true)
on conflict do nothing;

insert into public.knowledge_items (item_type, title, content, tags)
values
  ('template', 'תבנית סיכום פגישה', 'Agenda\nDecisions\nAction Items\nOwners\nDeadlines', array['meeting', 'template']),
  ('procedure', 'נוהל עדכון לקוח', 'עדכון יזום כל 48 שעות בפרויקטים בסיכון צהוב/אדום', array['client', 'communication']),
  ('tip', 'טיפ לניהול עומסים', 'כשיש מעל 12 משימות פתוחות לאותו ראש צוות, לבצע חלוקה מחדש.', array['team', 'workload']),
  ('insight', 'לקח מפרויקט SLA', 'שקיפות שבועית מול הלקוח הקטינה הסלמה ב-40%.', array['sla', 'lessons'])
on conflict do nothing;

insert into public.sla_events (project_id, client_id, opened_at, first_response_at, resolved_at, response_minutes, resolution_minutes)
select p.id, c.id, now() - interval '2 day', now() - interval '1 day 23 hours', now() - interval '1 day', 60, 1440
from public.projects p
join public.clients c on c.id = p.client_id
where p.name = 'Customer SLA Upgrade'
on conflict do nothing;

insert into public.alerts (alert_type, project_id, message, severity, is_read)
select 'project_overdue', p.id, 'הפרויקט באיחור מול תאריך היעד', 'critical', false
from public.projects p
where p.name = 'Customer SLA Upgrade'
on conflict do nothing;
