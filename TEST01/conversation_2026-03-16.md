# Claude Code 대화 기록
날짜: 2026-03-16

---

## 1. Claude Code 사전 점검 체크리스트

**Q:** 지금 이 환경에서 Claude Code를 안정적으로 쓰기 위한 사전 점검 항목 5개를 체크리스트로 정리해줘. 각 항목은 내가 직접 확인할 수 있는 명령이나 행동 기준을 함께 써줘.

**A:**

### 1. Shell 환경 확인
```bash
echo $SHELL && bash --version
```
- `bash` 버전 4.x 이상인지 확인
- Windows에서는 Git Bash 또는 WSL 기반인지 확인 (PowerShell 혼용 시 경로 오류 발생 가능)

### 2. 작업 디렉토리 및 Git 상태 확인
```bash
pwd && git status
```
- 현재 디렉토리가 의도한 프로젝트 경로인지 확인
- Git 저장소 여부 확인 (현재 이 디렉토리는 non-git repo)
- 미저장 변경사항 없는지 확인 후 작업 시작

### 3. 파일 권한 및 쓰기 가능 여부 확인
```bash
ls -la && touch .claude_test && rm .claude_test
```
- `touch` 명령이 오류 없이 성공하면 쓰기 권한 정상
- 실패 시 관리자 권한 또는 디렉토리 소유권 확인 필요

### 4. Claude Code 설정 파일 확인
```bash
cat ~/.claude/settings.json 2>/dev/null || echo "설정 파일 없음"
```
- `autoApprove`, `permissionMode` 등 설정이 의도한 값인지 확인
- CLAUDE.md 파일이 있다면 프로젝트 규칙이 올바른지 검토

### 5. 메모리 디렉토리 및 인덱스 확인
```bash
ls ~/.claude/projects/C--Users-student-Documents-claude-test/memory/ 2>/dev/null && cat ~/.claude/projects/C--Users-student-Documents-claude-test/memory/MEMORY.md 2>/dev/null
```
- 이전 대화 컨텍스트(메모리)가 있다면 내용이 유효한지 확인
- 오래되거나 잘못된 메모리가 있으면 해당 파일 삭제 요청

> **핵심 원칙:** 각 세션 시작 전 1→2→5 순서로만 확인해도 대부분의 환경 문제를 사전 차단할 수 있습니다.

---

## 2. 답변 스타일 설정

**Q:** 앞으로 내가 초보자가 아니라고 가정하고, 중급 개발자 기준으로 답해줘. 명령을 제안할 때는 왜 필요한지도 한 줄로 설명해줘.

**A:** 저장 완료. 앞으로는 중급 개발자 기준으로, 명령 제안 시 이유를 한 줄씩 붙여서 답변.

---

## 3. Terminal vs IDE 작업 분리 기준

**Q:** 터미널과 VS Code 확장을 함께 쓸 때, 어떤 작업은 터미널에서 하고 어떤 작업은 IDE에서 하는 게 효율적인지 예시 6개로 정리해줘.

**A:**

| # | 작업 | 권장 환경 | 이유 |
|---|------|-----------|------|
| 1 | **대규모 리팩토링** (함수 rename, 파일 이동) | Terminal | Claude가 Glob/Grep으로 전체 참조를 파악하고 일괄 수정 — IDE는 LSP 기반이라 동적 참조를 놓칠 수 있음 |
| 2 | **인라인 코드 수정** (버그 한 줄 fix, 타입 추가) | IDE | 에디터 커서 위치 컨텍스트를 Claude가 바로 읽어 diff를 최소화할 수 있음 |
| 3 | **테스트 실행 및 반복 디버그** | Terminal | `npm test`, `pytest` 등 출력 스트림을 Claude가 직접 파싱해 다음 액션을 결정하는 루프가 빠름 |
| 4 | **진단(Diagnostics) 기반 수정** | IDE | `mcp__ide__getDiagnostics`로 현재 열린 파일의 타입 오류·린트 오류를 실시간으로 읽어 수정 |
| 5 | **신규 파일/모듈 설계** | Terminal | 파일 생성, 디렉토리 구조 변경, git 초기화 등 FS 조작이 연속으로 일어날 때 컨텍스트 스위칭 없이 진행 가능 |
| 6 | **코드 설명 / 리뷰** | IDE | 현재 열린 탭 기준으로 질문하면 Claude가 파일 경로와 라인 번호를 정확히 참조해 답변 — 별도로 경로를 지정할 필요 없음 |

**판단 기준 한 줄 요약:**
- 파일 시스템·프로세스 조작 → **Terminal**
- 현재 열린 파일·에디터 상태 활용 → **IDE**

---

## 4. 대화 내용 파일 저장 (1차)

**Q:** 대화한 내용을 파일로 저장해줘

**A:** `conversation_2026-03-16.md`로 저장 완료. 경로: `C:\Users\student\Documents\claude_test\`

---

## 5. 대화 내용 파일 저장 (2차)

**Q:** 대화한 내용 파일로 저장해줘

**A:** 기존 파일에 이번 대화(4, 5번 항목)까지 추가하여 업데이트 완료.
