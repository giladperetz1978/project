-- Run this in Supabase SQL Editor.
-- This is safe to run multiple times.
-- It resets DELETE policies for the prototype tables.

drop policy if exists "Public prototype can delete team leads" on public.team_leads;
create policy "Public prototype can delete team leads" on public.team_leads for delete to anon, authenticated using (true);

do $$
begin
	if to_regclass('public.recruitment_processes') is not null then
		execute 'drop policy if exists "Public prototype can delete recruitment processes" on public.recruitment_processes';
		execute 'create policy "Public prototype can delete recruitment processes" on public.recruitment_processes for delete to anon, authenticated using (true)';
	end if;
end;
$$;

drop policy if exists "Public prototype can delete clients" on public.clients;
create policy "Public prototype can delete clients" on public.clients for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete projects" on public.projects;
create policy "Public prototype can delete projects" on public.projects for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete milestones" on public.milestones;
create policy "Public prototype can delete milestones" on public.milestones for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete tasks" on public.tasks;
create policy "Public prototype can delete tasks" on public.tasks for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete project risks" on public.project_risks;
create policy "Public prototype can delete project risks" on public.project_risks for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete project documents" on public.project_documents;
create policy "Public prototype can delete project documents" on public.project_documents for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete client communications" on public.client_communications;
create policy "Public prototype can delete client communications" on public.client_communications for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete client requests" on public.client_requests;
create policy "Public prototype can delete client requests" on public.client_requests for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete sla events" on public.sla_events;
create policy "Public prototype can delete sla events" on public.sla_events for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete knowledge items" on public.knowledge_items;
create policy "Public prototype can delete knowledge items" on public.knowledge_items for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete meetings" on public.meetings;
create policy "Public prototype can delete meetings" on public.meetings for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete meeting decisions" on public.meeting_decisions;
create policy "Public prototype can delete meeting decisions" on public.meeting_decisions for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete meeting action items" on public.meeting_action_items;
create policy "Public prototype can delete meeting action items" on public.meeting_action_items for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete alerts" on public.alerts;
create policy "Public prototype can delete alerts" on public.alerts for delete to anon, authenticated using (true);

drop policy if exists "Public prototype can delete progress snapshots" on public.project_progress_snapshots;
create policy "Public prototype can delete progress snapshots" on public.project_progress_snapshots for delete to anon, authenticated using (true);
