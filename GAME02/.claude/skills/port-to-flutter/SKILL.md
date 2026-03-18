---
name: port-to-flutter
description: HTML 게임을 Flutter로 포팅하는 계획 수립 및 구현
disable-model-invocation: true
argument-hint: "[html파일명 (예: tower.html)]"
allowed-tools: Read, Glob, Bash(flutter *)
---

## 포팅 가능한 HTML 게임
!`ls *.html 2>/dev/null`

## Flutter 환경
!`flutter --version 2>/dev/null | head -1 || echo "Flutter 미설치 또는 PATH 미설정"`

포팅 대상: `$ARGUMENTS` (비어있으면 위 목록에서 어떤 파일을 포팅할지 사용자에게 확인)

## 절차
1. 대상 HTML 파일을 Read로 읽고 게임 로직 파악
2. 핵심 구성 요소 분석:
   - 게임 상태 관리 방식
   - 렌더링 방식 (Canvas vs DOM)
   - 입력 처리 (키보드/마우스/터치)
   - 타이머/애니메이션 루프
3. Flutter 변환 전략 제시:
   - Canvas 기반 → `CustomPainter` + `GameLoop`
   - 상태 관리 → `StatefulWidget` 또는 Provider
   - 입력 → `GestureDetector` / `RawKeyboardListener`
4. `tower_flutter/` 폴더 구조를 Glob으로 확인해서 일관성 유지
5. 단계별 구현 계획 수립 후 사용자 확인, 그 후 코드 작성

## 주의사항
- 기존 `tower_flutter/` 프로젝트 스타일과 통일
- 플랫폼: Windows + 모바일 대응
