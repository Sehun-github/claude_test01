import { Issue } from './db/database';

const CALENDAR_API = 'http://localhost:3000/api/events';

// 우선순위 → 캘린더 색상
const PRIORITY_COLOR: Record<number, string> = {
  1: '#E74C3C', // 긴급 → 빨강
  2: '#F2994A', // 높음 → 주황
  3: '#5E6AD2', // 보통 → 파랑(Linear 기본색)
  4: '#2ECC71', // 낮음 → 초록
  0: '#9B59B6', // 없음 → 보라
};

function toCalendarEvent(issue: Issue) {
  if (!issue.due_date) return null;

  const start = new Date(`${issue.due_date}T09:00:00`);
  const end = new Date(`${issue.due_date}T10:00:00`);

  return {
    title: `[${issue.identifier}] ${issue.title}`,
    description: issue.description || '',
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    color: PRIORITY_COLOR[issue.priority] ?? '#5E6AD2',
  };
}

// 캘린더 이벤트 생성
export async function createCalendarEvent(issue: Issue): Promise<string | null> {
  const body = toCalendarEvent(issue);
  if (!body) return null;
  try {
    const res = await fetch(CALENDAR_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    const event = await res.json();
    return event.id ?? null;
  } catch {
    return null;
  }
}

// 캘린더 이벤트 수정
export async function updateCalendarEvent(issue: Issue): Promise<void> {
  if (!issue.calendar_event_id) return;
  const body = toCalendarEvent(issue);
  if (!body) {
    // due_date가 없어졌으면 삭제
    await deleteCalendarEvent(issue.calendar_event_id);
    return;
  }
  try {
    await fetch(`${CALENDAR_API}/${issue.calendar_event_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
  } catch {}
}

// 캘린더 이벤트 삭제
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    await fetch(`${CALENDAR_API}/${eventId}`, { method: 'DELETE' });
  } catch {}
}
