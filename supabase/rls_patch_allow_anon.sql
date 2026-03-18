-- Run this on an existing Supabase project if schema.sql was already applied.
-- It opens prototype access for anon + authenticated roles.

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
