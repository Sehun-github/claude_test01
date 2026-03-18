import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
const CALENDAR_API = 'http://localhost:3000/api/events';
const server = new Server({ name: 'calendar-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'list_events',
            description: '캘린더 일정 목록을 조회합니다. from/to 파라미터로 기간 필터링 가능.',
            inputSchema: {
                type: 'object',
                properties: {
                    from: { type: 'string', description: '시작일시 (ISO 8601, 예: 2026-03-01T00:00:00.000Z)' },
                    to: { type: 'string', description: '종료일시 (ISO 8601, 예: 2026-03-31T23:59:59.000Z)' },
                },
            },
        },
        {
            name: 'get_event',
            description: '특정 일정을 ID로 조회합니다.',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: '일정 ID' },
                },
                required: ['id'],
            },
        },
        {
            name: 'create_event',
            description: '새 일정을 생성합니다.',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: '일정 제목 (필수)' },
                    description: { type: 'string', description: '일정 설명' },
                    start_date: { type: 'string', description: '시작일시 ISO 8601 (필수)' },
                    end_date: { type: 'string', description: '종료일시 ISO 8601 (필수)' },
                    color: { type: 'string', description: '색상 hex (예: #4A90D9)' },
                    all_day: { type: 'boolean', description: '종일 여부' },
                },
                required: ['title', 'start_date', 'end_date'],
            },
        },
        {
            name: 'update_event',
            description: '기존 일정을 수정합니다.',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: '일정 ID (필수)' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    start_date: { type: 'string' },
                    end_date: { type: 'string' },
                    color: { type: 'string' },
                    all_day: { type: 'boolean' },
                },
                required: ['id'],
            },
        },
        {
            name: 'delete_event',
            description: '일정을 삭제합니다.',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: '일정 ID' },
                },
                required: ['id'],
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'list_events': {
                const params = new URLSearchParams();
                if (args?.from)
                    params.set('from', args.from);
                if (args?.to)
                    params.set('to', args.to);
                const url = `${CALENDAR_API}${params.toString() ? '?' + params.toString() : ''}`;
                const res = await fetch(url);
                const data = await res.json();
                return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
            }
            case 'get_event': {
                const res = await fetch(`${CALENDAR_API}/${args?.id}`);
                const data = await res.json();
                if (!res.ok)
                    return { content: [{ type: 'text', text: `오류: ${data.error}` }], isError: true };
                return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
            }
            case 'create_event': {
                const res = await fetch(CALENDAR_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(args),
                });
                const data = await res.json();
                if (!res.ok)
                    return { content: [{ type: 'text', text: `오류: ${data.error}` }], isError: true };
                return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
            }
            case 'update_event': {
                const { id, ...body } = args;
                const res = await fetch(`${CALENDAR_API}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (!res.ok)
                    return { content: [{ type: 'text', text: `오류: ${data.error}` }], isError: true };
                return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
            }
            case 'delete_event': {
                const res = await fetch(`${CALENDAR_API}/${args?.id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok)
                    return { content: [{ type: 'text', text: `오류: ${data.error}` }], isError: true };
                return { content: [{ type: 'text', text: data.message }] };
            }
            default:
                return { content: [{ type: 'text', text: `알 수 없는 도구: ${name}` }], isError: true };
        }
    }
    catch (err) {
        return { content: [{ type: 'text', text: `요청 실패: ${err.message}` }], isError: true };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ 캘린더 MCP 서버 시작됨 (calendar API: ' + CALENDAR_API + ')');
}
main().catch(console.error);
