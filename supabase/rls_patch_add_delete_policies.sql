-- Run this if anon/authenticated can read and update, but delete still fails.
-- Safe patch for adding DELETE policies only.

create policy "Public prototype can delete team leads" on public.team_leads for delete to anon, authenticated using (true);
create policy "Public prototype can delete recruitment processes" on public.recruitment_processes for delete to anon, authenticated using (true);
create policy "Public prototype can delete recruitment process steps" on public.recruitment_process_steps for delete to anon, authenticated using (true);
create policy "Public prototype can delete recruitment stage templates" on public.recruitment_stage_templates for delete to anon, authenticated using (true);
create policy "Public prototype can delete recruitment positions" on public.recruitment_positions for delete to anon, authenticated using (true);
create policy "Public prototype can delete clients" on public.clients for delete to anon, authenticated using (true);
create policy "Public prototype can delete projects" on public.projects for delete to anon, authenticated using (true);
create policy "Public prototype can delete milestones" on public.milestones for delete to anon, authenticated using (true);
create policy "Public prototype can delete tasks" on public.tasks for delete to anon, authenticated using (true);
create policy "Public prototype can delete project risks" on public.project_risks for delete to anon, authenticated using (true);
create policy "Public prototype can delete project documents" on public.project_documents for delete to anon, authenticated using (true);
create policy "Public prototype can delete client communications" on public.client_communications for delete to anon, authenticated using (true);
create policy "Public prototype can delete client requests" on public.client_requests for delete to anon, authenticated using (true);
create policy "Public prototype can delete sla events" on public.sla_events for delete to anon, authenticated using (true);
create policy "Public prototype can delete knowledge items" on public.knowledge_items for delete to anon, authenticated using (true);
create policy "Public prototype can delete meetings" on public.meetings for delete to anon, authenticated using (true);
create policy "Public prototype can delete meeting decisions" on public.meeting_decisions for delete to anon, authenticated using (true);
create policy "Public prototype can delete meeting action items" on public.meeting_action_items for delete to anon, authenticated using (true);
create policy "Public prototype can delete alerts" on public.alerts for delete to anon, authenticated using (true);
create policy "Public prototype can delete progress snapshots" on public.project_progress_snapshots for delete to anon, authenticated using (true);
