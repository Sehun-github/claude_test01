import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const PORT = 3000;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // .env 또는 환경변수에서 읽음
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// 대화 내역 타입
type Message = { role: 'user' | 'assistant'; content: string };

// POST /api/chat — 메시지 전송
app.post('/api/chat', async (req: Request, res: Response) => {
  const { messages }: { messages: Message[] } = req.body;

  if (!messages || messages.length === 0) {
    res.status(400).json({ error: '메시지가 비어 있습니다.' });
    return;
  }

  // SSE 스트리밍 헤더
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: '당신은 친절하고 유능한 AI 어시스턴트입니다. 한국어로 답변해 주세요.',
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        // SSE 형식으로 토큰 전송
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Claude API 오류:', err);
    res.write(`data: ${JSON.stringify({ error: 'Claude API 호출 실패' })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
  console.log(`💬 브라우저에서 http://localhost:${PORT} 을 열어주세요.`);
});
