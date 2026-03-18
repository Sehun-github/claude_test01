import fs from 'fs';
import path from 'path';

const dbPath = path.join(__dirname, '../../db.json');

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 0 | 1 | 2 | 3 | 4;
  project_id: string | null;
  assignee: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  identifier: string;
  created_at: string;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
}

interface DB {
  issues: Issue[];
  projects: Project[];
  members: Member[];
  issue_counter: number;
}

const DEFAULT_DB: DB = {
  issues: [],
  projects: [
    { id: 'proj-1', name: '일반', color: '#5E6AD2', identifier: 'GEN', created_at: new Date().toISOString() },
    { id: 'proj-2', name: '프론트엔드', color: '#26B5CE', identifier: 'FE', created_at: new Date().toISOString() },
    { id: 'proj-3', name: '백엔드', color: '#F2994A', identifier: 'BE', created_at: new Date().toISOString() },
  ],
  members: [
    { id: 'mem-1', name: '나', avatar: '🧑' },
    { id: 'mem-2', name: '팀원 A', avatar: '👩' },
    { id: 'mem-3', name: '팀원 B', avatar: '👨' },
  ],
  issue_counter: 0,
};

export function readDB(): DB {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(DEFAULT_DB, null, 2));
  }
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  return { ...DEFAULT_DB, ...data };
}

export function writeDB(data: DB): void {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}
