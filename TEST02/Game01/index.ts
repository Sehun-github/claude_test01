const { stdout, stdin } = process;

// ── 상수 ──────────────────────────────────────────────────
const W = 50;           // 내부 너비
const H = 28;           // 내부 높이
const TICK_MS = 50;

const BRICK_COLS = 10;
const BRICK_W = 5;      // W / BRICK_COLS = 5
const BRICK_ROWS = 5;
const BRICK_TOP = 2;    // 게임 그리드 내 벽돌 시작 행

// ── 색상 ──────────────────────────────────────────────────
const C = {
  reset:  "\x1b[0m",
  wall:   "\x1b[90m",
  ball:   "\x1b[93;1m",
  paddle: "\x1b[96;1m",
  brickN: "\x1b[34;1m",   // 파랑 - 일반
  brickH2:"\x1b[31;1m",  // 빨강 - 단단 (2hp)
  brickH1:"\x1b[33;1m",  // 노랑 - 단단 (1hp 남음)
  brickI: "\x1b[35;1m",  // 보라 - 아이템
  iWide:  "\x1b[92;1m",  // 초록 - 패들 확장
  iLife:  "\x1b[91;1m",  // 빨강 - 목숨
  iSlow:  "\x1b[96;1m",  // 청록 - 슬로우
  iScore: "\x1b[93;1m",  // 노랑 - 보너스
  hud:    "\x1b[92m",
  life:   "\x1b[91m",
  title:  "\x1b[95;1m",
  msg:    "\x1b[93;1m",
};

// ── 타입 ──────────────────────────────────────────────────
type BrickType = "normal" | "hard" | "item";
type Brick = { hp: number; maxHp: number; type: BrickType };
type ItemKind = "wide" | "life" | "slow" | "score";
type FallingItem = { x: number; y: number; kind: ItemKind };

// ── 상태 ──────────────────────────────────────────────────
let paddleX  = W / 2 - 5;
let paddleW  = 10;
let wideTimer = 0;      // 패들 확장 남은 틱

let ballX = W / 2;
let ballY = H - 3;
let ballDX = 0.0;
let ballDY = 0.0;
let launched = false;
let baseSpeed = 1.3;

let bricks: (Brick | null)[][] = [];
let fallingItems: FallingItem[] = [];

let score = 0;
let lives = 3;
let gameOver = false;
let gameWon  = false;

let popupMsg   = "";
let popupTimer = 0;

// ── 초기화 ────────────────────────────────────────────────
function initBricks() {
  bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    bricks[r] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      const rnd = Math.random();
      if (rnd < 0.15) {
        bricks[r][c] = { hp: 2, maxHp: 2, type: "hard" };
      } else if (rnd < 0.30) {
        bricks[r][c] = { hp: 1, maxHp: 1, type: "item" };
      } else {
        bricks[r][c] = { hp: 1, maxHp: 1, type: "normal" };
      }
    }
  }
}

function resetBall() {
  ballX = paddleX + paddleW / 2;
  ballY = H - 3;
  ballDX = 0;
  ballDY = 0;
  launched = false;
}

function popup(msg: string, dur = 40) {
  popupMsg   = msg;
  popupTimer = dur;
}

// ── 렌더링 ────────────────────────────────────────────────
function brickChar(brick: Brick, pos: number): string {
  const mid = Math.floor(BRICK_W / 2);
  if (brick.type === "normal") {
    return C.brickN + "▓" + C.reset;
  }
  if (brick.type === "hard") {
    if (brick.hp === 2) return C.brickH2 + "█" + C.reset;
    return C.brickH1 + "▒" + C.reset;
  }
  // item brick
  if (pos === mid) return C.brickI + "★" + C.reset;
  return C.brickI + "▓" + C.reset;
}

function itemChar(kind: ItemKind): string {
  switch (kind) {
    case "wide":  return C.iWide  + "W" + C.reset;
    case "life":  return C.iLife  + "♥" + C.reset;
    case "slow":  return C.iSlow  + "S" + C.reset;
    case "score": return C.iScore + "$" + C.reset;
  }
}

function getCell(x: number, y: number): string {
  const bx = Math.round(ballX);
  const by = Math.round(ballY);

  // 공
  if (x === bx && y === by) return C.ball + "●" + C.reset;

  // 낙하 아이템
  for (const fi of fallingItems) {
    if (Math.round(fi.x) === x && Math.round(fi.y) === y)
      return itemChar(fi.kind);
  }

  // 패들
  const px = Math.round(paddleX);
  if (y === H - 1 && x >= px && x < px + paddleW) {
    const rel = x - px;
    const ch = rel === 0 ? "╠" : rel === paddleW - 1 ? "╣" : "═";
    return C.paddle + ch + C.reset;
  }

  // 벽돌
  const brickRow = y - BRICK_TOP;
  if (brickRow >= 0 && brickRow < BRICK_ROWS) {
    const c = Math.floor(x / BRICK_W);
    if (c >= 0 && c < BRICK_COLS) {
      const b = bricks[brickRow][c];
      if (b && b.hp > 0) return brickChar(b, x - c * BRICK_W);
    }
  }

  return " ";
}

function render() {
  const topBorder = C.wall + "╔" + "═".repeat(W) + "╗" + C.reset;
  const botBorder = C.wall + "╚" + "═".repeat(W) + "╝" + C.reset;

  let out = "\x1b[H";

  // HUD
  out += C.title + " BREAKOUT " + C.reset;
  out += C.hud + "SCORE: " + score + C.reset + "  ";
  out += C.life + "LIVES: " + "♥ ".repeat(lives).trim() + C.reset;
  if (wideTimer > 0) out += "  " + C.iWide + "[패들 확장 중]" + C.reset;
  out += "\n";
  out += topBorder + "\n";

  for (let y = 0; y < H; y++) {
    out += C.wall + "║" + C.reset;
    for (let x = 0; x < W; x++) {
      out += getCell(x, y);
    }
    out += C.wall + "║" + C.reset + "\n";
  }

  out += botBorder + "\n";

  // 하단 메시지
  if (!launched) out += C.msg + "  [SPACE] 발사  " + C.reset;
  if (popupTimer > 0) out += C.msg + popupMsg + C.reset;
  out += "  ← → / A D 이동  Ctrl+C 종료\n";

  stdout.write(out);
}

// ── 아이템 효과 ───────────────────────────────────────────
function applyItem(kind: ItemKind) {
  switch (kind) {
    case "wide":
      paddleW = Math.min(20, paddleW + 6);
      wideTimer = 350;
      popup("패들 확장! (+6)");
      score += 20;
      break;
    case "life":
      lives = Math.min(5, lives + 1);
      popup("목숨 +1! ♥");
      score += 50;
      break;
    case "slow":
      baseSpeed = Math.max(0.7, baseSpeed - 0.25);
      // 현재 속도 벡터도 줄이기
      const curSpd = Math.hypot(ballDX, ballDY);
      if (curSpd > 0) {
        const factor = baseSpeed / curSpd;
        ballDX *= factor;
        ballDY *= factor;
      }
      popup("공 느려짐!");
      score += 20;
      break;
    case "score":
      score += 100;
      popup("+100 점!");
      break;
  }
}

// ── 충돌: 벽돌 ────────────────────────────────────────────
function checkBrickCollision() {
  // 공 주변 포인트로 충돌 감지
  const pts = [
    { x: ballX,        y: ballY        },
    { x: ballX + 0.6,  y: ballY        },
    { x: ballX - 0.6,  y: ballY        },
    { x: ballX,        y: ballY + 0.6  },
    { x: ballX,        y: ballY - 0.6  },
  ];

  for (const pt of pts) {
    const r = Math.round(pt.y) - BRICK_TOP;
    const c = Math.floor(pt.x / BRICK_W);
    if (r < 0 || r >= BRICK_ROWS || c < 0 || c >= BRICK_COLS) continue;
    const b = bricks[r][c];
    if (!b || b.hp <= 0) continue;

    // 히트
    b.hp--;
    if (b.hp <= 0) {
      score += b.type === "hard" ? 30 : 10;
      if (b.type === "item") {
        const dropX = c * BRICK_W + BRICK_W / 2;
        const dropY = r + BRICK_TOP + 1;
        const kinds: ItemKind[] = ["wide", "life", "slow", "score"];
        fallingItems.push({ x: dropX, y: dropY, kind: kinds[Math.floor(Math.random() * 4)] });
      }
      bricks[r][c] = null;
    } else {
      score += 5;
    }

    // 튕기는 방향: 수평/수직 결정
    const brickCenterX = c * BRICK_W + BRICK_W / 2;
    const brickCenterY = r + BRICK_TOP + 0.5;
    const dx = ballX - brickCenterX;
    const dy = ballY - brickCenterY;

    if (Math.abs(dy) >= Math.abs(dx) * 1.0) {
      ballDY = -ballDY;
    } else {
      ballDX = -ballDX;
    }
    return; // 틱당 1벽돌만 처리
  }
}

// ── 메인 업데이트 ─────────────────────────────────────────
function update() {
  if (popupTimer > 0) popupTimer--;
  if (wideTimer > 0) {
    wideTimer--;
    if (wideTimer === 0) {
      paddleW = 10;
      popup("패들 원래 크기");
    }
  }

  // 낙하 아이템 이동 & 수집 (미발사 상태에서도 계속 떨어져야 함)
  fallingItems = fallingItems.filter(fi => {
    fi.y += 0.4;
    const iy = Math.round(fi.y);
    const ix = Math.round(fi.x);
    const px2 = Math.round(paddleX);
    if (iy >= H - 1 && ix >= px2 && ix < px2 + paddleW) {
      applyItem(fi.kind);
      return false;
    }
    return fi.y < H + 1;
  });

  // 미발사 상태: 공을 패들에 붙임
  if (!launched) {
    ballX = Math.min(W - 1, Math.max(0, paddleX + paddleW / 2));
    ballY = H - 3;
    return;
  }

  // 공 이동
  ballX += ballDX;
  ballY += ballDY;

  // 좌/우 벽
  if (ballX <= 0)     { ballX = 0.1;   ballDX =  Math.abs(ballDX); }
  if (ballX >= W - 1) { ballX = W-1.1; ballDX = -Math.abs(ballDX); }
  // 위쪽 벽
  if (ballY <= 0)     { ballY = 0.1;   ballDY =  Math.abs(ballDY); }

  // 벽돌 충돌
  checkBrickCollision();

  // 패들 충돌
  const px = Math.round(paddleX);
  if (ballY >= H - 2 && ballY < H && ballX >= px && ballX < px + paddleW) {
    ballY = H - 2;
    ballDY = -Math.abs(ballDY);
    const rel = (ballX - px) / paddleW;  // 0~1
    ballDX = (rel - 0.5) * 4.0;
    if (Math.abs(ballDX) < 0.4) ballDX = ballDX >= 0 ? 0.4 : -0.4;
    // 속도 정규화
    const spd = Math.hypot(ballDX, ballDY);
    ballDX = (ballDX / spd) * baseSpeed;
    ballDY = (ballDY / spd) * baseSpeed;
    score++;
  }

  // 공이 바닥 아래로 떨어짐
  if (ballY > H) {
    lives--;
    if (lives <= 0) {
      gameOver = true;
    } else {
      popup(`아웃! 남은 목숨: ${lives}`);
      resetBall();
    }
    return;
  }

  // 클리어 체크
  const remaining = bricks.flat().filter(b => b !== null).length;
  if (remaining === 0) gameWon = true;
}

// ── 키 입력 ───────────────────────────────────────────────
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

stdin.on("data", (key: string) => {
  if (key === "\u0003") exitGame();

  if (key === " " && !launched && !gameOver && !gameWon) {
    launched = true;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
    ballDX = Math.cos(angle) * baseSpeed;
    ballDY = Math.sin(angle) * baseSpeed;
  }

  const move = 3;
  if (key === "\u001b[C" || key === "d" || key === "l") {
    paddleX = Math.min(W - paddleW, paddleX + move);
  }
  if (key === "\u001b[D" || key === "a" || key === "h") {
    paddleX = Math.max(0, paddleX - move);
  }
});

function exitGame(msg?: string) {
  clearInterval(loop);
  stdout.write("\x1b[?25h\x1b[2J\x1b[H");
  stdin.setRawMode(false);
  if (msg) console.log(msg);
  process.exit(0);
}

// ── 시작 ──────────────────────────────────────────────────
initBricks();
resetBall();
stdout.write("\x1b[?25l\x1b[2J");

const loop = setInterval(() => {
  if (gameOver) {
    render();
    exitGame(`\n💀 게임 오버! 최종 점수: ${score}\n`);
  }
  if (gameWon) {
    render();
    exitGame(`\n🎉 전체 클리어! 최종 점수: ${score}\n`);
  }
  update();
  render();
}, TICK_MS);
