const API = '/api/events';
let currentDate = new Date();
let events = [];
let selectedColor = '#4A90D9';
let currentView = 'month';

// ─── API 함수 ───────────────────────────────────────────
async function fetchEvents() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const from = new Date(year, month - 1, 1).toISOString();
  const to = new Date(year, month + 2, 0).toISOString();
  const res = await fetch(`${API}?from=${from}&to=${to}`);
  events = await res.json();
}

async function createEvent(data) {
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

async function updateEvent(id, data) {
  await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

async function deleteEvent(id) {
  await fetch(`${API}/${id}`, { method: 'DELETE' });
}

// ─── 캘린더 렌더링 ──────────────────────────────────────
function renderCalendar() {
  if (currentView === 'month') {
    renderMonthView();
  } else {
    renderWeekView();
  }
  renderMiniCalendar();
  renderUpcoming();
}

// ─── 월별 뷰 ────────────────────────────────────────────
function renderMonthView() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  document.getElementById('current-month').textContent = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = `
    <div class="day-labels">
      <span>일</span><span>월</span><span>화</span>
      <span>수</span><span>목</span><span>금</span><span>토</span>
    </div>
    <div class="days" id="days-grid"></div>
  `;

  const daysGrid = document.getElementById('days-grid');

  const prevLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    daysGrid.appendChild(createDayCell(new Date(year, month - 1, prevLastDate - i), true));
  }

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(year, month, d);
    const isToday = date.toDateString() === today.toDateString();
    daysGrid.appendChild(createDayCell(date, false, isToday));
  }

  const total = firstDay + lastDate;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) {
    daysGrid.appendChild(createDayCell(new Date(year, month + 1, d), true));
  }
}

function createDayCell(date, isOther, isToday = false) {
  const cell = document.createElement('div');
  const dayOfWeek = date.getDay();
  let cls = 'day-cell';
  if (isOther) cls += ' other-month';
  if (isToday) cls += ' today';
  if (dayOfWeek === 0) cls += ' sunday';
  if (dayOfWeek === 6) cls += ' saturday';
  cell.className = cls;

  const num = document.createElement('div');
  num.className = 'day-number';
  num.textContent = date.getDate();
  cell.appendChild(num);

  const dayEvents = getEventsForDate(date);
  const container = document.createElement('div');
  container.className = 'events-container';

  const maxShow = 3;
  dayEvents.slice(0, maxShow).forEach(ev => {
    const chip = document.createElement('div');
    chip.className = 'event-chip';
    chip.style.background = ev.color || '#4A90D9';
    chip.textContent = ev.title;
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(ev);
    });
    container.appendChild(chip);
  });

  if (dayEvents.length > maxShow) {
    const more = document.createElement('div');
    more.className = 'more-events';
    more.textContent = `+${dayEvents.length - maxShow}개`;
    container.appendChild(more);
  }

  cell.appendChild(container);

  cell.addEventListener('click', () => {
    const dateStr = toLocalDatetimeString(date);
    const endDate = new Date(date);
    endDate.setHours(date.getHours() + 1);
    openNewModal(dateStr, toLocalDatetimeString(endDate));
  });

  return cell;
}

// ─── 주별 뷰 ────────────────────────────────────────────
function renderWeekView() {
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d);
  }

  const sm = weekStart.getMonth() + 1, em = weekEnd.getMonth() + 1;
  const year = weekStart.getFullYear();
  document.getElementById('current-month').textContent =
    sm === em
      ? `${year}년 ${sm}월 ${weekStart.getDate()}일 - ${weekEnd.getDate()}일`
      : `${year}년 ${sm}월 ${weekStart.getDate()}일 - ${em}월 ${weekEnd.getDate()}일`;

  const today = new Date();
  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

  // 헤더
  let headerHTML = '<div class="week-header-row"><div class="week-gutter"></div>';
  weekDays.forEach((d, i) => {
    const isToday = d.toDateString() === today.toDateString();
    const cls = i === 0 ? 'sunday' : i === 6 ? 'saturday' : '';
    headerHTML += `
      <div class="week-day-hdr ${cls}">
        <span class="week-day-label-txt">${DAY_LABELS[i]}</span>
        <span class="week-day-num-circle ${isToday ? 'today' : ''}">${d.getDate()}</span>
      </div>`;
  });
  headerHTML += '</div>';

  // 바디
  let bodyHTML = '<div class="week-body-scroll"><div class="week-body">';

  // 시간 레이블
  bodyHTML += '<div class="week-time-col">';
  for (let h = 0; h < 24; h++) {
    bodyHTML += `<div class="week-hour-slot"><span class="week-hour-label">${String(h).padStart(2, '0')}:00</span></div>`;
  }
  bodyHTML += '</div>';

  // 요일 컬럼
  weekDays.forEach((d, i) => {
    const cls = i === 0 ? 'sunday' : i === 6 ? 'saturday' : '';
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    bodyHTML += `<div class="week-day-col ${cls}" data-date="${dateStr}" data-idx="${i}">`;

    for (let h = 0; h < 24; h++) {
      bodyHTML += `<div class="week-hour-cell"></div>`;
    }

    const dayEvents = getEventsForDate(d);
    dayEvents.forEach(ev => {
      const start = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin = end.getHours() * 60 + end.getMinutes();
      const duration = Math.max(endMin - startMin, 30);
      bodyHTML += `
        <div class="week-event" data-id="${ev.id}"
          style="top:${startMin}px;height:${duration}px;background:${ev.color || '#4A90D9'}">
          <div class="week-event-title">${ev.title}</div>
          ${duration >= 45 ? `<div class="week-event-time">${formatTime(start)}</div>` : ''}
        </div>`;
    });

    bodyHTML += '</div>';
  });

  bodyHTML += '</div></div>';

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = `<div class="week-wrapper">${headerHTML}${bodyHTML}</div>`;

  // 이벤트가 있으면 가장 이른 이벤트 시간으로, 없으면 8시로 스크롤
  const scrollEl = grid.querySelector('.week-body-scroll');
  const allWeekEvents = weekDays.flatMap(d => getEventsForDate(d));
  if (allWeekEvents.length > 0) {
    const earliest = allWeekEvents.reduce((min, ev) => {
      const m = new Date(ev.start_date).getHours() * 60 + new Date(ev.start_date).getMinutes();
      return m < min ? m : min;
    }, Infinity);
    scrollEl.scrollTop = Math.max(0, earliest - 60); // 1시간 위 여백
  } else {
    scrollEl.scrollTop = 8 * 60;
  }

  // 요일 컬럼 클릭 → 새 일정
  grid.querySelectorAll('.week-day-col').forEach((col, i) => {
    col.addEventListener('click', (e) => {
      if (e.target.closest('.week-event')) return;
      const rect = col.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const totalMin = Math.max(0, Math.floor(y));
      const hours = Math.min(Math.floor(totalMin / 60), 23);
      const mins = Math.floor((totalMin % 60) / 30) * 30;
      const startDate = new Date(weekDays[i]);
      startDate.setHours(hours, mins, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1);
      openNewModal(toLocalDatetimeString(startDate), toLocalDatetimeString(endDate));
    });
  });

  // 이벤트 클릭 → 수정
  grid.querySelectorAll('.week-event').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const ev = events.find(ev => ev.id === el.dataset.id);
      if (ev) openEditModal(ev);
    });
  });
}

// ─── 공통 유틸 ──────────────────────────────────────────
function getEventsForDate(date) {
  const dateStr = date.toDateString();
  return events.filter(ev => new Date(ev.start_date).toDateString() === dateStr);
}

function toLocalDatetimeString(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

// ─── 미니 캘린더 ────────────────────────────────────────
function renderMiniCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const container = document.getElementById('mini-calendar');
  container.innerHTML = `
    <div class="mini-header">
      <button id="mini-prev">‹</button>
      <span>${year}.${String(month+1).padStart(2,'0')}</span>
      <button id="mini-next">›</button>
    </div>
    <div class="mini-grid">
      <div class="day-label">일</div><div class="day-label">월</div>
      <div class="day-label">화</div><div class="day-label">수</div>
      <div class="day-label">목</div><div class="day-label">금</div>
      <div class="day-label">토</div>
    </div>
  `;

  const grid = container.querySelector('.mini-grid');
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(year, month, d);
    const div = document.createElement('div');
    div.className = 'mini-day';
    div.textContent = d;
    if (date.toDateString() === today.toDateString()) div.classList.add('today');
    if (getEventsForDate(date).length > 0) div.classList.add('has-event');
    div.addEventListener('click', () => {
      currentDate = new Date(year, month, d);
      renderCalendar();
    });
    grid.appendChild(div);
  }

  document.getElementById('mini-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    currentDate = new Date(year, month - 1, 1);
    fetchEvents().then(renderCalendar);
  });
  document.getElementById('mini-next').addEventListener('click', (e) => {
    e.stopPropagation();
    currentDate = new Date(year, month + 1, 1);
    fetchEvents().then(renderCalendar);
  });
}

// ─── 다가오는 일정 ────────────────────────────────────────
function renderUpcoming() {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  const upcoming = events
    .filter(ev => new Date(ev.start_date) >= now && new Date(ev.start_date) <= endOfWeek)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const list = document.getElementById('upcoming-list');
  list.innerHTML = '';

  if (upcoming.length === 0) {
    list.innerHTML = '<div style="color:#666;font-size:13px;padding:8px 0">다가오는 일정이 없습니다</div>';
    return;
  }

  upcoming.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'upcoming-item';
    item.style.borderLeftColor = ev.color || '#4A90D9';

    const start = new Date(ev.start_date);
    item.innerHTML = `
      <div class="up-title">${ev.title}</div>
      <div class="up-date">${formatDate(start)}</div>
    `;
    item.addEventListener('click', () => openEditModal(ev));
    list.appendChild(item);
  });
}

function formatDate(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

// ─── 모달 ────────────────────────────────────────────────
function openNewModal(startStr = '', endStr = '') {
  document.getElementById('modal-title').textContent = '새 일정 추가';
  document.getElementById('event-id').value = '';
  document.getElementById('event-title').value = '';
  document.getElementById('event-description').value = '';
  document.getElementById('event-start').value = startStr;
  document.getElementById('event-end').value = endStr;
  document.getElementById('btn-delete').classList.add('hidden');
  setColor('#4A90D9');
  showModal();
}

function openEditModal(ev) {
  document.getElementById('modal-title').textContent = '일정 수정';
  document.getElementById('event-id').value = ev.id;
  document.getElementById('event-title').value = ev.title;
  document.getElementById('event-description').value = ev.description || '';
  document.getElementById('event-start').value = toLocalDatetimeString(new Date(ev.start_date));
  document.getElementById('event-end').value = toLocalDatetimeString(new Date(ev.end_date));
  document.getElementById('btn-delete').classList.remove('hidden');
  setColor(ev.color || '#4A90D9');
  showModal();
}

function showModal() {
  document.getElementById('modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('event-title').focus(), 100);
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function setColor(color) {
  selectedColor = color;
  document.querySelectorAll('.color-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === color);
  });
}

// ─── 이벤트 핸들러 ────────────────────────────────────────
document.getElementById('modal-close').addEventListener('click', hideModal);
document.getElementById('btn-cancel').addEventListener('click', hideModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideModal();
});

document.getElementById('btn-new-event').addEventListener('click', () => {
  const now = new Date();
  const end = new Date(now); end.setHours(now.getHours() + 1);
  openNewModal(toLocalDatetimeString(now), toLocalDatetimeString(end));
});

document.querySelectorAll('.color-option').forEach(el => {
  el.addEventListener('click', () => setColor(el.dataset.color));
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const id = document.getElementById('event-id').value;
  const title = document.getElementById('event-title').value.trim();
  const start = document.getElementById('event-start').value;
  const end = document.getElementById('event-end').value;

  if (!title) { alert('제목을 입력해주세요.'); return; }
  if (!start || !end) { alert('시작일시와 종료일시를 입력해주세요.'); return; }
  if (new Date(start) > new Date(end)) { alert('종료일시는 시작일시 이후여야 합니다.'); return; }

  const data = {
    title,
    description: document.getElementById('event-description').value,
    start_date: new Date(start).toISOString(),
    end_date: new Date(end).toISOString(),
    color: selectedColor,
  };

  if (id) {
    await updateEvent(id, data);
  } else {
    await createEvent(data);
  }

  hideModal();
  await fetchEvents();
  renderCalendar();
});

document.getElementById('btn-delete').addEventListener('click', async () => {
  if (!confirm('일정을 삭제하시겠습니까?')) return;
  const id = document.getElementById('event-id').value;
  await deleteEvent(id);
  hideModal();
  await fetchEvents();
  renderCalendar();
});

// 뷰 버튼
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentView = btn.dataset.view;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCalendar();
  });
});

document.getElementById('btn-prev').addEventListener('click', async () => {
  if (currentView === 'month') {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  } else {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 7);
  }
  await fetchEvents();
  renderCalendar();
});

document.getElementById('btn-next').addEventListener('click', async () => {
  if (currentView === 'month') {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  } else {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 7);
  }
  await fetchEvents();
  renderCalendar();
});

document.getElementById('btn-today').addEventListener('click', async () => {
  currentDate = new Date();
  await fetchEvents();
  renderCalendar();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideModal();
});

// ─── 할일 ────────────────────────────────────────────────
const TODO_API = '/api/todos';
let todos = [];
let todoFilter = 'all';

async function fetchTodos() {
  const res = await fetch(TODO_API);
  todos = await res.json();
  renderTodos();
}

async function createTodo(data) {
  const res = await fetch(TODO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function updateTodo(id, data) {
  const res = await fetch(`${TODO_API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function toggleTodo(id) {
  const res = await fetch(`${TODO_API}/${id}/toggle`, { method: 'PATCH' });
  return res.json();
}

async function deleteTodo(id) {
  await fetch(`${TODO_API}/${id}`, { method: 'DELETE' });
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  list.innerHTML = '';

  const now = new Date();
  const filtered = todos.filter(t => {
    if (todoFilter === 'active') return !t.completed;
    if (todoFilter === 'done') return t.completed;
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div style="color:#666;font-size:12px;padding:8px 0">할일이 없습니다</div>';
    return;
  }

  filtered.forEach(todo => {
    const item = document.createElement('div');
    item.className = `todo-item priority-${todo.priority}${todo.completed ? ' completed' : ''}`;

    const isOverdue = !todo.completed && todo.due_date && new Date(todo.due_date) < now;
    const dueText = todo.due_date
      ? `${new Date(todo.due_date).getMonth()+1}/${new Date(todo.due_date).getDate()} 마감`
      : '';

    item.innerHTML = `
      <div class="todo-check">${todo.completed ? '✓' : ''}</div>
      <div class="todo-content">
        <div class="todo-title">${todo.title}</div>
        ${dueText ? `<div class="todo-due${isOverdue ? ' overdue' : ''}">${dueText}</div>` : ''}
      </div>
    `;

    item.querySelector('.todo-check').addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleTodo(todo.id);
      await fetchTodos();
    });

    item.addEventListener('click', () => openTodoEditModal(todo));
    list.appendChild(item);
  });
}

function openTodoNewModal() {
  document.getElementById('todo-modal-title').textContent = '할일 추가';
  document.getElementById('todo-id').value = '';
  document.getElementById('todo-title').value = '';
  document.getElementById('todo-description').value = '';
  document.getElementById('todo-priority').value = 'medium';
  document.getElementById('todo-due-date').value = '';
  document.getElementById('todo-btn-delete').classList.add('hidden');
  document.getElementById('todo-modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('todo-title').focus(), 100);
}

function openTodoEditModal(todo) {
  document.getElementById('todo-modal-title').textContent = '할일 수정';
  document.getElementById('todo-id').value = todo.id;
  document.getElementById('todo-title').value = todo.title;
  document.getElementById('todo-description').value = todo.description || '';
  document.getElementById('todo-priority').value = todo.priority || 'medium';
  document.getElementById('todo-due-date').value = todo.due_date ? todo.due_date.slice(0, 10) : '';
  document.getElementById('todo-btn-delete').classList.remove('hidden');
  document.getElementById('todo-modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('todo-title').focus(), 100);
}

function hideTodoModal() {
  document.getElementById('todo-modal-overlay').classList.add('hidden');
}

document.getElementById('btn-new-todo').addEventListener('click', openTodoNewModal);
document.getElementById('todo-modal-close').addEventListener('click', hideTodoModal);
document.getElementById('todo-btn-cancel').addEventListener('click', hideTodoModal);
document.getElementById('todo-modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideTodoModal();
});

document.getElementById('todo-btn-save').addEventListener('click', async () => {
  const id = document.getElementById('todo-id').value;
  const title = document.getElementById('todo-title').value.trim();
  if (!title) { alert('제목을 입력해주세요.'); return; }

  const data = {
    title,
    description: document.getElementById('todo-description').value,
    priority: document.getElementById('todo-priority').value,
    due_date: document.getElementById('todo-due-date').value || undefined,
  };

  if (id) {
    await updateTodo(id, data);
  } else {
    await createTodo(data);
  }

  hideTodoModal();
  await fetchTodos();
});

document.getElementById('todo-btn-delete').addEventListener('click', async () => {
  if (!confirm('할일을 삭제하시겠습니까?')) return;
  await deleteTodo(document.getElementById('todo-id').value);
  hideTodoModal();
  await fetchTodos();
});

document.querySelectorAll('.todo-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    todoFilter = btn.dataset.filter;
    document.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTodos();
  });
});

// ─── 실시간 동기화 (SSE) ──────────────────────────────────
function connectSSE() {
  const statusEl = document.getElementById('sync-status');
  const es = new EventSource('/api/stream');

  es.onopen = () => {
    statusEl.textContent = '● 실시간 연결됨';
    statusEl.className = 'sync-status connected';
  };

  es.onmessage = async (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'events_changed') {
      await fetchEvents();
      renderCalendar();
    } else if (msg.type === 'todos_changed') {
      await fetchTodos();
    }
  };

  es.onerror = () => {
    statusEl.textContent = '● 연결 끊김 (재연결 중...)';
    statusEl.className = 'sync-status disconnected';
  };
}

// ─── 팀 접속 주소 표시 ────────────────────────────────────
async function loadServerInfo() {
  try {
    const res = await fetch('/api/server-info');
    const { ips, port } = await res.json();
    if (ips.length > 0) {
      const infoEl = document.getElementById('share-info');
      const urlEl = document.getElementById('share-url');
      urlEl.textContent = `http://${ips[0]}:${port}`;
      infoEl.style.display = 'block';
    }
  } catch {}
}

// ─── 초기 실행 ───────────────────────────────────────────
fetchEvents().then(renderCalendar);
fetchTodos();
connectSSE();
loadServerInfo();
