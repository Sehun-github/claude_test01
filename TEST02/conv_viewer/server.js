const path = require('path');
const fs = require('fs');

// grade_server의 node_modules에서 로드
const nm = path.join(__dirname, '..', 'grade_server', 'node_modules');
const express = require(path.join(nm, 'express'));

const app = express();
const PORT = 3002;

const SESSIONS_DIR = path.join(
  process.env.USERPROFILE || 'C:\\Users\\student',
  '.claude', 'projects', 'C--Users-student-Documents-claude-test'
);

app.use(express.json());
app.use(express.static(__dirname));

// ── JSONL 파싱 ─────────────────────────────────
function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.filter(b => b.type === 'text').map(b => b.text).join('');
  return '';
}

function parseSessionFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  const messages = [];
  let slug = '', firstTs = '', cwd = '';
  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (!slug && obj.slug) slug = obj.slug;
    if (!cwd && obj.cwd) cwd = obj.cwd;
    if (obj.type === 'user' && obj.message?.role === 'user') {
      if (obj.isMeta) continue;
      const content = obj.message.content;
      if (Array.isArray(content) && content.some(b => b.type === 'tool_result')) continue;
      const text = extractText(content).trim();
      if (!text || text.startsWith('<command')) continue;
      if (!firstTs) firstTs = obj.timestamp || '';
      messages.push({ role: 'user', text, timestamp: obj.timestamp || '' });
    } else if (obj.type === 'assistant' && obj.message?.role === 'assistant') {
      const text = extractText(obj.message.content).trim();
      if (text) messages.push({ role: 'assistant', text, timestamp: obj.timestamp || '' });
    }
  }
  return { slug, firstTs, cwd, messages };
}

function validateId(id) {
  return /^[a-f0-9-]{36}$/.test(id);
}

function safeFilePath(id) {
  const p = path.resolve(SESSIONS_DIR, `${id}.jsonl`);
  if (!p.startsWith(SESSIONS_DIR)) throw new Error('Forbidden');
  return p;
}

// ── API: 세션 목록 ─────────────────────────────
app.get('/api/sessions', (req, res) => {
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
    const sessions = files.map(f => {
      const id = f.replace('.jsonl', '');
      try {
        const { slug, firstTs, cwd, messages } = parseSessionFile(path.join(SESSIONS_DIR, f));
        const firstMsg = messages.find(m => m.role === 'user');
        return {
          id,
          slug: slug || id.slice(0, 8),
          firstMessage: firstMsg?.text?.slice(0, 120) || '',
          timestamp: firstTs || '',
          cwd,
          messageCount: messages.length
        };
      } catch { return null; }
    })
    .filter(s => s && s.messageCount > 0)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: 세션 상세 ─────────────────────────────
app.get('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  if (!validateId(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const data = parseSessionFile(safeFilePath(id));
    res.json({ id, ...data });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

// ── API: 요약 (SSE) ────────────────────────────
app.post('/api/sessions/:id/summary', async (req, res) => {
  const { id } = req.params;
  if (!validateId(id)) return res.status(400).json({ error: 'Invalid ID' });
  const apiKey = req.body.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'API 키 필요' });
  try {
    const { messages } = parseSessionFile(safeFilePath(id));
    const convoText = messages.slice(0, 40)
      .map(m => `[${m.role === 'user' ? '사용자' : 'Claude'}]: ${m.text.slice(0, 600)}`)
      .join('\n\n');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const Anthropic = require(path.join(nm, '@anthropic-ai', 'sdk'));
    const stream = new Anthropic({ apiKey }).messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: `다음 대화를 4~6문장으로 한국어로 요약하세요. 주요 작업, 해결한 문제, 결과물을 포함하세요.\n\n${convoText}` }]
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta')
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── API: 내보내기 ──────────────────────────────
app.get('/api/sessions/:id/export', (req, res) => {
  const { id } = req.params;
  const fmt = req.query.format || 'md';
  if (!validateId(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const { slug, firstTs, cwd, messages } = parseSessionFile(safeFilePath(id));
    const name = (slug || id).replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const date = firstTs ? new Date(firstTs).toLocaleString('ko-KR') : '-';
    if (fmt === 'md') {
      const md = `# ${slug || id}\n\n> 날짜: ${date} | 경로: ${cwd || '-'} | 메시지: ${messages.length}개\n\n---\n\n`
        + messages.map(m => `### ${m.role === 'user' ? '👤 사용자' : '🤖 Claude'}\n\n${m.text}`).join('\n\n---\n\n');
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.md"`);
      res.send(md);
    } else {
      const txt = `[${slug || id}]  ${date}\n${'='.repeat(60)}\n\n`
        + messages.map(m => `[${m.role === 'user' ? '사용자' : 'Claude'}]\n${m.text}`).join(`\n\n${'─'.repeat(40)}\n\n`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.txt"`);
      res.send(txt);
    }
  } catch { res.status(404).json({ error: 'Not found' }); }
});

app.listen(PORT, () => {
  console.log(`\n💬 Claude 대화 세션 관리자`);
  console.log(`   http://localhost:${PORT}\n`);
  console.log(`   세션 경로: ${SESSIONS_DIR}`);
  console.log(`   Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✓ (환경변수)' : '웹에서 입력 가능'}\n`);
});
