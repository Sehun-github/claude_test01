const { stdout, stdin } = process;

// ── 설정 ──────────────────────────────────────────
const W = 50;          // 내부 너비 (벽 제외)
const H = 22;          // 내부 높이 (벽 제외)
const PADDLE_W = 8;
const TICK_MS = 60;

// ── 상태 ──────────────────────────────────────────
let ballX = W / 2;
let ballY = 4;
let ballDX = 1;
let ballDY = 1;
let paddleX = W / 2 - PADDLE_W / 2;
let score = 0;
let lives = 3;
let gameOver = false;
let won = false;
let frameCount = 0;

// ── 색상 ──────────────────────────────────────────
const C = {
  reset:  "\x1b[0m",
  wall:   "\x1b[90m",      // 회색
  ball:   "\x1b[93;1m",    // 밝은 노랑
  paddle: "\x1b[96;1m",    // 밝은 청록
  score:  "\x1b[92m",      // 초록
  life:   "\x1b[91m",      // 빨강
  title:  "\x1b[95;1m",    // 보라
};

// ── 키 입력 ───────────────────────────────────────
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

stdin.on("data", (key: string) => {
  if (key === "\u0003") exitGame();          // Ctrl+C
  if (key === "\u001b[C" || key === "l" || key === "d") {
    paddleX = Math.min(W - PADDLE_W, paddleX + 3);
  }
  if (key === "\u001b[D" || key === "h" || key === "a") {
    paddleX = Math.max(0, paddleX - 3);
  }
});

// ── 렌더링 ────────────────────────────────────────
function render() {
  // 그리드 초기화 (공백)
  const grid: string[][] = Array.from({ length: H }, () => Array(W).fill(" "));

  // 공
  const bx = Math.round(ballX);
  const by = Math.round(ballY);
  if (bx >= 0 && bx < W && by >= 0 && by < H) {
    grid[by][bx] = `${C.ball}O${C.reset}`;
  }

  // 패들
  const px = Math.round(paddleX);
  for (let i = 0; i < PADDLE_W; i++) {
    if (px + i < W) {
      grid[H - 1][px + i] = `${C.paddle}═${C.reset}`;
    }
  }

  // 화면 조립
  const hLine = C.wall + "╔" + "═".repeat(W) + "╗" + C.reset;
  const bLine = C.wall + "╚" + "═".repeat(W) + "╝" + C.reset;

  let out = "\x1b[H"; // 커서를 맨 위로 (깜빡임 없이)

  out += `${C.title} 🏀 공튀기기 ${C.reset}  `;
  out += `${C.score}SCORE: ${score}${C.reset}  `;
  out += `${C.life}LIVES: ${"♥ ".repeat(lives)}${C.reset}\n`;
  out += hLine + "\n";

  for (let y = 0; y < H; y++) {
    out += C.wall + "║" + C.reset;
    out += grid[y].join("");
    out += C.wall + "║" + C.reset + "\n";
  }

  out += bLine + "\n";
  out += `  ${C.reset}← → 또는 A D 로 이동  |  Ctrl+C 종료\n`;

  stdout.write(out);
}

// ── 물리 업데이트 ─────────────────────────────────
function update() {
  frameCount++;

  // 속도 증가 (10점마다 살짝)
  const speed = 1 + Math.floor(score / 10) * 0.15;

  ballX += ballDX * speed;
  ballY += ballDY * speed;

  // 좌/우 벽
  if (ballX <= 0)     { ballX = 0;     ballDX =  Math.abs(ballDX); }
  if (ballX >= W - 1) { ballX = W - 1; ballDX = -Math.abs(ballDX); }

  // 위쪽 벽
  if (ballY <= 0) { ballY = 0; ballDY = Math.abs(ballDY); }

  // 패들 충돌
  const px = Math.round(paddleX);
  if (ballY >= H - 2 && ballY < H && ballX >= px && ballX < px + PADDLE_W) {
    ballY = H - 2;
    ballDY = -Math.abs(ballDY);
    score++;

    // 패들 어느 쪽에 맞았냐에 따라 각도 변화
    const rel = (ballX - px) / PADDLE_W; // 0.0 ~ 1.0
    ballDX = (rel - 0.5) * 3;
    if (Math.abs(ballDX) < 0.3) ballDX = ballDX < 0 ? -0.3 : 0.3;
  }

  // 바닥 아래로 떨어짐
  if (ballY >= H) {
    lives--;
    if (lives <= 0) {
      gameOver = true;
    } else {
      resetBall();
    }
  }
}

function resetBall() {
  ballX = W / 2;
  ballY = 4;
  ballDX = Math.random() > 0.5 ? 1 : -1;
  ballDY = 1;
}

// ── 종료 처리 ─────────────────────────────────────
function exitGame(message?: string) {
  clearInterval(loop);
  stdout.write("\x1b[?25h"); // 커서 복원
  stdout.write("\x1b[2J\x1b[H");
  if (message) console.log(message);
  stdin.setRawMode(false);
  process.exit(0);
}

// ── 게임 시작 ─────────────────────────────────────
stdout.write("\x1b[?25l"); // 커서 숨김
stdout.write("\x1b[2J");   // 화면 클리어

const loop = setInterval(() => {
  if (gameOver) {
    render();
    exitGame(
      `\n${C.life}💀 게임 오버!${C.reset}  최종 점수: ${C.score}${score}${C.reset}\n`
    );
  }
  update();
  render();
}, TICK_MS);
