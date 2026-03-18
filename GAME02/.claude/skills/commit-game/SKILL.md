---
name: commit-game
description: 변경된 게임 파일을 분석해서 한국어 커밋 메시지 작성 후 커밋
disable-model-invocation: true
argument-hint: "[파일명 (생략 시 전체 변경사항)]"
allowed-tools: Bash(git *), Read
---

## 현재 Git 상태
- 변경 파일: !`git status --short`
- 전체 변경 내용: !`git diff`
- 최근 커밋 스타일 참고: !`git log --oneline -5`

## 커밋 대상
`$ARGUMENTS` (비어있으면 위 변경 파일 전체를 대상으로 함)

## 커밋 메시지 규칙
- Conventional Commits 형식: `type: 설명`
- 설명은 한국어로 작성
- 최근 커밋 스타일을 참고해서 일관성 유지
- type 종류:
  - `feat`: 새 기능 추가
  - `fix`: 버그 수정
  - `style`: UI/스타일 변경
  - `refactor`: 코드 구조 개선
  - `docs`: 문서 수정

## 절차
1. 위 diff를 분석해서 무엇이 바뀌었는지 파악 (추가 읽기가 필요하면 Read 사용)
2. 커밋 메시지 초안 제시 후 사용자 확인
3. 확인 후 `git add $ARGUMENTS` (비어있으면 `git add -A`) + `git commit` 실행
