"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const BASE_URL = 'http://localhost:3000/api/todos';
async function apiFetch(path, options) {
    const res = await fetch(`${BASE_URL}${path}`, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}
const server = new mcp_js_1.McpServer({
    name: 'todo-mcp',
    version: '1.0.0',
});
// 할일 목록 조회
server.tool('list_todos', '할일 목록을 조회합니다.', {
    completed: zod_1.z.enum(['true', 'false']).optional().describe('완료 여부 필터 (true/false)'),
}, async ({ completed }) => {
    const query = completed !== undefined ? `?completed=${completed}` : '';
    const todos = await apiFetch(query);
    if (todos.length === 0) {
        return { content: [{ type: 'text', text: '할일이 없습니다.' }] };
    }
    const text = todos.map((t) => {
        const status = t.completed ? '✅' : '⬜';
        const priority = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢';
        const due = t.due_date ? ` | 마감: ${t.due_date.slice(0, 10)}` : '';
        return `${status} ${priority} [${t.id.slice(0, 8)}] ${t.title}${due}`;
    }).join('\n');
    return { content: [{ type: 'text', text }] };
});
// 할일 생성
server.tool('create_todo', '새 할일을 생성합니다.', {
    title: zod_1.z.string().describe('할일 제목 (필수)'),
    description: zod_1.z.string().optional().describe('할일 설명'),
    priority: zod_1.z.enum(['low', 'medium', 'high']).optional().describe('우선순위 (low/medium/high)'),
    due_date: zod_1.z.string().optional().describe('마감일 (YYYY-MM-DD)'),
}, async ({ title, description, priority, due_date }) => {
    const todo = await apiFetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priority, due_date }),
    });
    return {
        content: [{
                type: 'text',
                text: `할일이 생성되었습니다.\nID: ${todo.id}\n제목: ${todo.title}\n우선순위: ${todo.priority}${todo.due_date ? '\n마감일: ' + todo.due_date.slice(0, 10) : ''}`,
            }],
    };
});
// 할일 수정
server.tool('update_todo', '할일을 수정합니다.', {
    id: zod_1.z.string().describe('할일 ID'),
    title: zod_1.z.string().optional().describe('새 제목'),
    description: zod_1.z.string().optional().describe('새 설명'),
    priority: zod_1.z.enum(['low', 'medium', 'high']).optional().describe('우선순위'),
    due_date: zod_1.z.string().optional().describe('마감일 (YYYY-MM-DD)'),
    completed: zod_1.z.boolean().optional().describe('완료 여부'),
}, async ({ id, ...data }) => {
    const todo = await apiFetch(`/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return {
        content: [{ type: 'text', text: `할일이 수정되었습니다.\n제목: ${todo.title}` }],
    };
});
// 완료 토글
server.tool('toggle_todo', '할일 완료 상태를 토글합니다.', {
    id: zod_1.z.string().describe('할일 ID'),
}, async ({ id }) => {
    const todo = await apiFetch(`/${id}/toggle`, { method: 'PATCH' });
    const status = todo.completed ? '완료' : '미완료';
    return {
        content: [{ type: 'text', text: `"${todo.title}" → ${status}로 변경되었습니다.` }],
    };
});
// 할일 삭제
server.tool('delete_todo', '할일을 삭제합니다.', {
    id: zod_1.z.string().describe('할일 ID'),
}, async ({ id }) => {
    await apiFetch(`/${id}`, { method: 'DELETE' });
    return { content: [{ type: 'text', text: '할일이 삭제되었습니다.' }] };
});
// 서버 시작
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport);
