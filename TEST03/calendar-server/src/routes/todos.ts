import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, Todo } from '../db/database';
import { sseClients } from '../index';

const router = Router();

function broadcast(type: string, payload?: any) {
  const data = JSON.stringify({ type, payload });
  sseClients.forEach(client => client.write(`data: ${data}\n\n`));
}

// 전체 할일 조회
router.get('/', (req: Request, res: Response) => {
  const db = readDB();
  const { completed } = req.query;
  let todos = db.todos;
  if (completed !== undefined) {
    todos = todos.filter(t => t.completed === (completed === 'true'));
  }
  todos.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  res.json(todos);
});

// 단일 할일 조회
router.get('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const todo = db.todos.find(t => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
  res.json(todo);
});

// 할일 생성
router.post('/', (req: Request, res: Response) => {
  const { title, description, priority, due_date } = req.body;
  if (!title) return res.status(400).json({ error: '제목은 필수입니다.' });

  const newTodo: Todo = {
    id: uuidv4(),
    title,
    description: description || '',
    completed: false,
    priority: priority || 'medium',
    due_date: due_date || undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const db = readDB();
  db.todos.push(newTodo);
  writeDB(db);
  broadcast('todos_changed');
  res.status(201).json(newTodo);
});

// 할일 수정
router.put('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.todos.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });

  const { title, description, completed, priority, due_date } = req.body;
  db.todos[idx] = {
    ...db.todos[idx],
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(completed !== undefined && { completed }),
    ...(priority !== undefined && { priority }),
    ...(due_date !== undefined && { due_date }),
    updated_at: new Date().toISOString(),
  };

  writeDB(db);
  broadcast('todos_changed');
  res.json(db.todos[idx]);
});

// 완료 토글
router.patch('/:id/toggle', (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.todos.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });

  db.todos[idx].completed = !db.todos[idx].completed;
  db.todos[idx].updated_at = new Date().toISOString();
  writeDB(db);
  broadcast('todos_changed');
  res.json(db.todos[idx]);
});

// 할일 삭제
router.delete('/:id', (req: Request, res: Response) => {
  const db = readDB();
  const idx = db.todos.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });

  db.todos.splice(idx, 1);
  writeDB(db);
  broadcast('todos_changed');
  res.json({ message: '할일이 삭제되었습니다.' });
});

export default router;
