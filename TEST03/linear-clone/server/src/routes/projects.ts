import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB } from '../db/database';
import { broadcast } from '../sse';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = readDB();
  res.json(db.projects);
});

router.post('/', (req: Request, res: Response) => {
  const { name, color, identifier } = req.body;
  if (!name) return res.status(400).json({ error: '이름은 필수입니다.' });
  const db = readDB();
  const project = {
    id: uuidv4(),
    name,
    color: color || '#5E6AD2',
    identifier: identifier || name.slice(0, 3).toUpperCase(),
    created_at: new Date().toISOString(),
  };
  db.projects.push(project);
  writeDB(db);
  broadcast('projects_changed');
  res.status(201).json(project);
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
  db.projects.splice(idx, 1);
  writeDB(db);
  broadcast('projects_changed');
  res.json({ message: '삭제되었습니다.' });
});

export default router;
