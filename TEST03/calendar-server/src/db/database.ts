import fs from 'fs';
import path from 'path';

const dbPath = path.join(__dirname, '../../db.json');

export interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  color: string;
  all_day: boolean;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

interface DB {
  events: Event[];
  todos: Todo[];
}

function readDB(): DB {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ events: [], todos: [] }, null, 2));
  }
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  if (!data.todos) data.todos = [];
  return data;
}

function writeDB(data: DB): void {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export { readDB, writeDB };
