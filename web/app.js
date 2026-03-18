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
      knowledgeItems: [],
      meetings: [],
    },
  },
};

const $ = (selector) => document.querySelector(selector);

function showMessage(text) {
  window.alert(text);
}

function showSupabaseError(context, error) {
  const message = error?.message || 'Unknown error';
  updateSupabaseStatus('offline', `${context}: ${message}`);
  showMessage(`${context}: ${message}`);
}

function updateSupabaseStatus(stateName, note) {
  const statusEl = $('#supabase-status');
  const noteEl = $('#connection-note');
  if (!statusEl || !noteEl) return;

  statusEl.classList.remove('status-chip-online', 'status-chip-pending', 'status-chip-offline');

  if (stateName === 'online') {
    statusEl.classList.add('status-chip-online');
    statusEl.textContent = 'Supabase: מחובר';
  } else if (stateName === 'offline') {
    statusEl.classList.add('status-chip-offline');
    statusEl.textContent = 'Supabase: לא מחובר';
  } else {
    statusEl.classList.add('status-chip-pending');
    statusEl.textContent = 'Supabase: בודק חיבור...';
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
    kb: ['#kb-form-title', '#kb-cancel-edit', 'פריט ידע חדש', 'עריכת פריט ידע'],
    meeting: ['#meeting-form-title', '#meeting-cancel-edit', 'פגישה חדשה', 'עריכת פגישה'],
  };

  const [titleSelector, cancelSelector, createTitle, editTitle] = titleMap[formName];
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

function resetKnowledgeForm() {
  const form = $('#kb-form');
  form.reset();
  form.elements.id.value = '';
  setFormMode('kb', false);
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
  await Promise.all([
    loadDashboard(),
    loadProjectsTable(),
    loadClients(),
    loadTeamWorkload(),
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
  const [teamLeadsRes, workloadRes] = await Promise.all([
    state.sb.from('team_leads').select('id,full_name,team_name,domain,email,is_available').order('full_name'),
    state.sb.from('v_team_lead_workload').select('*').order('full_name'),
  ]);

  if (teamLeadsRes.error || workloadRes.error) {
    showSupabaseError('שגיאה בטעינת עומס העבודה', teamLeadsRes.error || workloadRes.error);
    return;
  }

  const workloadById = new Map((workloadRes.data || []).map((item) => [item.team_lead_id, item]));
  state.cache.records.teamLeads = teamLeadsRes.data || [];

  $('#team-workload').innerHTML = `<h3>עומס עבודה</h3><div class="list">${state.cache.records.teamLeads
    .map((lead) => {
      const workload = workloadById.get(lead.id) || {};
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
      </div>`;
    })
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

  $('#project-cancel-edit').addEventListener('click', resetProjectForm);
  $('#client-cancel-edit').addEventListener('click', resetClientForm);
  $('#team-lead-cancel-edit').addEventListener('click', resetTeamLeadForm);
  $('#kb-cancel-edit').addEventListener('click', resetKnowledgeForm);
  $('#meeting-cancel-edit').addEventListener('click', resetMeetingForm);
}

function registerGlobalActions() {
  window.appActions = {
    edit(entity, id) {
      if (entity === 'project') editProject(id);
      if (entity === 'client') editClient(id);
      if (entity === 'team-lead') editTeamLead(id);
      if (entity === 'kb') editKnowledge(id);
      if (entity === 'meeting') editMeeting(id);
    },
    async delete(entity, id) {
      if (entity === 'project') await deleteById('projects', id, 'הפרויקט');
      if (entity === 'client') await deleteById('clients', id, 'הלקוח');
      if (entity === 'team-lead') await deleteById('team_leads', id, 'ראש הצוות');
      if (entity === 'kb') await deleteById('knowledge_items', id, 'פריט הידע');
      if (entity === 'meeting') await deleteById('meetings', id, 'הפגישה');
    },
  };
}

function wireNavigation() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');

      document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
      $('#view-' + button.dataset.view).classList.add('active');
    });
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
  wireConnectButton();
  wireForms();
  registerGlobalActions();
  bootFromLocalStorage();
}

window.addEventListener('DOMContentLoaded', init);
