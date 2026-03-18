import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, Issue } from '../db/database';
import { broadcast } from '../sse';

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

router.post('/', (req: Request, res: Response) => {
  const { title, description, status, priority, project_id, assignee, labels } = req.body;
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.issues.push(issue);
  writeDB(db);
  broadcast('issues_changed');
  res.status(201).json(issue);
});

router.put('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.issues.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '이슈를 찾을 수 없습니다.' });

  const fields = ['title', 'description', 'status', 'priority', 'project_id', 'assignee', 'labels'];
  for (const f of fields) {
    if (req.body[f] !== undefined) (db.issues[idx] as any)[f] = req.body[f];
  }
  db.issues[idx].updated_at = new Date().toISOString();

  writeDB(db);
  broadcast('issues_changed');
  res.json(db.issues[idx]);
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.issues.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '이슈를 찾을 수 없습니다.' });
  db.issues.splice(idx, 1);
  writeDB(db);
  broadcast('issues_changed');
  res.json({ message: '삭제되었습니다.' });
});

export default router;
