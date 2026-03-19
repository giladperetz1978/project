const state = {
  sb: null,
  charts: {
    progress: null,
    workload: null,
    budget: null,
  },
  cache: {
    clients: [],
    teamLeads: [],
    projects: [],
    records: {
      projects: [],
      clients: [],
      teamLeads: [],
      recruitmentProcesses: [],
      recruitmentProcessSteps: [],
      recruitmentStages: [],
      positions: [],
      recruitmentProcessPositions: [],
      knowledgeItems: [],
      meetings: [],
    },
  },
  features: {
    recruitmentWorkflow: false,
    recruitmentMasterTables: false,
  },
};

const recruitmentStatusOrder = ['new', 'sourcing', 'screening', 'interview', 'technical', 'final_interview', 'offer', 'hired', 'on_hold', 'rejected'];
const recruitmentStatusLabel = {
  new: 'חדש',
  sourcing: 'איתור מועמדים',
  screening: 'סינון',
  interview: 'ראיון',
  technical: 'מבדק טכני',
  final_interview: 'ראיון סופי',
  offer: 'הצעה',
  hired: 'התקבל',
  on_hold: 'מוקפא',
  rejected: 'נדחה',
};

const recruitmentStepStatusLabel = {
  pending: 'ממתין',
  in_progress: 'בביצוע',
  done: 'הושלם',
  blocked: 'חסום',
};

const DASHBOARD_SHORTCUTS_STORAGE_KEY = 'dashboard_shortcut_views';

const $ = (selector) => document.querySelector(selector);

function showMessage(text) {
  window.alert(text);
}

function showSupabaseError(context, error) {
  const message = error?.message || 'Unknown error';
  updateSupabaseStatus('offline', `${context}: ${message}`);
  showMessage(`${context}: ${message}`);
}

function isMissingRecruitmentTableError(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  const code = String(error.code || '').toLowerCase();
  return code === 'pgrst205' || (message.includes("public.recruitment_processes") && message.includes('schema cache'));
}

function isMissingRecruitmentWorkflowSchemaError(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  const code = String(error.code || '').toLowerCase();
  return (
    code === 'pgrst205' ||
    code === 'pgrst204' ||
    message.includes('recruitment_process_steps') ||
    message.includes('next_status_check_date') ||
    message.includes('reminder_enabled')
  );
}

function isMissingRecruitmentMasterTableError(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  const code = String(error.code || '').toLowerCase();
  return (
    code === 'pgrst205' ||
    message.includes('recruitment_stage_templates') ||
    message.includes('recruitment_positions') ||
    message.includes('recruitment_process_positions') ||
    message.includes('current_stage_template_id')
  );
}

function getActiveRecruitmentStages() {
  return (state.cache.records.recruitmentStages || []).filter((item) => item.is_active);
}

function renderRecruitmentPositionOptions(selectedIds = []) {
  const host = $('#recruitment-position-options');
  if (!host) return;

  if (!state.features.recruitmentMasterTables) {
    host.innerHTML = '<div class="recruitment-warning">יש להריץ add_recruitment_pipeline_safe.sql כדי לקשר תקנים למגויס.</div>';
    return;
  }

  const selectedSet = new Set(selectedIds);
  const activePositions = (state.cache.records.positions || []).filter((item) => item.is_active);
  if (!activePositions.length) {
    host.innerHTML = '<div class="recruitment-step-empty">אין תקנים פעילים. צור קודם תקן בטאב תקנים.</div>';
    return;
  }

  host.innerHTML = `<div class="recruitment-positions-title">תקנים למגויס</div>
    <div class="recruitment-positions-grid">${activePositions
      .map(
        (item) => `<label class="check-line"><input type="checkbox" name="recruitment_position_ids" value="${item.id}" ${selectedSet.has(item.id) ? 'checked' : ''} /> ${item.position_name}</label>`
      )
      .join('')}</div>`;
}

function updateSupabaseStatus(stateName, note) {
  const statusEl = $('#supabase-status');
  const noteEl = $('#connection-note');
  if (!statusEl || !noteEl) return;

  statusEl.classList.remove('status-chip-online', 'status-chip-pending', 'status-chip-offline');

  if (stateName === 'online') {
    statusEl.classList.add('status-chip-online');
    statusEl.textContent = 'מחובר';
  } else if (stateName === 'offline') {
    statusEl.classList.add('status-chip-offline');
    statusEl.textContent = 'לא מחובר';
  } else {
    statusEl.classList.add('status-chip-pending');
    statusEl.textContent = 'בודק חיבור...';
  }

  noteEl.textContent = note;
}

function getConfigFromFile() {
  const cfg = window.APP_CONFIG || {};
  return {
    url: typeof cfg.supabaseUrl === 'string' ? cfg.supabaseUrl.trim() : '',
    key: typeof cfg.supabaseAnonKey === 'string' ? cfg.supabaseAnonKey.trim() : '',
  };
}

function getActiveSupabaseCredentials() {
  const config = getConfigFromFile();
  return {
    url: $('#sb-url')?.value?.trim() || localStorage.getItem('supabase_url') || config.url,
    key: $('#sb-key')?.value?.trim() || localStorage.getItem('supabase_anon_key') || config.key,
  };
}

function bootFromLocalStorage() {
  const config = getConfigFromFile();
  const savedUrl = localStorage.getItem('supabase_url') || config.url;
  const savedKey = localStorage.getItem('supabase_anon_key') || config.key;

  if (savedUrl) $('#sb-url').value = savedUrl;
  if (savedKey) $('#sb-key').value = savedKey;

    if (savedUrl && savedKey) {
      connectSupabase(savedUrl, savedKey, true);
      return;
    }

    updateSupabaseStatus('offline', 'לא נמצאו פרטי חיבור שמורים. אפשר להזין URL ו-Key ידנית.');
}

  async function connectSupabase(url, key, isAutoConnect = false) {
    const connectBtn = $('#connect-btn');
    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.textContent = 'מתחבר...';
    }

    updateSupabaseStatus('pending', isAutoConnect ? 'מתחבר אוטומטית ל-Supabase...' : 'מתחבר ל-Supabase...');
  state.sb = window.supabase.createClient(url, key);
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_anon_key', key);

    const { error } = await state.sb.from('projects').select('id', { head: true, count: 'exact' });
    if (error) {
      updateSupabaseStatus('offline', `החיבור נכשל: ${error.message}`);
      if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.textContent = 'חיבור מחדש';
      }
      return;
    }

    updateSupabaseStatus('online', 'Supabase מחובר אוטומטית. אין צורך ללחוץ על כפתור החיבור בכל טעינה.');
    await loadAll();

    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.textContent = 'חיבור מחדש';
    }
}

function fillSelect(selectEl, items, emptyLabel, valueFn, labelFn) {
  selectEl.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = emptyLabel;
  selectEl.appendChild(empty);

  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = valueFn(item);
    option.textContent = labelFn(item);
    selectEl.appendChild(option);
  });
}

function formatDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function setFormMode(formName, isEditing) {
  const titleMap = {
    project: ['#project-form-title', '#project-cancel-edit', 'פרויקט חדש', 'עריכת פרויקט'],
    client: ['#client-form-title', '#client-cancel-edit', 'לקוח חדש', 'עריכת לקוח'],
    'team-lead': ['#team-lead-form-title', '#team-lead-cancel-edit', 'ראש צוות חדש', 'עריכת ראש צוות'],
    recruitment: ['#recruitment-form-title', '#recruitment-cancel-edit', 'מגויס חדש', 'עריכת מגויס'],
    'recruitment-stage': ['#recruitment-stage-form-title', '#recruitment-stage-cancel-edit', 'שלב גיוס חדש', 'עריכת שלב גיוס'],
    position: ['#position-form-title', '#position-cancel-edit', 'תקן חדש', 'עריכת תקן'],
    kb: ['#kb-form-title', '#kb-cancel-edit', 'פריט ידע חדש', 'עריכת פריט ידע'],
    meeting: ['#meeting-form-title', '#meeting-cancel-edit', 'פגישה חדשה', 'עריכת פגישה'],
  };

  const mapping = titleMap[formName];
  if (!mapping) return;
  const [titleSelector, cancelSelector, createTitle, editTitle] = mapping;
  $(titleSelector).textContent = isEditing ? editTitle : createTitle;
  $(cancelSelector).classList.toggle('hidden', !isEditing);
}

function resetProjectForm() {
  const form = $('#project-form');
  form.reset();
  form.elements.id.value = '';
  setFormMode('project', false);
}

function resetClientForm() {
  const form = $('#client-form');
  form.reset();
  form.elements.id.value = '';
  setFormMode('client', false);
}

function resetTeamLeadForm() {
  const form = $('#team-lead-form');
  form.reset();
  form.elements.id.value = '';
  form.elements.is_available.checked = true;
  setFormMode('team-lead', false);
}

function resetRecruitmentForm() {
  const form = $('#recruitment-form');
  if (!form) return;
  form.reset();
  form.elements.id.value = '';
  form.elements.reminder_enabled.checked = true;
  if (form.elements.current_stage_template_id) {
    form.elements.current_stage_template_id.value = '';
  }
  setFormMode('recruitment', false);
  renderRecruitmentPositionOptions();
}

function resetKnowledgeForm() {
  const form = $('#kb-form');
  form.reset();
  form.elements.id.value = '';
  setFormMode('kb', false);
}

function resetRecruitmentStageForm() {
  const form = $('#recruitment-stage-form');
  if (!form) return;
  form.reset();
  form.elements.id.value = '';
  form.elements.is_active.checked = true;
  setFormMode('recruitment-stage', false);
}

function resetPositionForm() {
  const form = $('#position-form');
  if (!form) return;
  form.reset();
  form.elements.id.value = '';
  form.elements.is_active.checked = true;
  setFormMode('position', false);
}

function resetMeetingForm() {
  const form = $('#meeting-form');
  form.reset();
  form.elements.id.value = '';
  setFormMode('meeting', false);
}

function renderActionButtons(entity, id) {
  return `<div class="actions">
    <button class="btn-inline" type="button" onclick="window.appActions.edit('${entity}', '${id}')">עריכה</button>
    <button class="btn-inline btn-inline-danger" type="button" onclick="window.appActions.delete('${entity}', '${id}')">מחיקה</button>
  </div>`;
}

async function loadAll() {
  if (!state.sb) return;

  await loadLookups();
  await Promise.all([loadRecruitmentStages(), loadPositions()]);
  await Promise.all([
    loadDashboard(),
    loadProjectsTable(),
    loadClients(),
    loadTeamWorkload(),
    loadRecruitmentBoard(),
    loadAnalytics(),
    loadKnowledge(),
    loadMeetings(),
  ]);
}

async function loadLookups() {
  const [clientsRes, teamRes, projectsRes] = await Promise.all([
    state.sb.from('clients').select('id,company_name').order('company_name'),
    state.sb.from('team_leads').select('id,full_name').order('full_name'),
    state.sb.from('projects').select('id,name').order('name'),
  ]);

  if (clientsRes.error || teamRes.error || projectsRes.error) {
    showSupabaseError('שגיאה בטעינת נתוני עזר', clientsRes.error || teamRes.error || projectsRes.error);
    return;
  }

  state.cache.clients = clientsRes.data || [];
  state.cache.teamLeads = teamRes.data || [];
  state.cache.projects = projectsRes.data || [];

  fillSelect($('#project-client'), state.cache.clients, 'בחר לקוח', (item) => item.id, (item) => item.company_name);
  fillSelect($('#project-team-lead'), state.cache.teamLeads, 'בחר ראש צוות', (item) => item.id, (item) => item.full_name);
  fillSelect($('#recruitment-team-lead'), state.cache.teamLeads, 'בחר ראש צוות', (item) => item.id, (item) => item.full_name);
  fillSelect($('#meeting-client'), state.cache.clients, 'בחר לקוח', (item) => item.id, (item) => item.company_name);
  fillSelect($('#meeting-project'), state.cache.projects, 'בחר פרויקט', (item) => item.id, (item) => item.name);
}

async function loadDashboard() {
  const [kpiRes, riskProjectsRes, alertsRes] = await Promise.all([
    state.sb.from('v_dashboard_kpis').select('*').limit(1).maybeSingle(),
    state.sb
      .from('projects')
      .select('id,name,health_status,target_date')
      .or('health_status.eq.red,target_date.lt.' + new Date().toISOString().slice(0, 10))
      .order('target_date', { ascending: true }),
    state.sb.from('alerts').select('message,severity,generated_at').order('generated_at', { ascending: false }).limit(8),
  ]);

  if (kpiRes.error || riskProjectsRes.error || alertsRes.error) {
    showSupabaseError('שגיאה בטעינת הדשבורד', kpiRes.error || riskProjectsRes.error || alertsRes.error);
    return;
  }

  const kpi = kpiRes.data || {};
  const kpis = [
    { label: 'משימות שהושלמו (7 ימים)', value: kpi.tasks_completed_last_7_days || 0 },
    { label: 'פרויקטים בסיכון', value: kpi.projects_at_risk || 0 },
    { label: 'התראות פתוחות', value: kpi.unread_alerts || 0 },
    { label: 'ממוצע תגובה (דקות)', value: kpi.avg_response_minutes || 0 },
    { label: 'ממוצע פתרון (דקות)', value: kpi.avg_resolution_minutes || 0 },
  ];

  $('#kpi-grid').innerHTML = kpis
    .map((item) => `<div class="kpi"><div class="label">${item.label}</div><div class="value">${item.value}</div></div>`)
    .join('');

  $('#risk-projects').innerHTML =
    (riskProjectsRes.data || [])
      .map(
        (project) => `<div class="list-item">
          <strong>${project.name}</strong>
          <div>יעד: ${project.target_date || '-'}</div>
          <span class="status ${project.health_status}">${project.health_status}</span>
        </div>`
      )
      .join('') || '<p>אין פרויקטים בסיכון כרגע.</p>';

  $('#alerts-list').innerHTML =
    (alertsRes.data || [])
      .map(
        (alert) => `<div class="list-item">
          <strong>${alert.severity.toUpperCase()}</strong>
          <div>${alert.message}</div>
          <small>${new Date(alert.generated_at).toLocaleString('he-IL')}</small>
        </div>`
      )
      .join('') || '<p>אין התראות.</p>';
}

function getDashboardShortcutOptions() {
  return Array.from(document.querySelectorAll('.nav-btn'))
    .map((button) => ({
      view: button.dataset.view,
      label: button.textContent.trim(),
    }))
    .filter((item) => item.view && item.view !== 'dashboard');
}

function getStoredDashboardShortcutViews() {
  const options = getDashboardShortcutOptions();
  const availableViews = new Set(options.map((item) => item.view));
  const fallbackViews = options.map((item) => item.view);

  try {
    const parsed = JSON.parse(localStorage.getItem(DASHBOARD_SHORTCUTS_STORAGE_KEY) || 'null');
    if (!Array.isArray(parsed)) {
      return fallbackViews;
    }

    return parsed.filter((view) => availableViews.has(view));
  } catch (error) {
    return fallbackViews;
  }
}

function saveDashboardShortcutViews(views) {
  localStorage.setItem(DASHBOARD_SHORTCUTS_STORAGE_KEY, JSON.stringify(views));
}

function moveDashboardShortcutView(views, draggedView, targetView) {
  if (!draggedView || !targetView || draggedView === targetView) return views;

  const nextViews = views.filter((view) => view !== draggedView);
  const targetIndex = nextViews.indexOf(targetView);
  if (targetIndex === -1) {
    nextViews.push(draggedView);
    return nextViews;
  }

  nextViews.splice(targetIndex, 0, draggedView);
  return nextViews;
}

function renderDashboardShortcutManager() {
  const shortcutsHost = $('#dashboard-shortcuts');
  const controlsHost = $('#dashboard-shortcut-controls');
  const emptyState = $('#dashboard-shortcut-empty');
  if (!shortcutsHost || !controlsHost || !emptyState) return;

  const options = getDashboardShortcutOptions();
  const visibleViews = getStoredDashboardShortcutViews();
  const visibleSet = new Set(visibleViews);
  const visibleOptions = options.filter((item) => visibleSet.has(item.view));

  shortcutsHost.innerHTML = visibleOptions
    .map(
      (item, index) => `<article class="dashboard-shortcut" data-view="${item.view}" draggable="true">
        <div class="dashboard-shortcut-head">
          <div class="dashboard-shortcut-title">${item.label}</div>
          <span class="status-chip status-chip-online">מוצג</span>
        </div>
        <div class="dashboard-shortcut-meta">מיקום ${index + 1} בדשבורד</div>
        <div class="dashboard-shortcut-actions">
          <button type="button" class="btn btn-primary dashboard-shortcut-open" data-view="${item.view}">פתח</button>
          <span class="dashboard-shortcut-drag">גרור כדי לשנות סדר</span>
        </div>
      </article>`
    )
    .join('');
  emptyState.classList.toggle('hidden', visibleOptions.length > 0);

  controlsHost.innerHTML = options
    .map(
      (item) => `<div class="dashboard-option-row" data-view="${item.view}">
        <div class="dashboard-option-head">
          <span class="dashboard-option-name">${item.label}</span>
          <span class="status-chip ${visibleSet.has(item.view) ? 'status-chip-online' : 'status-chip-pending'}">${visibleSet.has(item.view) ? 'מוצג בדשבורד' : 'לא מוצג'}</span>
        </div>
        <div class="dashboard-option-meta">הסטטוס מתעדכן מיד כשמוסיפים, מסירים או משנים סדר.</div>
        <div class="dashboard-option-actions">
          <button type="button" class="btn ${visibleSet.has(item.view) ? 'btn-danger' : 'btn-secondary'} dashboard-option-toggle" data-view="${item.view}">${visibleSet.has(item.view) ? 'הסר' : 'הוסף'}</button>
          <button type="button" class="btn btn-primary dashboard-shortcut-open ${visibleSet.has(item.view) ? '' : 'hidden'}" data-view="${item.view}">פתח מהדשבורד</button>
        </div>
      </div>`
    )
    .join('');
}

async function loadProjectsTable() {
  const { data, error } = await state.sb
    .from('projects')
    .select('id,name,client_id,team_lead_id,start_date,target_date,status,health_status,progress_percent,budget_planned,clients(company_name),team_leads(full_name)')
    .order('created_at', { ascending: false });

  if (error) {
    showSupabaseError('שגיאה בטעינת הפרויקטים', error);
    return;
  }

  state.cache.records.projects = data || [];

  $('#projects-table').innerHTML = state.cache.records.projects
    .map(
      (project) => `<tr>
        <td>${project.name}</td>
        <td>${project.clients?.company_name || '-'}</td>
        <td>${project.team_leads?.full_name || '-'}</td>
        <td>${project.status}</td>
        <td><span class="status ${project.health_status}">${project.health_status}</span></td>
        <td>${Number(project.progress_percent || 0).toFixed(0)}%</td>
        <td>${project.target_date || '-'}</td>
        <td>${renderActionButtons('project', project.id)}</td>
      </tr>`
    )
    .join('');
}

async function loadClients() {
  const { data, error } = await state.sb
    .from('clients')
    .select('id,company_name,primary_contact_name,primary_contact_email,primary_contact_phone,satisfaction_score,is_sensitive,last_contact_at')
    .order('company_name');

  if (error) {
    showSupabaseError('שגיאה בטעינת הלקוחות', error);
    return;
  }

  state.cache.records.clients = data || [];

  $('#clients-list').innerHTML = `<h3>לקוחות</h3><div class="list">${state.cache.records.clients
    .map(
      (client) => `<div class="list-item">
        <div class="list-item-head">
          <strong>${client.company_name}</strong>
          ${renderActionButtons('client', client.id)}
        </div>
        <div>איש קשר: ${client.primary_contact_name || '-'}</div>
        <div>מייל: ${client.primary_contact_email || '-'}</div>
        <div>טלפון: ${client.primary_contact_phone || '-'}</div>
        <div>שביעות רצון: ${client.satisfaction_score || '-'}</div>
        <div>רגיש: ${client.is_sensitive ? 'כן' : 'לא'}</div>
      </div>`
    )
    .join('')}</div>`;
}

async function loadTeamWorkload() {
  const [teamLeadsRes, workloadRes, recruitmentRes] = await Promise.all([
    state.sb.from('team_leads').select('id,full_name,team_name,domain,email,is_available').order('full_name'),
    state.sb.from('v_team_lead_workload').select('*').order('full_name'),
    state.sb
      .from('recruitment_processes')
      .select('id,team_lead_id,candidate_name,role_title,status,current_stage_template_id,updated_at,recruitment_stage_templates(stage_name)')
      .order('updated_at', { ascending: false }),
  ]);

  if (teamLeadsRes.error || workloadRes.error) {
    showSupabaseError('שגיאה בטעינת עומס העבודה', teamLeadsRes.error || workloadRes.error);
    return;
  }

  const recruitmentTableMissing = isMissingRecruitmentTableError(recruitmentRes.error);
  if (recruitmentRes.error && !recruitmentTableMissing) {
    showSupabaseError('שגיאה בטעינת עומס העבודה', recruitmentRes.error);
    return;
  }

  const recruitmentRows = recruitmentTableMissing ? [] : recruitmentRes.data || [];

  const workloadById = new Map((workloadRes.data || []).map((item) => [item.team_lead_id, item]));
  const recruitmentById = new Map();
  recruitmentRows.forEach((item) => {
    if (!recruitmentById.has(item.team_lead_id)) {
      recruitmentById.set(item.team_lead_id, []);
    }
    recruitmentById.get(item.team_lead_id).push(item);
  });

  state.cache.records.teamLeads = teamLeadsRes.data || [];
  state.cache.records.recruitmentProcesses = recruitmentRows;

  $('#team-workload').innerHTML = `<h3>עומס עבודה</h3><div class="list">${state.cache.records.teamLeads
    .map((lead) => {
      const workload = workloadById.get(lead.id) || {};
      const recruitmentItems = (recruitmentById.get(lead.id) || []).sort((left, right) => {
        const statusGap = recruitmentStatusOrder.indexOf(left.status) - recruitmentStatusOrder.indexOf(right.status);
        if (statusGap !== 0) return statusGap;
        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
      });

      const recruitmentListHtml = recruitmentItems.length
        ? `<div class="recruitment-list">${recruitmentItems
            .map(
              (item) => `<div class="recruitment-item">
                <span class="recruitment-status recruitment-status-${item.status}">${item.recruitment_stage_templates?.stage_name || recruitmentStatusLabel[item.status] || item.status}</span>
                <strong>${item.candidate_name}</strong>
                <span>${item.role_title}</span>
              </div>`
            )
            .join('')}</div>`
        : '<div class="recruitment-empty">אין כרגע תהליכי גיוס.</div>';

      return `<div class="list-item">
        <div class="list-item-head">
          <strong>${lead.full_name}</strong>
          ${renderActionButtons('team-lead', lead.id)}
        </div>
        <div>צוות: ${lead.team_name || '-'}</div>
        <div>תחום: ${lead.domain || '-'}</div>
        <div>מייל: ${lead.email || '-'}</div>
        <div>זמין: ${lead.is_available ? 'כן' : 'לא'}</div>
        <div>פרויקטים פעילים: ${workload.active_projects || 0}</div>
        <div>משימות פתוחות: ${workload.open_tasks || 0}</div>
        <div>משימות סגורות: ${workload.closed_tasks || 0}</div>
        <div class="recruitment-head">תהליכי גיוס: ${recruitmentItems.length}</div>
        ${recruitmentListHtml}
      </div>`;
    })
    .join('')}</div>`;
}

async function loadRecruitmentBoard() {
  const host = $('#recruitment-board');
  if (!host) return;

  let records = [];
  let hasWorkflowSchema = true;
  let hasMasterTables = true;

  const extendedRes = await state.sb
    .from('recruitment_processes')
    .select(
      'id,team_lead_id,candidate_name,role_title,status,current_stage_template_id,next_status_check_date,reminder_enabled,notes,updated_at,team_leads(full_name,team_name),recruitment_stage_templates(id,stage_name,sort_order),recruitment_process_steps(id,step_name,step_status,next_check_date,reminder_enabled,notes,updated_at),recruitment_process_positions(position_id,recruitment_positions(id,position_name))'
    )
    .order('updated_at', { ascending: false });

  if (extendedRes.error) {
    if (isMissingRecruitmentTableError(extendedRes.error)) {
      host.innerHTML = `<p>טבלת הגיוסים עדיין לא קיימת ב-Supabase.</p>
        <p>יש להריץ את הסקריפט: supabase/add_recruitment_pipeline_safe.sql</p>`;
      return;
    }

    if (isMissingRecruitmentWorkflowSchemaError(extendedRes.error) || isMissingRecruitmentMasterTableError(extendedRes.error)) {
      hasWorkflowSchema = !isMissingRecruitmentWorkflowSchemaError(extendedRes.error);
      hasMasterTables = !isMissingRecruitmentMasterTableError(extendedRes.error);
      const baseRes = await state.sb
        .from('recruitment_processes')
        .select('id,team_lead_id,candidate_name,role_title,status,notes,updated_at,team_leads(full_name,team_name)')
        .order('updated_at', { ascending: false });

      if (baseRes.error) {
        showSupabaseError('שגיאה בטעינת פייפליין הגיוסים', baseRes.error);
        return;
      }
      records = (baseRes.data || []).map((item) => ({ ...item, recruitment_process_steps: [], recruitment_process_positions: [] }));
    } else {
      showSupabaseError('שגיאה בטעינת פייפליין הגיוסים', extendedRes.error);
      return;
    }
  } else {
    records = extendedRes.data || [];
  }

  state.features.recruitmentWorkflow = hasWorkflowSchema;
  state.features.recruitmentMasterTables = hasMasterTables;
  state.cache.records.recruitmentProcesses = records;
  state.cache.records.recruitmentProcessSteps = records.flatMap((item) =>
    (item.recruitment_process_steps || []).map((step) => ({ ...step, recruitment_process_id: item.id }))
  );
  state.cache.records.recruitmentProcessPositions = records.flatMap((item) =>
    (item.recruitment_process_positions || []).map((link) => ({ ...link, recruitment_process_id: item.id }))
  );

  renderRecruitmentPositionOptions();

  if (!records.length) {
    host.innerHTML = '<p>אין כרגע תהליכי גיוס.</p>';
    return;
  }

  const warnings = [];
  if (!hasWorkflowSchema) {
    warnings.push('<p class="recruitment-warning">לא זוהו עמודות/טבלת שלבי תהליך. יש להריץ: supabase/add_recruitment_pipeline_safe.sql</p>');
  }
  if (!hasMasterTables) {
    warnings.push('<p class="recruitment-warning">לא זוהו טבלאות שלבי גיוס/תקנים. יש להריץ: supabase/add_recruitment_pipeline_safe.sql</p>');
  }

  const activeStages = getActiveRecruitmentStages();
  const columnDefs = activeStages.length
    ? [...activeStages.map((stage) => ({ key: stage.id, label: stage.stage_name })), { key: '__unassigned', label: 'ללא שלב' }]
    : recruitmentStatusOrder.map((status) => ({ key: status, label: recruitmentStatusLabel[status] || status }));

  host.innerHTML = `${warnings.join('')}<div class="recruitment-board-grid">${columnDefs
    .map((column) => {
      const items = records.filter((item) => {
        if (activeStages.length) {
          if (!item.current_stage_template_id) return column.key === '__unassigned';
          return item.current_stage_template_id === column.key;
        }
        return item.status === column.key;
      });
      return `<article class="recruitment-column">
        <header>
          <h4>${column.label}</h4>
          <span>${items.length}</span>
        </header>
        <div class="recruitment-column-list">
          ${
            items.length
              ? items
                  .map((item) => {
                    const steps = (item.recruitment_process_steps || []).sort(
                      (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
                    );
                    const linkedPositions = (item.recruitment_process_positions || [])
                      .map((link) => link.recruitment_positions?.position_name)
                      .filter(Boolean);
                    const activeStep = steps.find((step) => step.step_status === 'in_progress');

                    return `<div class="recruitment-card">
              <div class="list-item-head">
                <strong>${item.candidate_name}</strong>
                ${renderActionButtons('recruitment', item.id)}
              </div>
              <div>${item.role_title}</div>
              <small>${item.team_leads?.full_name || 'ללא ראש צוות'}${item.team_leads?.team_name ? ` | ${item.team_leads.team_name}` : ''}</small>
              <small>שלב גיוס: ${item.recruitment_stage_templates?.stage_name || (activeStages.length ? 'ללא שלב' : recruitmentStatusLabel[item.status] || item.status)}</small>
              <small>תקנים: ${linkedPositions.length ? linkedPositions.join(', ') : 'ללא תקן משויך'}</small>
              <small>שלב נוכחי: ${activeStep?.step_name || 'לא הוגדר'}</small>
              <small>בדיקת סטטוס הבאה: ${item.next_status_check_date || '-'}</small>
              <small>התראה: ${item.reminder_enabled === false ? 'כבויה' : 'פעילה'}</small>
              ${
                hasWorkflowSchema
                  ? `<div class="recruitment-steps-list">
                      ${
                        steps.length
                          ? steps
                              .map(
                                (step) => `<div class="recruitment-step-item">
                                <form class="recruitment-step-edit-form" data-process-id="${item.id}" data-step-id="${step.id}">
                                  <input name="step_name" value="${step.step_name || ''}" placeholder="שם שלב" required />
                                  <select name="step_status">
                                    <option value="pending" ${step.step_status === 'pending' ? 'selected' : ''}>ממתין</option>
                                    <option value="in_progress" ${step.step_status === 'in_progress' ? 'selected' : ''}>בביצוע</option>
                                    <option value="done" ${step.step_status === 'done' ? 'selected' : ''}>הושלם</option>
                                    <option value="blocked" ${step.step_status === 'blocked' ? 'selected' : ''}>חסום</option>
                                  </select>
                                  <input name="next_check_date" type="date" value="${step.next_check_date || ''}" />
                                  <label class="check-line"><input name="reminder_enabled" type="checkbox" ${step.reminder_enabled === false ? '' : 'checked'} /> התראה</label>
                                  <input name="notes" value="${step.notes || ''}" placeholder="הערות שלב" />
                                  <button class="btn btn-secondary" type="submit">שמירת שלב</button>
                                </form>
                                <span class="recruitment-step-status">${recruitmentStepStatusLabel[step.step_status] || step.step_status}</span>
                                <div class="actions">
                                  <button class="btn-inline" type="button" data-action="set-current-step" data-process-id="${item.id}" data-step-id="${step.id}">סמן כנוכחי</button>
                                  <button class="btn-inline btn-inline-danger" type="button" data-action="delete-step" data-step-id="${step.id}">מחיקת שלב</button>
                                </div>
                              </div>`
                              )
                              .join('')
                          : '<div class="recruitment-step-empty">אין שלבי תהליך למגויס זה.</div>'
                      }
                    </div>
                    <form class="recruitment-step-form" data-process-id="${item.id}">
                      <input name="step_name" placeholder="שלב תהליך (למשל ראיון ראשון)" required />
                      <select name="step_status">
                        <option value="pending">ממתין</option>
                        <option value="in_progress">בביצוע</option>
                        <option value="done">הושלם</option>
                        <option value="blocked">חסום</option>
                      </select>
                      <input name="next_check_date" type="date" />
                      <label class="check-line"><input name="reminder_enabled" type="checkbox" checked /> התראה</label>
                      <input name="notes" placeholder="הערות שלב" />
                      <button class="btn btn-secondary" type="submit">הוספת שלב</button>
                    </form>`
                  : ''
              }
            </div>`;
                  })
                  .join('')
              : '<div class="recruitment-card recruitment-card-empty">אין מועמדים בסטטוס זה</div>'
          }
        </div>
      </article>`;
    })
    .join('')}</div>`;
}

async function loadRecruitmentStages() {
  const host = $('#recruitment-stage-list');
  const stageSelect = $('#recruitment-stage-template');
  if (!host && !stageSelect) return;

  const { data, error } = await state.sb
    .from('recruitment_stage_templates')
    .select('id,stage_name,description,sort_order,is_active,updated_at')
    .order('sort_order', { ascending: true })
    .order('stage_name', { ascending: true });

  if (error) {
    if (isMissingRecruitmentMasterTableError(error)) {
      state.features.recruitmentMasterTables = false;
      if (host) {
        host.innerHTML = '<h3>רשימת שלבי גיוס</h3><p>יש להריץ את add_recruitment_pipeline_safe.sql כדי ליצור את הטבלה.</p>';
      }
      return;
    }
    showSupabaseError('שגיאה בטעינת שלבי גיוס', error);
    return;
  }

  state.features.recruitmentMasterTables = true;
  state.cache.records.recruitmentStages = data || [];

  if (stageSelect) {
    fillSelect(stageSelect, getActiveRecruitmentStages(), 'בחר שלב גיוס', (item) => item.id, (item) => item.stage_name);
  }

  if (!host) return;

  host.innerHTML = `<h3>רשימת שלבי גיוס</h3><div class="list">${state.cache.records.recruitmentStages
    .map(
      (item) => `<div class="list-item">
        <div class="list-item-head">
          <strong>${item.stage_name}</strong>
          ${renderActionButtons('recruitment-stage', item.id)}
        </div>
        <div>סדר: ${item.sort_order ?? 0}</div>
        <div>פעיל: ${item.is_active ? 'כן' : 'לא'}</div>
        <div>${item.description || ''}</div>
      </div>`
    )
    .join('')}</div>`;
}

async function loadPositions() {
  const host = $('#positions-list');
  if (!host && !$('#recruitment-position-options')) return;

  const { data, error } = await state.sb
    .from('recruitment_positions')
    .select('id,position_name,position_profile,is_active,updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingRecruitmentMasterTableError(error)) {
      state.features.recruitmentMasterTables = false;
      if (host) {
        host.innerHTML = '<h3>רשימת תקנים</h3><p>יש להריץ את add_recruitment_pipeline_safe.sql כדי ליצור את הטבלה.</p>';
      }
      renderRecruitmentPositionOptions();
      return;
    }
    showSupabaseError('שגיאה בטעינת תקנים', error);
    return;
  }

  state.features.recruitmentMasterTables = true;
  state.cache.records.positions = data || [];
  renderRecruitmentPositionOptions();

  if (!host) return;

  host.innerHTML = `<h3>רשימת תקנים</h3><div class="list">${state.cache.records.positions
    .map(
      (item) => `<div class="list-item">
        <div class="list-item-head">
          <strong>${item.position_name}</strong>
          ${renderActionButtons('position', item.id)}
        </div>
        <div>פעיל: ${item.is_active ? 'כן' : 'לא'}</div>
        <div>${item.position_profile || ''}</div>
      </div>`
    )
    .join('')}</div>`;
}

async function loadKnowledge() {
  const { data, error } = await state.sb
    .from('knowledge_items')
    .select('id,item_type,title,content,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    showSupabaseError('שגיאה בטעינת מאגר הידע', error);
    return;
  }

  state.cache.records.knowledgeItems = data || [];

  $('#kb-list').innerHTML = `<h3>מאגר ידע</h3><div class="list">${state.cache.records.knowledgeItems
    .map(
      (item) => `<div class="list-item">
        <div class="list-item-head">
          <strong>${item.title}</strong>
          ${renderActionButtons('kb', item.id)}
        </div>
        <div>סוג: ${item.item_type}</div>
        <div>${item.content}</div>
      </div>`
    )
    .join('')}</div>`;
}

async function loadMeetings() {
  const { data, error } = await state.sb
    .from('meetings')
    .select('id,title,meeting_date,summary,client_id,project_id,clients(company_name),projects(name)')
    .order('meeting_date', { ascending: false });

  if (error) {
    showSupabaseError('שגיאה בטעינת הפגישות', error);
    return;
  }

  state.cache.records.meetings = data || [];

  $('#meetings-list').innerHTML = `<h3>פגישות</h3><div class="list">${state.cache.records.meetings
    .map(
      (meeting) => `<div class="list-item">
        <div class="list-item-head">
          <strong>${meeting.title}</strong>
          ${renderActionButtons('meeting', meeting.id)}
        </div>
        <div>תאריך: ${new Date(meeting.meeting_date).toLocaleString('he-IL')}</div>
        <div>לקוח: ${meeting.clients?.company_name || '-'}</div>
        <div>פרויקט: ${meeting.projects?.name || '-'}</div>
        <div>${meeting.summary || ''}</div>
      </div>`
    )
    .join('')}</div>`;
}

async function loadAnalytics() {
  const [projectsRes, workloadRes] = await Promise.all([
    state.sb.from('projects').select('name,progress_percent,budget_planned,budget_actual').order('name'),
    state.sb.from('v_team_lead_workload').select('full_name,open_tasks,closed_tasks').order('full_name'),
  ]);

  if (projectsRes.error || workloadRes.error) {
    showSupabaseError('שגיאה בטעינת אנליטיקות', projectsRes.error || workloadRes.error);
    return;
  }

  const projects = projectsRes.data || [];
  const workload = workloadRes.data || [];

  drawChart(
    'progress',
    '#progress-chart',
    'bar',
    {
      labels: projects.map((item) => item.name),
      datasets: [
        {
          label: 'התקדמות %',
          data: projects.map((item) => Number(item.progress_percent || 0)),
          backgroundColor: '#f05b24',
          borderRadius: 8,
        },
      ],
    },
    { max: 100 }
  );

  drawChart('workload', '#workload-chart', 'bar', {
    labels: workload.map((item) => item.full_name),
    datasets: [
      { label: 'פתוחות', data: workload.map((item) => item.open_tasks), backgroundColor: '#253a52', borderRadius: 8 },
      { label: 'סגורות', data: workload.map((item) => item.closed_tasks), backgroundColor: '#0f9d58', borderRadius: 8 },
    ],
  });

  drawChart('budget', '#budget-chart', 'line', {
    labels: projects.map((item) => item.name),
    datasets: [
      {
        label: 'מתוכנן',
        data: projects.map((item) => Number(item.budget_planned || 0)),
        borderColor: '#253a52',
        backgroundColor: 'rgba(37,58,82,0.1)',
        tension: 0.25,
      },
      {
        label: 'בפועל',
        data: projects.map((item) => Number(item.budget_actual || 0)),
        borderColor: '#f05b24',
        backgroundColor: 'rgba(240,91,36,0.13)',
        tension: 0.25,
      },
    ],
  });
}

function drawChart(slot, canvasSelector, type, data, yLimits) {
  const ctx = $(canvasSelector);
  if (!ctx) return;

  if (state.charts[slot]) {
    state.charts[slot].destroy();
  }

  state.charts[slot] = new window.Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: yLimits ? { beginAtZero: true, max: yLimits.max } : { beginAtZero: true },
      },
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

function getRecord(collectionName, id) {
  return state.cache.records[collectionName].find((item) => item.id === id);
}

function editProject(id) {
  const project = getRecord('projects', id);
  if (!project) return;
  const form = $('#project-form');
  form.elements.id.value = project.id;
  form.elements.name.value = project.name || '';
  form.elements.client_id.value = project.client_id || '';
  form.elements.team_lead_id.value = project.team_lead_id || '';
  form.elements.start_date.value = project.start_date || '';
  form.elements.target_date.value = project.target_date || '';
  form.elements.budget_planned.value = project.budget_planned || '';
  form.elements.status.value = project.status || 'planning';
  setFormMode('project', true);
}

function editClient(id) {
  const client = getRecord('clients', id);
  if (!client) return;
  const form = $('#client-form');
  form.elements.id.value = client.id;
  form.elements.company_name.value = client.company_name || '';
  form.elements.primary_contact_name.value = client.primary_contact_name || '';
  form.elements.primary_contact_email.value = client.primary_contact_email || '';
  form.elements.primary_contact_phone.value = client.primary_contact_phone || '';
  form.elements.satisfaction_score.value = client.satisfaction_score || '';
  form.elements.is_sensitive.checked = Boolean(client.is_sensitive);
  setFormMode('client', true);
}

function editTeamLead(id) {
  const lead = getRecord('teamLeads', id);
  if (!lead) return;
  const form = $('#team-lead-form');
  form.elements.id.value = lead.id;
  form.elements.full_name.value = lead.full_name || '';
  form.elements.team_name.value = lead.team_name || '';
  form.elements.domain.value = lead.domain || '';
  form.elements.email.value = lead.email || '';
  form.elements.is_available.checked = Boolean(lead.is_available);
  setFormMode('team-lead', true);
}

function editKnowledge(id) {
  const item = getRecord('knowledgeItems', id);
  if (!item) return;
  const form = $('#kb-form');
  form.elements.id.value = item.id;
  form.elements.item_type.value = item.item_type || 'template';
  form.elements.title.value = item.title || '';
  form.elements.content.value = item.content || '';
  setFormMode('kb', true);
}

function editMeeting(id) {
  const meeting = getRecord('meetings', id);
  if (!meeting) return;
  const form = $('#meeting-form');
  form.elements.id.value = meeting.id;
  form.elements.title.value = meeting.title || '';
  form.elements.meeting_date.value = formatDateTimeLocal(meeting.meeting_date);
  form.elements.client_id.value = meeting.client_id || '';
  form.elements.project_id.value = meeting.project_id || '';
  form.elements.summary.value = meeting.summary || '';
  setFormMode('meeting', true);
}

function editRecruitment(id) {
  const process = getRecord('recruitmentProcesses', id);
  if (!process) return;
  const form = $('#recruitment-form');
  if (!form) return;

  form.elements.id.value = process.id;
  form.elements.candidate_name.value = process.candidate_name || '';
  form.elements.role_title.value = process.role_title || '';
  form.elements.team_lead_id.value = process.team_lead_id || '';
  if (form.elements.current_stage_template_id) {
    form.elements.current_stage_template_id.value = process.current_stage_template_id || '';
  }
  form.elements.notes.value = process.notes || '';

  if (form.elements.next_status_check_date) {
    form.elements.next_status_check_date.value = process.next_status_check_date || '';
  }
  if (form.elements.reminder_enabled) {
    form.elements.reminder_enabled.checked = process.reminder_enabled !== false;
  }

  const selectedPositions = (process.recruitment_process_positions || []).map((link) => link.position_id);
  renderRecruitmentPositionOptions(selectedPositions);

  setFormMode('recruitment', true);
}

function editRecruitmentStage(id) {
  const item = getRecord('recruitmentStages', id);
  if (!item) return;
  const form = $('#recruitment-stage-form');
  if (!form) return;

  form.elements.id.value = item.id;
  form.elements.stage_name.value = item.stage_name || '';
  form.elements.sort_order.value = item.sort_order ?? 0;
  form.elements.description.value = item.description || '';
  form.elements.is_active.checked = Boolean(item.is_active);
  setFormMode('recruitment-stage', true);
}

function editPosition(id) {
  const item = getRecord('positions', id);
  if (!item) return;
  const form = $('#position-form');
  if (!form) return;

  form.elements.id.value = item.id;
  form.elements.position_name.value = item.position_name || '';
  form.elements.position_profile.value = item.position_profile || '';
  form.elements.is_active.checked = Boolean(item.is_active);
  setFormMode('position', true);
}

async function deleteById(tableName, id, contextText) {
  if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');
  if (!window.confirm(`למחוק את ${contextText}?`)) return;

  const creds = getActiveSupabaseCredentials();
  if (!creds.url || !creds.key) {
    showMessage('חסרים פרטי חיבור פעילים ל-Supabase');
    return;
  }

  try {
    const response = await fetch(`${creds.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        apikey: creds.key,
        Authorization: `Bearer ${creds.key}`,
        Prefer: 'return=representation',
      },
    });

    if (!response.ok) {
      let errorMessage = 'Delete request failed';
      try {
        const payload = await response.json();
        errorMessage = payload.message || payload.error || JSON.stringify(payload);
      } catch {
        errorMessage = await response.text();
      }
      showSupabaseError(`מחיקה נכשלה עבור ${contextText}`, { message: errorMessage });
      return;
    }
  } catch (error) {
    showSupabaseError(`מחיקה נכשלה עבור ${contextText}`, error);
    return;
  }

  await loadAll();
  showMessage(`${contextText} נמחק בהצלחה`);
}

function wireForms() {
  $('#project-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    const form = event.target;
    const payload = {
      name: form.elements.name.value,
      client_id: form.elements.client_id.value || null,
      team_lead_id: form.elements.team_lead_id.value || null,
      start_date: form.elements.start_date.value || null,
      target_date: form.elements.target_date.value || null,
      budget_planned: Number(form.elements.budget_planned.value || 0),
      status: form.elements.status.value,
    };

    const recordId = form.elements.id.value;
    const query = recordId
      ? state.sb.from('projects').update(payload).eq('id', recordId)
      : state.sb.from('projects').insert(payload);
    const { error } = await query;

    if (error) return showSupabaseError('שמירת פרויקט נכשלה', error);

    resetProjectForm();
    await loadAll();
  });

  $('#client-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    const form = event.target;
    const payload = {
      company_name: form.elements.company_name.value,
      primary_contact_name: form.elements.primary_contact_name.value || null,
      primary_contact_email: form.elements.primary_contact_email.value || null,
      primary_contact_phone: form.elements.primary_contact_phone.value || null,
      satisfaction_score: form.elements.satisfaction_score.value ? Number(form.elements.satisfaction_score.value) : null,
      is_sensitive: form.elements.is_sensitive.checked,
      last_contact_at: new Date().toISOString(),
    };

    const recordId = form.elements.id.value;
    const query = recordId
      ? state.sb.from('clients').update(payload).eq('id', recordId)
      : state.sb.from('clients').insert(payload);
    const { error } = await query;

    if (error) return showSupabaseError('שמירת לקוח נכשלה', error);

    resetClientForm();
    await loadAll();
  });

  $('#team-lead-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    const form = event.target;
    const payload = {
      full_name: form.elements.full_name.value,
      team_name: form.elements.team_name.value || null,
      domain: form.elements.domain.value || null,
      email: form.elements.email.value || null,
      is_available: form.elements.is_available.checked,
    };

    const recordId = form.elements.id.value;
    const query = recordId
      ? state.sb.from('team_leads').update(payload).eq('id', recordId)
      : state.sb.from('team_leads').insert(payload);
    const { error } = await query;

    if (error) return showSupabaseError('שמירת ראש צוות נכשלה', error);

    resetTeamLeadForm();
    await loadAll();
  });

  $('#kb-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    const form = event.target;
    const payload = {
      item_type: form.elements.item_type.value,
      title: form.elements.title.value,
      content: form.elements.content.value,
    };

    const recordId = form.elements.id.value;
    const query = recordId
      ? state.sb.from('knowledge_items').update(payload).eq('id', recordId)
      : state.sb.from('knowledge_items').insert(payload);
    const { error } = await query;

    if (error) return showSupabaseError('שמירת פריט ידע נכשלה', error);

    resetKnowledgeForm();
    await loadKnowledge();
  });

  $('#meeting-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    const form = event.target;
    const payload = {
      title: form.elements.title.value,
      meeting_date: form.elements.meeting_date.value ? new Date(form.elements.meeting_date.value).toISOString() : new Date().toISOString(),
      client_id: form.elements.client_id.value || null,
      project_id: form.elements.project_id.value || null,
      summary: form.elements.summary.value || null,
      attendees: [],
    };

    const recordId = form.elements.id.value;
    const query = recordId
      ? state.sb.from('meetings').update(payload).eq('id', recordId)
      : state.sb.from('meetings').insert(payload);
    const { error } = await query;

    if (error) return showSupabaseError('שמירת פגישה נכשלה', error);

    resetMeetingForm();
    await loadMeetings();
  });

  $('#recruitment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    const form = event.target;
    const selectedPositionIds = Array.from(form.querySelectorAll('input[name="recruitment_position_ids"]:checked')).map((input) => input.value);
    const payload = {
      candidate_name: form.elements.candidate_name.value,
      role_title: form.elements.role_title.value,
      team_lead_id: form.elements.team_lead_id.value || null,
      status: 'new',
      notes: form.elements.notes.value || null,
    };

    if (state.features.recruitmentWorkflow) {
      payload.next_status_check_date = form.elements.next_status_check_date.value || null;
      payload.reminder_enabled = form.elements.reminder_enabled.checked;
    }
    if (state.features.recruitmentMasterTables && form.elements.current_stage_template_id) {
      payload.current_stage_template_id = form.elements.current_stage_template_id.value || null;
    }

    const recordId = form.elements.id.value;
    let processId = recordId;
    let error;

    if (recordId) {
      ({ error } = await state.sb.from('recruitment_processes').update(payload).eq('id', recordId));
    } else {
      const insertRes = await state.sb.from('recruitment_processes').insert(payload).select('id').single();
      error = insertRes.error;
      processId = insertRes.data?.id;
    }

    if (error) return showSupabaseError('שמירת מגויס נכשלה', error);

    if (state.features.recruitmentMasterTables && processId) {
      const { error: clearError } = await state.sb.from('recruitment_process_positions').delete().eq('recruitment_process_id', processId);
      if (clearError) return showSupabaseError('עדכון תקני המגויס נכשל', clearError);

      if (selectedPositionIds.length) {
        const linksPayload = selectedPositionIds.map((positionId) => ({ recruitment_process_id: processId, position_id: positionId }));
        const { error: linksError } = await state.sb.from('recruitment_process_positions').insert(linksPayload);
        if (linksError) return showSupabaseError('שמירת תקני המגויס נכשלה', linksError);
      }
    }

    resetRecruitmentForm();
    await loadRecruitmentBoard();
    await loadTeamWorkload();
  });

  $('#recruitment-board').addEventListener('submit', async (event) => {
    const form = event.target;
    if (!form.matches('.recruitment-step-form') && !form.matches('.recruitment-step-edit-form')) return;

    event.preventDefault();
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    if (!state.features.recruitmentWorkflow) {
      showMessage('יש להריץ את add_recruitment_pipeline_safe.sql כדי לעבוד עם שלבי תהליך.');
      return;
    }

    if (form.matches('.recruitment-step-form')) {
      const processId = form.dataset.processId;
      const payload = {
        recruitment_process_id: processId,
        step_name: form.elements.step_name.value,
        step_status: form.elements.step_status.value,
        next_check_date: form.elements.next_check_date.value || null,
        reminder_enabled: form.elements.reminder_enabled.checked,
        notes: form.elements.notes.value || null,
      };

      const { error } = await state.sb.from('recruitment_process_steps').insert(payload);
      if (error) return showSupabaseError('הוספת שלב תהליך נכשלה', error);

      if (payload.step_status === 'in_progress') {
        const matchedStage = (state.cache.records.recruitmentStages || []).find((item) => item.stage_name === payload.step_name && item.is_active);
        await state.sb
          .from('recruitment_process_steps')
          .update({ step_status: 'pending' })
          .eq('recruitment_process_id', processId)
          .neq('step_name', payload.step_name)
          .eq('step_status', 'in_progress');

        await state.sb
          .from('recruitment_processes')
          .update({
            next_status_check_date: payload.next_check_date,
            reminder_enabled: payload.reminder_enabled,
            current_stage_template_id: matchedStage?.id || null,
          })
          .eq('id', processId);
      }

      await loadRecruitmentBoard();
      return;
    }

    const processId = form.dataset.processId;
    const stepId = form.dataset.stepId;
    const updatePayload = {
      step_name: form.elements.step_name.value,
      step_status: form.elements.step_status.value,
      next_check_date: form.elements.next_check_date.value || null,
      reminder_enabled: form.elements.reminder_enabled.checked,
      notes: form.elements.notes.value || null,
    };

    if (updatePayload.step_status === 'in_progress') {
      const { error: resetError } = await state.sb
        .from('recruitment_process_steps')
        .update({ step_status: 'pending' })
        .eq('recruitment_process_id', processId)
        .neq('id', stepId)
        .eq('step_status', 'in_progress');
      if (resetError) return showSupabaseError('עדכון שלבים נוכחיים נכשל', resetError);
    }

    const { error: stepUpdateError } = await state.sb.from('recruitment_process_steps').update(updatePayload).eq('id', stepId);
    if (stepUpdateError) return showSupabaseError('שמירת שלב תהליך נכשלה', stepUpdateError);

    if (updatePayload.step_status === 'in_progress') {
      const matchedStage = (state.cache.records.recruitmentStages || []).find((item) => item.stage_name === updatePayload.step_name && item.is_active);
      const { error: processUpdateError } = await state.sb
        .from('recruitment_processes')
        .update({
          next_status_check_date: updatePayload.next_check_date,
          reminder_enabled: updatePayload.reminder_enabled,
          current_stage_template_id: matchedStage?.id || null,
        })
        .eq('id', processId);
      if (processUpdateError) return showSupabaseError('עדכון תאריך בדיקה נכשל', processUpdateError);
    }

    await loadRecruitmentBoard();
  });

  $('#recruitment-board').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    const action = button.dataset.action;
    const stepId = button.dataset.stepId;

    if (action === 'delete-step') {
      if (!window.confirm('למחוק את שלב התהליך?')) return;
      const { error } = await state.sb.from('recruitment_process_steps').delete().eq('id', stepId);
      if (error) return showSupabaseError('מחיקת שלב תהליך נכשלה', error);
      await loadRecruitmentBoard();
      return;
    }

    if (action === 'set-current-step') {
      const processId = button.dataset.processId;
      const process = state.cache.records.recruitmentProcesses.find((item) => item.id === processId);
      const step = (process?.recruitment_process_steps || []).find((item) => item.id === stepId);
      if (!process || !step) return;
      const matchedStage = (state.cache.records.recruitmentStages || []).find((item) => item.stage_name === step.step_name && item.is_active);

      await state.sb
        .from('recruitment_process_steps')
        .update({ step_status: 'pending' })
        .eq('recruitment_process_id', processId)
        .eq('step_status', 'in_progress');

      const { error: stepError } = await state.sb.from('recruitment_process_steps').update({ step_status: 'in_progress' }).eq('id', stepId);
      if (stepError) return showSupabaseError('עדכון שלב נוכחי נכשל', stepError);

      const { error: processError } = await state.sb
        .from('recruitment_processes')
        .update({
          next_status_check_date: step.next_check_date,
          reminder_enabled: step.reminder_enabled,
          current_stage_template_id: matchedStage?.id || null,
        })
        .eq('id', processId);
      if (processError) return showSupabaseError('עדכון תאריך בדיקה נכשל', processError);

      await loadRecruitmentBoard();
    }
  });

  $('#recruitment-stage-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    const form = event.target;
    const payload = {
      stage_name: form.elements.stage_name.value,
      sort_order: Number(form.elements.sort_order.value || 0),
      description: form.elements.description.value || null,
      is_active: form.elements.is_active.checked,
    };

    const recordId = form.elements.id.value;
    const query = recordId
      ? state.sb.from('recruitment_stage_templates').update(payload).eq('id', recordId)
      : state.sb.from('recruitment_stage_templates').insert(payload);

    const { error } = await query;
    if (error) return showSupabaseError('שמירת שלב גיוס נכשלה', error);

    resetRecruitmentStageForm();
    await loadRecruitmentStages();
    await loadRecruitmentBoard();
  });

  $('#position-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.sb) return showMessage('יש להתחבר קודם ל-Supabase');

    const form = event.target;
    const payload = {
      position_name: form.elements.position_name.value,
      position_profile: form.elements.position_profile.value,
      is_active: form.elements.is_active.checked,
    };

    const recordId = form.elements.id.value;
    const query = recordId
      ? state.sb.from('recruitment_positions').update(payload).eq('id', recordId)
      : state.sb.from('recruitment_positions').insert(payload);

    const { error } = await query;
    if (error) return showSupabaseError('שמירת תקן נכשלה', error);

    resetPositionForm();
    await loadPositions();
    await loadRecruitmentBoard();
  });

  $('#project-cancel-edit').addEventListener('click', resetProjectForm);
  $('#client-cancel-edit').addEventListener('click', resetClientForm);
  $('#team-lead-cancel-edit').addEventListener('click', resetTeamLeadForm);
  $('#recruitment-cancel-edit').addEventListener('click', resetRecruitmentForm);
  $('#recruitment-stage-cancel-edit').addEventListener('click', resetRecruitmentStageForm);
  $('#position-cancel-edit').addEventListener('click', resetPositionForm);
  $('#kb-cancel-edit').addEventListener('click', resetKnowledgeForm);
  $('#meeting-cancel-edit').addEventListener('click', resetMeetingForm);
}

function registerGlobalActions() {
  window.appActions = {
    edit(entity, id) {
      if (entity === 'project') editProject(id);
      if (entity === 'client') editClient(id);
      if (entity === 'team-lead') editTeamLead(id);
      if (entity === 'recruitment') editRecruitment(id);
      if (entity === 'recruitment-stage') editRecruitmentStage(id);
      if (entity === 'position') editPosition(id);
      if (entity === 'kb') editKnowledge(id);
      if (entity === 'meeting') editMeeting(id);
    },
    async delete(entity, id) {
      if (entity === 'project') await deleteById('projects', id, 'הפרויקט');
      if (entity === 'client') await deleteById('clients', id, 'הלקוח');
      if (entity === 'team-lead') await deleteById('team_leads', id, 'ראש הצוות');
      if (entity === 'recruitment') await deleteById('recruitment_processes', id, 'תהליך הגיוס');
      if (entity === 'recruitment-stage') await deleteById('recruitment_stage_templates', id, 'שלב הגיוס');
      if (entity === 'position') await deleteById('recruitment_positions', id, 'התקן');
      if (entity === 'kb') await deleteById('knowledge_items', id, 'פריט הידע');
      if (entity === 'meeting') await deleteById('meetings', id, 'הפגישה');
    },
  };
}

function wireNavigation() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      navigateToView(button.dataset.view);
    });
  });
}

function navigateToView(viewName) {
  const targetButton = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
  const targetView = $('#view-' + viewName);
  if (!targetButton || !targetView) return;

  document.querySelectorAll('.nav-btn').forEach((item) => item.classList.remove('active'));
  targetButton.classList.add('active');

  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  targetView.classList.add('active');
}

function wireDashboardShortcuts() {
  $('#dashboard-shortcuts')?.addEventListener('click', (event) => {
    const button = event.target.closest('.dashboard-shortcut-open');
    if (!button) return;
    navigateToView(button.dataset.view);
  });

  $('#dashboard-shortcuts')?.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.dashboard-shortcut');
    if (!card) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.dataset.view);
  });

  $('#dashboard-shortcuts')?.addEventListener('dragover', (event) => {
    const card = event.target.closest('.dashboard-shortcut');
    if (!card) return;
    event.preventDefault();
    card.classList.add('drag-over');
  });

  $('#dashboard-shortcuts')?.addEventListener('dragleave', (event) => {
    const card = event.target.closest('.dashboard-shortcut');
    if (!card) return;
    card.classList.remove('drag-over');
  });

  $('#dashboard-shortcuts')?.addEventListener('drop', (event) => {
    const card = event.target.closest('.dashboard-shortcut');
    if (!card) return;
    event.preventDefault();
    card.classList.remove('drag-over');

    const draggedView = event.dataTransfer.getData('text/plain');
    const targetView = card.dataset.view;
    const visibleViews = getStoredDashboardShortcutViews();
    const nextViews = moveDashboardShortcutView(visibleViews, draggedView, targetView);
    saveDashboardShortcutViews(nextViews);
    renderDashboardShortcutManager();
  });

  $('#dashboard-shortcuts')?.addEventListener('dragend', () => {
    document.querySelectorAll('.dashboard-shortcut.drag-over').forEach((card) => card.classList.remove('drag-over'));
  });

  $('#dashboard-shortcut-controls')?.addEventListener('click', (event) => {
    const openButton = event.target.closest('.dashboard-shortcut-open');
    if (openButton) {
      navigateToView(openButton.dataset.view);
      return;
    }

    const button = event.target.closest('.dashboard-option-toggle');
    if (!button) return;

    const options = getDashboardShortcutOptions();
    const optionViews = options.map((item) => item.view);
    const selectedViews = new Set(getStoredDashboardShortcutViews());
    const targetView = button.dataset.view;

    if (selectedViews.has(targetView)) {
      selectedViews.delete(targetView);
    } else {
      selectedViews.add(targetView);
    }

    saveDashboardShortcutViews(optionViews.filter((view) => selectedViews.has(view)));
    renderDashboardShortcutManager();
  });
}

function wireConnectButton() {
  $('#connect-btn').addEventListener('click', async () => {
    const url = $('#sb-url').value.trim();
    const key = $('#sb-key').value.trim();

    if (!url || !key) {
      showMessage('יש להזין Supabase URL ו-Anon Key');
      return;
    }

    await connectSupabase(url, key);
  });
}

function init() {
  updateSupabaseStatus('pending', 'האפליקציה עלתה. בודק כעת את החיבור ל-Supabase.');
  wireNavigation();
  wireDashboardShortcuts();
  renderDashboardShortcutManager();
  wireConnectButton();
  wireForms();
  registerGlobalActions();
  bootFromLocalStorage();
}

window.addEventListener('DOMContentLoaded', init);
