-- Supabase Project Management Schema
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Enums
create type project_status as enum ('planning', 'active', 'on_hold', 'completed', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'critical');
create type task_status as enum ('todo', 'in_progress', 'blocked', 'done');
create type milestone_status as enum ('not_started', 'in_progress', 'done', 'delayed');
create type risk_severity as enum ('low', 'medium', 'high', 'critical');
create type risk_probability as enum ('rare', 'possible', 'likely', 'almost_certain');
create type client_request_type as enum ('feature', 'complaint', 'follow_up', 'other');
create type alert_type as enum ('project_deadline', 'task_deadline', 'project_overdue', 'client_silence', 'team_overload', 'critical_task');
create type kb_item_type as enum ('template', 'procedure', 'tip', 'insight');
create type recruitment_status as enum ('new', 'sourcing', 'screening', 'interview', 'technical', 'final_interview', 'offer', 'hired', 'on_hold', 'rejected');

-- Profiles (optional if you use Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text,
  created_at timestamptz not null default now()
);

create table public.team_leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  team_name text,
  domain text,
  email text,
  phone text,
  is_available boolean not null default true,
  vacation_from date,
  vacation_to date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recruitment_processes (
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

create table public.recruitment_process_steps (
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

create table public.recruitment_stage_templates (
  id uuid primary key default gen_random_uuid(),
  stage_name text not null unique,
  sort_order int not null default 0,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recruitment_positions (
  id uuid primary key default gen_random_uuid(),
  position_name text not null unique,
  position_profile text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  satisfaction_score int check (satisfaction_score between 1 and 10),
  is_sensitive boolean not null default false,
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  client_id uuid not null references public.clients(id) on delete restrict,
  team_lead_id uuid references public.team_leads(id) on delete set null,
  start_date date,
  target_date date,
  status project_status not null default 'planning',
  health_status text not null default 'green' check (health_status in ('green', 'yellow', 'red')),
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  budget_planned numeric(12,2) not null default 0,
  budget_actual numeric(12,2) not null default 0,
  sla_target_hours int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  due_date date,
  status milestone_status not null default 'not_started',
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null,
  description text,
  assignee_team_lead_id uuid references public.team_leads(id) on delete set null,
  priority task_priority not null default 'medium',
  status task_status not null default 'todo',
  due_date date,
  completed_at timestamptz,
  source_meeting_action_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null,
  severity risk_severity not null,
  probability risk_probability not null,
  mitigation_plan text,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  file_url text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.client_communications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  communication_type text not null check (communication_type in ('call', 'email', 'meeting_note', 'decision')),
  summary text not null,
  communicated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.client_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  request_type client_request_type not null,
  title text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'in_review', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sla_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  opened_at timestamptz not null,
  first_response_at timestamptz,
  resolved_at timestamptz,
  response_minutes int,
  resolution_minutes int,
  created_at timestamptz not null default now()
);

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  item_type kb_item_type not null,
  title text not null,
  content text not null,
  tags text[] default '{}',
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date timestamptz not null,
  attendees text[] not null default '{}',
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  decision_text text not null,
  created_at timestamptz not null default now()
);

create table public.meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  assignee_team_lead_id uuid references public.team_leads(id) on delete set null,
  due_date date,
  status task_status not null default 'todo',
  create_task boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add constraint tasks_source_meeting_action_item_id_fkey
  foreign key (source_meeting_action_item_id)
  references public.meeting_action_items(id)
  on delete set null;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type alert_type not null,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  team_lead_id uuid references public.team_leads(id) on delete cascade,
  message text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  is_read boolean not null default false,
  generated_at timestamptz not null default now()
);

create table public.project_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  snapshot_date date not null default current_date,
  progress_percent numeric(5,2) not null check (progress_percent >= 0 and progress_percent <= 100),
  unique (project_id, snapshot_date)
);

-- Helpful indexes
create index idx_projects_client_id on public.projects(client_id);
create index idx_projects_team_lead_id on public.projects(team_lead_id);
create index idx_projects_status on public.projects(status);
create index idx_recruitment_processes_team_lead_id on public.recruitment_processes(team_lead_id);
create index idx_recruitment_processes_status on public.recruitment_processes(status);
create index idx_recruitment_process_steps_process_id on public.recruitment_process_steps(recruitment_process_id);
create index idx_recruitment_process_steps_status on public.recruitment_process_steps(step_status);
create index idx_recruitment_stage_templates_sort_order on public.recruitment_stage_templates(sort_order);
create index idx_recruitment_positions_active on public.recruitment_positions(is_active);
create index idx_tasks_project_id on public.tasks(project_id);
create index idx_tasks_assignee on public.tasks(assignee_team_lead_id);
create index idx_tasks_status on public.tasks(status);
create index idx_milestones_project_id on public.milestones(project_id);
create index idx_risks_project_id on public.project_risks(project_id);
create index idx_client_communications_client_id on public.client_communications(client_id);
create index idx_client_requests_client_id on public.client_requests(client_id);
create index idx_meetings_project_id on public.meetings(project_id);
create index idx_alerts_generated_at on public.alerts(generated_at desc);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_team_leads_updated_at before update on public.team_leads
for each row execute function public.set_updated_at();

create trigger set_recruitment_processes_updated_at before update on public.recruitment_processes
for each row execute function public.set_updated_at();

create trigger set_recruitment_process_steps_updated_at before update on public.recruitment_process_steps
for each row execute function public.set_updated_at();

create trigger set_recruitment_stage_templates_updated_at before update on public.recruitment_stage_templates
for each row execute function public.set_updated_at();

create trigger set_recruitment_positions_updated_at before update on public.recruitment_positions
for each row execute function public.set_updated_at();

create trigger set_clients_updated_at before update on public.clients
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_milestones_updated_at before update on public.milestones
for each row execute function public.set_updated_at();

create trigger set_tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

create trigger set_project_risks_updated_at before update on public.project_risks
for each row execute function public.set_updated_at();

create trigger set_client_requests_updated_at before update on public.client_requests
for each row execute function public.set_updated_at();

create trigger set_knowledge_items_updated_at before update on public.knowledge_items
for each row execute function public.set_updated_at();

create trigger set_meetings_updated_at before update on public.meetings
for each row execute function public.set_updated_at();

create trigger set_meeting_action_items_updated_at before update on public.meeting_action_items
for each row execute function public.set_updated_at();

-- Create tasks from meeting action items
create or replace function public.sync_meeting_action_item_to_task()
returns trigger
language plpgsql
as $$
begin
  if (new.create_task = true) then
    insert into public.tasks (
      project_id,
      title,
      assignee_team_lead_id,
      due_date,
      status,
      source_meeting_action_item_id
    )
    values (
      coalesce(new.project_id, (select project_id from public.meetings where id = new.meeting_id)),
      new.title,
      new.assignee_team_lead_id,
      new.due_date,
      new.status,
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger trg_sync_meeting_action_item_to_task
after insert on public.meeting_action_items
for each row execute function public.sync_meeting_action_item_to_task();

-- Views for dashboard and analytics
create or replace view public.v_team_lead_workload as
select
  tl.id as team_lead_id,
  tl.full_name,
  count(distinct p.id) filter (where p.status in ('planning', 'active', 'on_hold')) as active_projects,
  count(t.id) filter (where t.status in ('todo', 'in_progress', 'blocked')) as open_tasks,
  count(t.id) filter (where t.status = 'done') as closed_tasks
from public.team_leads tl
left join public.projects p on p.team_lead_id = tl.id
left join public.tasks t on t.assignee_team_lead_id = tl.id
group by tl.id, tl.full_name;

create or replace view public.v_project_task_stats as
select
  p.id as project_id,
  p.name as project_name,
  count(t.id) as total_tasks,
  count(t.id) filter (where t.status in ('todo', 'in_progress', 'blocked')) as open_tasks,
  count(t.id) filter (where t.status = 'done') as done_tasks
from public.projects p
left join public.tasks t on t.project_id = p.id
group by p.id, p.name;

create or replace view public.v_dashboard_kpis as
select
  (select count(*) from public.tasks where status = 'done' and completed_at >= now() - interval '7 day') as tasks_completed_last_7_days,
  (select count(*) from public.projects where health_status = 'red') as projects_at_risk,
  (select count(*) from public.alerts where is_read = false) as unread_alerts,
  (select round(avg(response_minutes)::numeric, 2) from public.sla_events where response_minutes is not null) as avg_response_minutes,
  (select round(avg(resolution_minutes)::numeric, 2) from public.sla_events where resolution_minutes is not null) as avg_resolution_minutes;

-- RLS (basic template - tighten in production)
alter table public.profiles enable row level security;
alter table public.team_leads enable row level security;
alter table public.recruitment_processes enable row level security;
alter table public.recruitment_process_steps enable row level security;
alter table public.recruitment_stage_templates enable row level security;
alter table public.recruitment_positions enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.project_risks enable row level security;
alter table public.project_documents enable row level security;
alter table public.client_communications enable row level security;
alter table public.client_requests enable row level security;
alter table public.sla_events enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_decisions enable row level security;
alter table public.meeting_action_items enable row level security;
alter table public.alerts enable row level security;
alter table public.project_progress_snapshots enable row level security;

create policy "Public prototype can read team leads" on public.team_leads for select to anon, authenticated using (true);
create policy "Public prototype can insert team leads" on public.team_leads for insert to anon, authenticated with check (true);
create policy "Public prototype can update team leads" on public.team_leads for update to anon, authenticated using (true);
create policy "Public prototype can delete team leads" on public.team_leads for delete to anon, authenticated using (true);

create policy "Public prototype can read recruitment processes" on public.recruitment_processes for select to anon, authenticated using (true);
create policy "Public prototype can insert recruitment processes" on public.recruitment_processes for insert to anon, authenticated with check (true);
create policy "Public prototype can update recruitment processes" on public.recruitment_processes for update to anon, authenticated using (true);
create policy "Public prototype can delete recruitment processes" on public.recruitment_processes for delete to anon, authenticated using (true);

create policy "Public prototype can read recruitment process steps" on public.recruitment_process_steps for select to anon, authenticated using (true);
create policy "Public prototype can insert recruitment process steps" on public.recruitment_process_steps for insert to anon, authenticated with check (true);
create policy "Public prototype can update recruitment process steps" on public.recruitment_process_steps for update to anon, authenticated using (true);
create policy "Public prototype can delete recruitment process steps" on public.recruitment_process_steps for delete to anon, authenticated using (true);

create policy "Public prototype can read recruitment stage templates" on public.recruitment_stage_templates for select to anon, authenticated using (true);
create policy "Public prototype can insert recruitment stage templates" on public.recruitment_stage_templates for insert to anon, authenticated with check (true);
create policy "Public prototype can update recruitment stage templates" on public.recruitment_stage_templates for update to anon, authenticated using (true);
create policy "Public prototype can delete recruitment stage templates" on public.recruitment_stage_templates for delete to anon, authenticated using (true);

create policy "Public prototype can read recruitment positions" on public.recruitment_positions for select to anon, authenticated using (true);
create policy "Public prototype can insert recruitment positions" on public.recruitment_positions for insert to anon, authenticated with check (true);
create policy "Public prototype can update recruitment positions" on public.recruitment_positions for update to anon, authenticated using (true);
create policy "Public prototype can delete recruitment positions" on public.recruitment_positions for delete to anon, authenticated using (true);

create policy "Public prototype can read clients" on public.clients for select to anon, authenticated using (true);
create policy "Public prototype can insert clients" on public.clients for insert to anon, authenticated with check (true);
create policy "Public prototype can update clients" on public.clients for update to anon, authenticated using (true);
create policy "Public prototype can delete clients" on public.clients for delete to anon, authenticated using (true);

create policy "Public prototype can read projects" on public.projects for select to anon, authenticated using (true);
create policy "Public prototype can insert projects" on public.projects for insert to anon, authenticated with check (true);
create policy "Public prototype can update projects" on public.projects for update to anon, authenticated using (true);
create policy "Public prototype can delete projects" on public.projects for delete to anon, authenticated using (true);

create policy "Public prototype can read milestones" on public.milestones for select to anon, authenticated using (true);
create policy "Public prototype can insert milestones" on public.milestones for insert to anon, authenticated with check (true);
create policy "Public prototype can update milestones" on public.milestones for update to anon, authenticated using (true);
create policy "Public prototype can delete milestones" on public.milestones for delete to anon, authenticated using (true);

create policy "Public prototype can read tasks" on public.tasks for select to anon, authenticated using (true);
create policy "Public prototype can insert tasks" on public.tasks for insert to anon, authenticated with check (true);
create policy "Public prototype can update tasks" on public.tasks for update to anon, authenticated using (true);
create policy "Public prototype can delete tasks" on public.tasks for delete to anon, authenticated using (true);

create policy "Public prototype can read project risks" on public.project_risks for select to anon, authenticated using (true);
create policy "Public prototype can insert project risks" on public.project_risks for insert to anon, authenticated with check (true);
create policy "Public prototype can update project risks" on public.project_risks for update to anon, authenticated using (true);
create policy "Public prototype can delete project risks" on public.project_risks for delete to anon, authenticated using (true);

create policy "Public prototype can read project documents" on public.project_documents for select to anon, authenticated using (true);
create policy "Public prototype can insert project documents" on public.project_documents for insert to anon, authenticated with check (true);
create policy "Public prototype can delete project documents" on public.project_documents for delete to anon, authenticated using (true);

create policy "Public prototype can read client communications" on public.client_communications for select to anon, authenticated using (true);
create policy "Public prototype can insert client communications" on public.client_communications for insert to anon, authenticated with check (true);
create policy "Public prototype can delete client communications" on public.client_communications for delete to anon, authenticated using (true);

create policy "Public prototype can read client requests" on public.client_requests for select to anon, authenticated using (true);
create policy "Public prototype can insert client requests" on public.client_requests for insert to anon, authenticated with check (true);
create policy "Public prototype can update client requests" on public.client_requests for update to anon, authenticated using (true);
create policy "Public prototype can delete client requests" on public.client_requests for delete to anon, authenticated using (true);

create policy "Public prototype can read sla events" on public.sla_events for select to anon, authenticated using (true);
create policy "Public prototype can insert sla events" on public.sla_events for insert to anon, authenticated with check (true);
create policy "Public prototype can delete sla events" on public.sla_events for delete to anon, authenticated using (true);

create policy "Public prototype can read knowledge items" on public.knowledge_items for select to anon, authenticated using (true);
create policy "Public prototype can insert knowledge items" on public.knowledge_items for insert to anon, authenticated with check (true);
create policy "Public prototype can update knowledge items" on public.knowledge_items for update to anon, authenticated using (true);
create policy "Public prototype can delete knowledge items" on public.knowledge_items for delete to anon, authenticated using (true);

create policy "Public prototype can read meetings" on public.meetings for select to anon, authenticated using (true);
create policy "Public prototype can insert meetings" on public.meetings for insert to anon, authenticated with check (true);
create policy "Public prototype can update meetings" on public.meetings for update to anon, authenticated using (true);
create policy "Public prototype can delete meetings" on public.meetings for delete to anon, authenticated using (true);

create policy "Public prototype can read meeting decisions" on public.meeting_decisions for select to anon, authenticated using (true);
create policy "Public prototype can insert meeting decisions" on public.meeting_decisions for insert to anon, authenticated with check (true);
create policy "Public prototype can delete meeting decisions" on public.meeting_decisions for delete to anon, authenticated using (true);

create policy "Public prototype can read meeting action items" on public.meeting_action_items for select to anon, authenticated using (true);
create policy "Public prototype can insert meeting action items" on public.meeting_action_items for insert to anon, authenticated with check (true);
create policy "Public prototype can update meeting action items" on public.meeting_action_items for update to anon, authenticated using (true);
create policy "Public prototype can delete meeting action items" on public.meeting_action_items for delete to anon, authenticated using (true);

create policy "Public prototype can read alerts" on public.alerts for select to anon, authenticated using (true);
create policy "Public prototype can insert alerts" on public.alerts for insert to anon, authenticated with check (true);
create policy "Public prototype can update alerts" on public.alerts for update to anon, authenticated using (true);
create policy "Public prototype can delete alerts" on public.alerts for delete to anon, authenticated using (true);

create policy "Public prototype can read progress snapshots" on public.project_progress_snapshots for select to anon, authenticated using (true);
create policy "Public prototype can insert progress snapshots" on public.project_progress_snapshots for insert to anon, authenticated with check (true);
create policy "Public prototype can delete progress snapshots" on public.project_progress_snapshots for delete to anon, authenticated using (true);
