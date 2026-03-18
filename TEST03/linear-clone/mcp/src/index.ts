import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = 'http://localhost:3001/api';

async function api(path: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const e: any = await res.json().catch(() => ({}));
    throw new Error(e.error || res.statusText);
  }
  return res.json();
}

const STATUS_LABEL: Record<string, string> = {
  backlog: '백로그', todo: '할일', in_progress: '진행중',
  in_review: '검토중', done: '완료', cancelled: '취소',
};
const PRIORITY_LABEL: Record<number, string> = {
  0: '없음', 1: '긴급', 2: '높음', 3: '보통', 4: '낮음',
};

const server = new McpServer({ name: 'linear-mcp', version: '1.0.0' });

// ── 이슈 목록 조회 ────────────────────────────────────────
server.tool('list_issues', '이슈 목록을 조회합니다.', {
  status: z.enum(['backlog','todo','in_progress','in_review','done','cancelled']).optional(),
  project_id: z.string().optional().describe('프로젝트 ID'),
}, async ({ status, project_id }) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (project_id) params.set('project_id', project_id);
  const issues: any[] = await api('/issues?' + params);

  if (issues.length === 0) return { content: [{ type: 'text', text: '이슈가 없습니다.' }] };

  const lines = issues.map(i => {
    const p = PRIORITY_LABEL[i.priority] || '';
    const s = STATUS_LABEL[i.status] || i.status;
    return `[${i.identifier}] ${i.title} | 상태: ${s} | 우선순위: ${p}`;
  });
  return { content: [{ type: 'text', text: lines.join('\n') }] };
});

// ── 이슈 단건 조회 ────────────────────────────────────────
server.tool('get_issue', '이슈 상세를 조회합니다.', {
  id: z.string().describe('이슈 ID'),
}, async ({ id }) => {
  const i: any = await api('/issues/' + id);
  const text = [
    `식별자: ${i.identifier}`,
    `제목: ${i.title}`,
    `상태: ${STATUS_LABEL[i.status] || i.status}`,
    `우선순위: ${PRIORITY_LABEL[i.priority] || i.priority}`,
    `설명: ${i.description || '없음'}`,
    `생성일: ${i.created_at.slice(0,10)}`,
  ].join('\n');
  return { content: [{ type: 'text', text }] };
});

// ── 이슈 생성 ─────────────────────────────────────────────
server.tool('create_issue', '새 이슈를 생성합니다.', {
  title: z.string().describe('이슈 제목'),
  description: z.string().optional(),
  status: z.enum(['backlog','todo','in_progress','in_review','done','cancelled']).optional(),
  priority: z.number().min(0).max(4).optional().describe('0=없음 1=긴급 2=높음 3=보통 4=낮음'),
  project_id: z.string().optional(),
  assignee: z.string().optional().describe('담당자 ID'),
}, async (body) => {
  const issue: any = await api('/issues', { method: 'POST', body: JSON.stringify(body) });
  return { content: [{ type: 'text', text: `이슈 생성 완료: [${issue.identifier}] ${issue.title}` }] };
});

// ── 이슈 수정 ─────────────────────────────────────────────
server.tool('update_issue', '이슈를 수정합니다.', {
  id: z.string().describe('이슈 ID'),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['backlog','todo','in_progress','in_review','done','cancelled']).optional(),
  priority: z.number().min(0).max(4).optional(),
  assignee: z.string().optional(),
  project_id: z.string().optional(),
}, async ({ id, ...body }) => {
  const issue: any = await api('/issues/' + id, { method: 'PUT', body: JSON.stringify(body) });
  return { content: [{ type: 'text', text: `수정 완료: [${issue.identifier}] ${issue.title}` }] };
});

// ── 이슈 삭제 ─────────────────────────────────────────────
server.tool('delete_issue', '이슈를 삭제합니다.', {
  id: z.string().describe('이슈 ID'),
}, async ({ id }) => {
  await api('/issues/' + id, { method: 'DELETE' });
  return { content: [{ type: 'text', text: '이슈가 삭제되었습니다.' }] };
});

// ── 프로젝트 목록 ─────────────────────────────────────────
server.tool('list_projects', '프로젝트 목록을 조회합니다.', {}, async () => {
  const projects: any[] = await api('/projects');
  const lines = projects.map(p => `[${p.id}] ${p.name} (${p.identifier})`);
  return { content: [{ type: 'text', text: lines.join('\n') || '프로젝트 없음' }] };
});

// ── 프로젝트 생성 ─────────────────────────────────────────
server.tool('create_project', '새 프로젝트를 생성합니다.', {
  name: z.string().describe('프로젝트 이름'),
  color: z.string().optional().describe('색상 hex (예: #5E6AD2)'),
  identifier: z.string().optional().describe('식별자 (예: FE)'),
}, async (body) => {
  const p: any = await api('/projects', { method: 'POST', body: JSON.stringify(body) });
  return { content: [{ type: 'text', text: `프로젝트 생성 완료: ${p.name} (${p.identifier})` }] };
});

// ── 멤버 목록 ─────────────────────────────────────────────
server.tool('list_members', '팀 멤버 목록을 조회합니다.', {}, async () => {
  const members: any[] = await api('/members');
  const lines = members.map(m => `[${m.id}] ${m.avatar} ${m.name}`);
  return { content: [{ type: 'text', text: lines.join('\n') }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
