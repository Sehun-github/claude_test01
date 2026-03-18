# claude_test

Claude Code 실습 및 테스트를 위한 프로젝트로, 인터랙티브 HTML 자기소개서와 next-auth 관련 테스트 코드를 포함합니다.

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [파일 구조](#2-파일-구조)
3. [설치 방법](#3-설치-방법)
4. [실행 방법](#4-실행-방법)
5. [테스트](#5-테스트)
6. [Made by](#6-made-by)

---

## 1. 프로젝트 소개

Claude Code의 기능을 실습하며, 인터랙티브 HTML 자기소개서 제작과 next-auth v5 마이그레이션 테스트 코드를 작성한 학습용 프로젝트입니다.

---

## 2. 파일 구조

```
claude_test/
├── README.md                        # 프로젝트 설명 문서
├── conversation_2026-03-16.md       # Claude Code 실습 대화 로그
├── modules/                         # 모듈 보관 폴더 (예정)
├── resume_lim_sehun.html            # 임세훈 정적 자기소개서
├── resume_interactive.html          # 임세훈 인터랙티브 자기소개서
├── resume_seo_seungah.html          # 서승아 인터랙티브 자기소개서
└── tests/
    └── auth/
        └── google-login.test.ts     # next-auth v5 Google OAuth 테스트
```

---

## 3. 설치 방법

**사전 요구사항**
- Node.js 18 이상
- Git

**설치**

```bash
git clone <repository-url>
cd claude_test
npm install
```

---

## 4. 실행 방법

**HTML 자기소개서 열기**

별도 서버 없이 브라우저에서 직접 열 수 있습니다.

```bash
# Windows
start resume_interactive.html
start resume_seo_seungah.html

# macOS
open resume_interactive.html
```

또는 파일 탐색기에서 `.html` 파일을 더블클릭합니다.

**페이지 이동 방법**
- 사이드바 메뉴 클릭
- 상단 `←` `→` 버튼 클릭
- 키보드 방향키 (`←` `→`)

---

## 5. 테스트

next-auth v5 Google OAuth 관련 테스트를 실행합니다.

```bash
# 전체 테스트 실행
npx jest tests/auth

# 파일 변경 감지 모드
npx jest tests/auth --watch

# 커버리지 포함
npx jest tests/auth --coverage
```

> `tests/auth/google-login.test.ts` 내 import 경로(`@/lib/db`, `@/auth` 등)는 실제 프로젝트 구조에 맞게 수정이 필요합니다.

---

## 6. Made by

2026-03-16 · 임세훈
