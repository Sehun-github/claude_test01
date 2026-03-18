import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { sseClients } from './sse';
import issuesRouter from './routes/issues';
import projectsRouter from './routes/projects';
import { readDB } from './db/database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.add(res);
  res.write('data: {"type":"connected"}\n\n');
  req.on('close', () => sseClients.delete(res));
});

app.use('/api/issues', issuesRouter);
app.use('/api/projects', projectsRouter);

app.get('/api/members', (_req, res) => {
  res.json(readDB().members);
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

function getLocalIPs() {
  const ips: string[] = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const alias of iface || []) {
      if (alias.family === 'IPv4' && !alias.internal) ips.push(alias.address);
    }
  }
  return ips;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Linear Clone 실행 중`);
  console.log(`   로컬:    http://localhost:${PORT}`);
  getLocalIPs().forEach(ip => console.log(`   네트워크: http://${ip}:${PORT}`));
});
