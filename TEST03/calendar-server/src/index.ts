import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import eventsRouter from './routes/events';
import todosRouter from './routes/todos';

const app = express();
const PORT = 3000;

// SSE 클라이언트 관리
export const sseClients = new Set<express.Response>();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 실시간 동기화 SSE 엔드포인트
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  res.write('data: {"type":"connected"}\n\n');

  req.on('close', () => sseClients.delete(res));
});

// API 라우트
app.use('/api/events', eventsRouter);
app.use('/api/todos', todosRouter);

// 서버 IP 반환
app.get('/api/server-info', (req, res) => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface || []) {
      if (alias.family === 'IPv4' && !alias.internal) {
        ips.push(alias.address);
      }
    }
  }
  res.json({ ips, port: PORT });
});

// 루트 → index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface || []) {
      if (alias.family === 'IPv4' && !alias.internal) {
        ips.push(alias.address);
      }
    }
  }
  return ips;
}

app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log(`✅ 캘린더 서버 실행 중`);
  console.log(`   로컬:    http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`   네트워크: http://${ip}:${PORT}`));
});
