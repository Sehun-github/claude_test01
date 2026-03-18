import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, Event } from '../db/database';
import { sseClients } from '../index';

const router = Router();

function broadcast(type: string, payload?: any) {
  const data = JSON.stringify({ type, payload });
  sseClients.forEach(client => client.write(`data: ${data}\n\n`));
}

// 전체 일정 조회
router.get('/', (req: Request, res: Response) => {
  const { from, to } = req.query;
  const db = readDB();
  let events = db.events;

  if (from && to) {
    events = events.filter(ev =>
      ev.start_date >= (from as string) && ev.start_date <= (to as string)
    );
  }

  events.sort((a, b) => a.start_date.localeCompare(b.start_date));
  res.json(events);
});

// 단일 일정 조회
router.get('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const event = db.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
  res.json(event);
});

// 일정 생성
router.post('/', (req: Request, res: Response) => {
  const { title, description, start_date, end_date, color, all_day } = req.body;
  if (!title || !start_date || !end_date) {
    return res.status(400).json({ error: '제목, 시작일, 종료일은 필수입니다.' });
  }

  const newEvent: Event = {
    id: uuidv4(),
    title,
    description: description || '',
    start_date,
    end_date,
    color: color || '#4A90D9',
    all_day: all_day || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const db = readDB();
  db.events.push(newEvent);
  writeDB(db);
  broadcast('events_changed');
  res.status(201).json(newEvent);
});

// 일정 수정
router.put('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });

  const { title, description, start_date, end_date, color, all_day } = req.body;
  db.events[idx] = {
    ...db.events[idx],
    title, description, start_date, end_date, color, all_day,
    updated_at: new Date().toISOString(),
  };

  writeDB(db);
  broadcast('events_changed');
  res.json(db.events[idx]);
});

// 일정 삭제
router.delete('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });

  db.events.splice(idx, 1);
  writeDB(db);
  broadcast('events_changed');
  res.json({ message: '일정이 삭제되었습니다.' });
});

export default router;
