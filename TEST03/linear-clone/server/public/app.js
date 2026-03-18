// ─── 상수 ──────────────────────────────────────────────────
const STATUS = {
  backlog:     { label: '백로그',  icon: '📋' },
  todo:        { label: '할일',    icon: '⭕' },
  in_progress: { label: '진행중',  icon: '🔵' },
  in_review:   { label: '검토중',  icon: '🟡' },
  done:        { label: '완료',    icon: '✅' },
  cancelled:   { label: '취소',    icon: '❌' },
};

const PRIORITY = {
  0: { label: '우선순위 없음', icon: '—' },
  1: { label: '긴급',          icon: '🔴' },
  2: { label: '높음',          icon: '🟠' },
  3: { label: '보통',          icon: '🟡' },
  4: { label: '낮음',          icon: '🔵' },
};

const BOARD_ORDER = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

// ─── 상태 ──────────────────────────────────────────────────
let issues = [], projects = [], members = [];
let currentView = 'all';
let currentLayout = 'list';
let currentIssueId = null;
let searchQuery = '';
let filterPriority = '';

// ─── API ───────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  return res.json();
}

async function loadAll() {
  [issues, projects, members] = await Promise.all([
    api('/issues'),
    api('/projects'),
    api('/members'),
  ]);
}

// ─── 필터링 ────────────────────────────────────────────────
function getFilteredIssues() {
  let list = [...issues];

  if (currentView === 'my') {
    list = list.filter(i => i.assignee === 'mem-1');
  } else if (['backlog','todo','in_progress','in_review','done','cancelled'].includes(currentView)) {
    list = list.filter(i => i.status === currentView);
  } else if (currentView.startsWith('proj:')) {
    const pid = currentView.replace('proj:', '');
    list = list.filter(i => i.project_id === pid);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(i =>
      i.title.toLowerCase().includes(q) || i.identifier.toLowerCase().includes(q)
    );
  }

  if (filterPriority !== '') {
    list = list.filter(i => String(i.priority) === filterPriority);
  }

  return list;
}

// ─── 렌더링 ────────────────────────────────────────────────
function render() {
  renderSidebar();
  renderMain();
  if (currentIssueId) {
    const issue = issues.find(i => i.id === currentIssueId);
    if (issue) updateDetailPanel(issue);
  }
}

function renderSidebar() {
  const listEl = document.getElementById('project-list');
  listEl.innerHTML = '';
  projects.forEach(p => {
    const el = document.createElement('div');
    el.className = 'project-item' + (currentView === 'proj:' + p.id ? ' active' : '');
    el.innerHTML = `<div class="project-dot" style="background:${p.color}"></div><span>${p.name}</span>`;
    el.addEventListener('click', () => setView('proj:' + p.id));
    listEl.appendChild(el);
  });

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === currentView);
  });
}

function renderMain() {
  const title = getViewTitle();
  document.getElementById('view-title').textContent = title;

  if (currentLayout === 'list') renderListView();
  else renderBoardView();
}

function getViewTitle() {
  if (currentView === 'all') return '모든 이슈';
  if (currentView === 'my') return '내 이슈';
  if (currentView.startsWith('proj:')) {
    const p = projects.find(p => p.id === currentView.replace('proj:', ''));
    return p ? p.name : '프로젝트';
  }
  return STATUS[currentView]?.label || currentView;
}

function renderListView() {
  const container = document.getElementById('issue-container');
  const filtered = getFilteredIssues();

  const byStatus = {};
  BOARD_ORDER.forEach(s => byStatus[s] = []);
  filtered.forEach(i => { if (byStatus[i.status]) byStatus[i.status].push(i); });

  const visibleStatuses = BOARD_ORDER.filter(s =>
    ['backlog','todo','in_progress','in_review','done','cancelled'].includes(currentView)
      ? s === currentView
      : byStatus[s].length > 0
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">이슈가 없습니다</div>
      </div>`;
    return;
  }

  container.innerHTML = '';
  visibleStatuses.forEach(s => {
    const group = document.createElement('div');
    group.className = 'status-group';

    const header = document.createElement('div');
    header.className = 'status-group-header';
    header.innerHTML = `
      <span>${STATUS[s].icon}</span>
      <span>${STATUS[s].label}</span>
      <span class="status-count">${byStatus[s].length}</span>
    `;
    group.appendChild(header);

    byStatus[s].forEach(issue => {
      group.appendChild(createIssueRow(issue));
    });

    container.appendChild(group);
  });
}

function createIssueRow(issue) {
  const row = document.createElement('div');
  row.className = 'issue-row';

  const project = projects.find(p => p.id === issue.project_id);
  const member = members.find(m => m.id === issue.assignee);
  const dateStr = formatDate(issue.created_at);

  row.innerHTML = `
    <span class="issue-priority-icon">${PRIORITY[issue.priority]?.icon || '—'}</span>
    <span class="issue-status-icon">${STATUS[issue.status]?.icon || ''}</span>
    <span class="issue-identifier">${issue.identifier}</span>
    <span class="issue-title${issue.status === 'done' ? ' done' : ''}">${escHtml(issue.title)}</span>
    <div class="issue-meta">
      ${member ? `<span class="issue-assignee-badge" title="${member.name}">${member.avatar}</span>` : ''}
      ${project ? `<span class="issue-project-badge" style="border-left: 2px solid ${project.color}">${project.name}</span>` : ''}
      <span class="issue-date">${dateStr}</span>
    </div>
  `;

  row.addEventListener('click', () => openDetail(issue));
  return row;
}

function renderBoardView() {
  const container = document.getElementById('issue-container');
  const filtered = getFilteredIssues();

  const byStatus = {};
  BOARD_ORDER.forEach(s => byStatus[s] = []);
  filtered.forEach(i => { if (byStatus[i.status]) byStatus[i.status].push(i); });

  container.innerHTML = '';
  const board = document.createElement('div');
  board.className = 'board-view';

  BOARD_ORDER.forEach(s => {
    const col = document.createElement('div');
    col.className = 'board-column';
    col.innerHTML = `
      <div class="board-column-header">
        <div class="board-column-title">
          <span>${STATUS[s].icon}</span>
          <span>${STATUS[s].label}</span>
        </div>
        <span class="status-count">${byStatus[s].length}</span>
      </div>
    `;

    const cards = document.createElement('div');
    cards.className = 'board-cards';

    byStatus[s].forEach(issue => {
      const card = document.createElement('div');
      card.className = 'board-card';
      const member = members.find(m => m.id === issue.assignee);
      card.innerHTML = `
        <div class="board-card-title">${escHtml(issue.title)}</div>
        <div class="board-card-footer">
          <span class="board-card-id">${issue.identifier}</span>
          <div class="board-card-icons">
            <span>${PRIORITY[issue.priority]?.icon || ''}</span>
            ${member ? `<span title="${member.name}">${member.avatar}</span>` : ''}
          </div>
        </div>
      `;
      card.addEventListener('click', () => openDetail(issue));
      cards.appendChild(card);
    });

    col.appendChild(cards);
    board.appendChild(col);
  });

  container.appendChild(board);
}

// ─── 상세 패널 ────────────────────────────────────────────
function openDetail(issue) {
  currentIssueId = issue.id;
  updateDetailPanel(issue);
  document.getElementById('detail-panel').classList.remove('hidden');
}

function updateDetailPanel(issue) {
  const project = projects.find(p => p.id === issue.project_id);

  document.getElementById('detail-identifier').textContent = issue.identifier;
  document.getElementById('detail-title').textContent = issue.title;
  document.getElementById('detail-desc').textContent = issue.description;

  populateSelect('detail-status', Object.entries(STATUS).map(([v, s]) => ({ value: v, label: s.icon + ' ' + s.label })), issue.status);
  populateSelect('detail-priority', Object.entries(PRIORITY).map(([v, p]) => ({ value: v, label: p.icon + ' ' + p.label })), String(issue.priority));
  populateSelect('detail-assignee', [{ value: '', label: '담당자 없음' }, ...members.map(m => ({ value: m.id, label: m.avatar + ' ' + m.name }))], issue.assignee || '');
  populateSelect('detail-project', [{ value: '', label: '프로젝트 없음' }, ...projects.map(p => ({ value: p.id, label: p.name }))], issue.project_id || '');
}

function closeDetail() {
  currentIssueId = null;
  document.getElementById('detail-panel').classList.add('hidden');
}

// ─── 이슈 저장 (상세 패널) ───────────────────────────────
async function saveDetailField(field, value) {
  if (!currentIssueId) return;
  await api('/issues/' + currentIssueId, {
    method: 'PUT',
    body: JSON.stringify({ [field]: value }),
  });
  await loadAll();
  render();
}

// ─── 이슈 생성 모달 ──────────────────────────────────────
function openIssueModal() {
  populateSelect('issue-project', [{ value: '', label: '프로젝트 없음' }, ...projects.map(p => ({ value: p.id, label: p.name }))], '');
  populateSelect('issue-assignee', [{ value: '', label: '담당자 없음' }, ...members.map(m => ({ value: m.id, label: m.avatar + ' ' + m.name }))], '');
  document.getElementById('issue-title').value = '';
  document.getElementById('issue-desc').value = '';
  document.getElementById('issue-status').value = 'todo';
  document.getElementById('issue-priority').value = '3';
  document.getElementById('issue-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('issue-title').focus(), 50);
}

function closeIssueModal() {
  document.getElementById('issue-modal').classList.add('hidden');
}

async function saveNewIssue() {
  const title = document.getElementById('issue-title').value.trim();
  if (!title) { document.getElementById('issue-title').focus(); return; }

  await api('/issues', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description: document.getElementById('issue-desc').value,
      status: document.getElementById('issue-status').value,
      priority: Number(document.getElementById('issue-priority').value),
      project_id: document.getElementById('issue-project').value || null,
      assignee: document.getElementById('issue-assignee').value || null,
    }),
  });

  closeIssueModal();
  await loadAll();
  render();
}

// ─── 뷰 전환 ─────────────────────────────────────────────
function setView(view) {
  currentView = view;
  closeDetail();
  render();
}

// ─── 유틸 ────────────────────────────────────────────────
function populateSelect(id, options, selected) {
  const el = document.getElementById(id);
  el.innerHTML = options.map(o =>
    `<option value="${o.value}"${String(o.value) === String(selected) ? ' selected' : ''}>${o.label}</option>`
  ).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 86400) return '오늘';
  if (diff < 172800) return '어제';
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// ─── 이벤트 바인딩 ────────────────────────────────────────
document.getElementById('btn-new-issue').addEventListener('click', openIssueModal);
document.getElementById('modal-cancel').addEventListener('click', closeIssueModal);
document.getElementById('modal-save').addEventListener('click', saveNewIssue);
document.getElementById('issue-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeIssueModal();
});

document.getElementById('issue-title').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveNewIssue(); }
});

document.getElementById('detail-close').addEventListener('click', closeDetail);

document.getElementById('detail-delete').addEventListener('click', async () => {
  if (!currentIssueId || !confirm('이슈를 삭제하시겠습니까?')) return;
  await api('/issues/' + currentIssueId, { method: 'DELETE' });
  closeDetail();
  await loadAll();
  render();
});

document.getElementById('detail-title').addEventListener('blur', async e => {
  const val = e.target.textContent.trim();
  if (val && currentIssueId) {
    const issue = issues.find(i => i.id === currentIssueId);
    if (issue && val !== issue.title) await saveDetailField('title', val);
  }
});

document.getElementById('detail-desc').addEventListener('blur', async e => {
  const val = e.target.textContent.trim();
  if (currentIssueId) {
    const issue = issues.find(i => i.id === currentIssueId);
    if (issue && val !== issue.description) await saveDetailField('description', val);
  }
});

['detail-status','detail-priority','detail-assignee','detail-project'].forEach(id => {
  document.getElementById(id).addEventListener('change', async e => {
    const fieldMap = {
      'detail-status': 'status',
      'detail-priority': 'priority',
      'detail-assignee': 'assignee',
      'detail-project': 'project_id',
    };
    const field = fieldMap[id];
    let value = e.target.value;
    if (field === 'priority') value = Number(value);
    if ((field === 'assignee' || field === 'project_id') && value === '') value = null;
    await saveDetailField(field, value);
  });
});

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    if (el.dataset.view) setView(el.dataset.view);
  });
});

document.querySelectorAll('.view-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentLayout = btn.dataset.layout;
    document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMain();
  });
});

document.getElementById('search-input').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderMain();
});

document.getElementById('filter-priority').addEventListener('change', e => {
  filterPriority = e.target.value;
  renderMain();
});

document.getElementById('btn-add-project').addEventListener('click', () => {
  const name = prompt('프로젝트 이름:');
  if (!name) return;
  const colors = ['#5E6AD2','#26B5CE','#F2994A','#30A46C','#E5484D','#AB4ABA'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  api('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, color, identifier: name.slice(0,3).toUpperCase() }),
  }).then(() => loadAll().then(render));
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!document.getElementById('issue-modal').classList.contains('hidden')) closeIssueModal();
    else closeDetail();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openIssueModal();
  }
});

// ─── SSE 실시간 동기화 ────────────────────────────────────
function connectSSE() {
  const es = new EventSource('/api/stream');
  es.onmessage = async (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'issues_changed' || msg.type === 'projects_changed') {
      await loadAll();
      render();
    }
  };
}

// ─── 초기 실행 ────────────────────────────────────────────
loadAll().then(render);
connectSSE();
