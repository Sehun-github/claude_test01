import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, Issue } from '../db/database';
import { broadcast } from '../sse';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../calendarSync';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const db = readDB();
  const { status, project_id, priority } = req.query;
  let issues = db.issues;
  if (status) issues = issues.filter(i => i.status === status);
  if (project_id) issues = issues.filter(i => i.project_id === project_id);
  if (priority !== undefined) issues = issues.filter(i => i.priority === Number(priority));
  issues.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(issues);
});

router.get('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const issue = db.issues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: '이슈를 찾을 수 없습니다.' });
  res.json(issue);
});

router.post('/', async (req: Request, res: Response) => {
  const { title, description, status, priority, project_id, assignee, labels, due_date } = req.body;
  if (!title) return res.status(400).json({ error: '제목은 필수입니다.' });

  const db = readDB();
  db.issue_counter = (db.issue_counter || 0) + 1;

  const project = db.projects.find(p => p.id === project_id);
  const prefix = project ? project.identifier : 'LIN';

  const issue: Issue = {
    id: uuidv4(),
    identifier: `${prefix}-${db.issue_counter}`,
    title,
    description: description || '',
    status: status || 'todo',
    priority: priority ?? 0,
    project_id: project_id || null,
    assignee: assignee || null,
    labels: labels || [],
    due_date: due_date || undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 캘린더 동기화
  if (issue.due_date) {
    const calId = await createCalendarEvent(issue);
    if (calId) issue.calendar_event_id = calId;
  }

  db.issues.push(issue);
  writeDB(db);
  broadcast('issues_changed');
  res.status(201).json(issue);
});

router.put('/:id', async (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.issues.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '이슈를 찾을 수 없습니다.' });

  const fields = ['title', 'description', 'status', 'priority', 'project_id', 'assignee', 'labels', 'due_date'];
  for (const f of fields) {
    if (req.body[f] !== undefined) (db.issues[idx] as any)[f] = req.body[f];
  }
  // due_date를 명시적으로 null/빈값으로 보내면 제거
  if (req.body.due_date === '' || req.body.due_date === null) {
    db.issues[idx].due_date = undefined;
  }
  db.issues[idx].updated_at = new Date().toISOString();

  const issue = db.issues[idx];

  // 캘린더 동기화
  if (issue.calendar_event_id) {
    // 기존 이벤트 수정 또는 삭제
    await updateCalendarEvent(issue);
    if (!issue.due_date) issue.calendar_event_id = undefined;
  } else if (issue.due_date) {
    // 새로 due_date가 생긴 경우
    const calId = await createCalendarEvent(issue);
    if (calId) issue.calendar_event_id = calId;
  }

  writeDB(db);
  broadcast('issues_changed');
  res.json(db.issues[idx]);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.issues.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '이슈를 찾을 수 없습니다.' });

  const issue = db.issues[idx];

  // 연동된 캘린더 이벤트 삭제
  if (issue.calendar_event_id) {
    await deleteCalendarEvent(issue.calendar_event_id);
  }

  db.issues.splice(idx, 1);
  writeDB(db);
  broadcast('issues_changed');
  res.json({ message: '삭제되었습니다.' });
});

export default router;
