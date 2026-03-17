import questionsRaw from "./questions.json";

const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function calcPercent(score: number, total: number): number {
  return Math.round((score / total) * 100);
}

async function main() {
  console.log("=== 퀴즈 시작! ===\n");

  let score = 0;

  const questions = shuffle(questionsRaw).map((q) => {
    const correctOption = q.options[q.answer - 1];
    const shuffledOptions = shuffle(q.options);
    const newAnswer = shuffledOptions.indexOf(correctOption) + 1;
    return { ...q, options: shuffledOptions, answer: newAnswer };
  });

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`Q${i + 1}. ${q.question}`);
    q.options.forEach((opt, idx) => {
      console.log(`  ${idx + 1}. ${opt}`);
    });

    let input: string;
    while (true) {
      input = (await ask("답 입력 (1~4): ")).trim();
      if (["1", "2", "3", "4"].includes(input)) break;
      console.log("1~4 사이의 번호를 입력해주세요.");
    }

    if (parseInt(input) === q.answer) {
      console.log("정답!\n");
      score++;
    } else {
      console.log(`오답! 정답은 ${q.answer}번. ${q.options[q.answer - 1]}\n`);
    }
  }

  const total = questions.length;
  const percent = calcPercent(score, total);
  console.log(`=== 결과 ===`);
  console.log(`${total}문제 중 ${score}문제 정답 (${percent}%)`);

  rl.close();
}

main();
