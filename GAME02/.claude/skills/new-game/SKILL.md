---
name: new-game
description: 새 HTML 게임 파일을 프로젝트 스타일에 맞게 생성
disable-model-invocation: true
argument-hint: "[게임종류 (예: snake, 2048, 지뢰찾기)]"
allowed-tools: Read, Write, Glob
---

## 기존 게임 파일
!`ls *.html 2>/dev/null`

만들 게임: `$ARGUMENTS` (비어있으면 사용자에게 게임 종류와 원하는 기능 먼저 확인)

## 규칙
- 파일은 현재 폴더에 생성
- 기존 게임 파일(위 목록)을 Read로 읽어 스타일 통일:
  - 배경: `linear-gradient(135deg, #0f0c29, #302b63, #24243e)`
  - 폰트: Nunito (Google Fonts)
  - 언어: 한국어, 반응형 디자인 (모바일 대응)
- 순수 HTML/CSS/JS 단일 파일 (외부 라이브러리 없이)
- 게임 제목, 점수, 조작법 안내 포함

## 절차
1. 기존 게임 파일 중 하나를 Read로 읽어 CSS/레이아웃 스타일 파악
2. 게임 로직 구현 (모바일 터치 지원 포함)
3. 파일 생성 후 `/game-review`로 품질 검토 권장
