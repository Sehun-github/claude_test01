---
name: game-deploy
description: 게임을 개발하고 웹 앱으로 배포하는 전체 과정을 진행
disable-model-invocation: true
argument-hint: "[html|flutter] [파일명]"
allowed-tools: Bash(git *), Bash(gh *), Bash(flutter *), Read
---

## 현재 Git 상태
- 브랜치: !`git branch --show-current`
- 변경 파일: !`git status --short`
- 원격 저장소: !`git remote get-url origin 2>/dev/null || echo "원격 저장소 없음"`
- GitHub Pages URL: !`gh api repos/{owner}/{repo}/pages --jq .html_url 2>/dev/null || echo "Pages 미설정"`

배포 대상: `$ARGUMENTS` (비어있으면 사용자에게 게임 종류와 배포 플랫폼 먼저 확인)

## 개발 단계
1. 게임 파일 생성 또는 기존 파일 선택
2. 게임 로직 구현 및 테스트
3. `/game-review`로 품질 검토 후 수정

## 배포 단계

### HTML 게임 → GitHub Pages 배포
1. `git add` + `git commit` (한국어 메시지)
2. GitHub Pages 설정 확인 (`gh-pages` 브랜치 또는 `docs/` 폴더)
3. `git push`
4. 위 GitHub Pages URL로 배포 확인 후 사용자에게 전달

### Flutter 게임 → 웹 앱 배포
1. `flutter build web --release` 실행
2. `build/web/` 결과물을 GitHub Pages 또는 Firebase Hosting에 배포
3. `flutter build apk` 로 안드로이드 APK 생성 (요청 시)

## 배포 전 체크리스트
- [ ] 모바일 반응형 확인
- [ ] 게임 제목/설명 한국어 확인
- [ ] 파비콘 및 OG 태그 설정
- [ ] 커밋 메시지 정리
