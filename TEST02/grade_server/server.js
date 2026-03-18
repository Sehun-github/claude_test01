const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..')));

// ── 허용 모델 목록 ─────────────────────────────
const MODELS = {
  // Anthropic
  'claude-opus-4-6':    { provider: 'anthropic', label: 'Claude Opus 4.6'    },
  'claude-sonnet-4-6':  { provider: 'anthropic', label: 'Claude Sonnet 4.6'  },
  'claude-haiku-4-5':   { provider: 'anthropic', label: 'Claude Haiku 4.5'   },
  // OpenAI
  'gpt-4o':             { provider: 'openai',    label: 'GPT-4o'             },
  'gpt-4o-mini':        { provider: 'openai',    label: 'GPT-4o mini'        },
  'gpt-4-turbo':        { provider: 'openai',    label: 'GPT-4 Turbo'        },
  'gpt-3.5-turbo':      { provider: 'openai',    label: 'GPT-3.5 Turbo'      },
};

// ── 서버 상태 확인 ─────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: Object.entries(MODELS).map(([id, v]) => ({ id, label: v.label, provider: v.provider }))
  });
});

// ── 채점 프롬프트 생성 ─────────────────────────
function buildPrompt(questionNumber, questionText, subs, studentAnswer, modelAnswer) {
  const subsText = subs && subs.length
    ? subs.map(s => `  ${s.label} ${s.text}`).join('\n')
    : '';

  return `당신은 소방기술사 시험 채점관입니다. 아래 답안을 전문적으로 채점해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【문제 ${questionNumber}】 (25점)
${questionText}
${subsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【수험생 답안】
${studentAnswer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【모범 답안 핵심 내용】
${modelAnswer.substring(0, 2000)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

다음 형식으로 채점 결과를 작성하세요. (합산 25점 만점)

## 📊 채점 결과

**총점: XX / 25점**

### 항목별 점수
| 항목 | 배점 | 득점 | 평가 |
|------|------|------|------|
| 핵심 개념·키워드 | 10점 | X점 | (한 줄 평) |
| 논리적 구조·체계성 | 7점 | X점 | (한 줄 평) |
| 정확성·완전성 | 5점 | X점 | (한 줄 평) |
| 단위·법령·수식 명시 | 3점 | X점 | (한 줄 평) |

### ✅ 잘 서술한 부분
(구체적인 내용 2~3가지)

### ❌ 누락·오류 내용
(핵심적으로 빠진 내용이나 잘못된 내용)

### 💡 보완 학습 포인트
(이 문제에서 꼭 알아야 할 핵심 개념, 관련 법령, 수치 기준 등)

### 📝 총평
(전체적인 답안 수준 평가 및 조언 1~2문장)`;
}

// ── Anthropic 스트리밍 채점 ────────────────────
async function gradeWithAnthropic(res, model, prompt, apiKey) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const useThinking = model !== 'claude-haiku-4-5';

  const stream = client.messages.stream({
    model,
    max_tokens: 2000,
    ...(useThinking && { thinking: { type: 'adaptive' } }),
    messages: [{ role: 'user', content: prompt }]
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }
}

// ── OpenAI 스트리밍 채점 ──────────────────────
async function gradeWithOpenAI(res, model, prompt, apiKey) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey });

  const stream = await client.chat.completions.create({
    model,
    max_tokens: 2000,
    stream: true,
    messages: [
      { role: 'system', content: '당신은 소방기술사 시험 전문 채점관입니다.' },
      { role: 'user', content: prompt }
    ]
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  }
}

// ── 채점 엔드포인트 ────────────────────────────
app.post('/grade', async (req, res) => {
  const { questionNumber, questionText, subs, studentAnswer, modelAnswer, model, apiKey } = req.body;

  if (!studentAnswer || studentAnswer.trim().length < 10) {
    return res.status(400).json({ error: '답안이 너무 짧습니다. 최소 10자 이상 작성하세요.' });
  }

  const selectedModel = MODELS[model] ? model : 'gpt-4o';
  const provider = MODELS[selectedModel].provider;

  if (!apiKey) {
    return res.status(400).json({ error: 'API 키를 입력해주세요.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const prompt = buildPrompt(questionNumber, questionText, subs, studentAnswer, modelAnswer);

  try {
    if (provider === 'anthropic') {
      await gradeWithAnthropic(res, selectedModel, prompt, apiKey);
    } else {
      await gradeWithOpenAI(res, selectedModel, prompt, apiKey);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('API 오류:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n🚒 소방기술사 AI 채점 서버 실행 중`);
  console.log(`   http://localhost:${PORT}/fire_exam.html\n`);
  console.log(`   Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗ (미설정)'}`);
  console.log(`   OpenAI API:    ${process.env.OPENAI_API_KEY    ? '✓' : '✗ (미설정)'}\n`);
});
