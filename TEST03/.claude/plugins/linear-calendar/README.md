# linear-calendar 플러그인

Linear Clone + 캘린더를 연동한 Claude Code 플러그인입니다.

## 필요 MCP

- `calendar` — 캘린더 이벤트 관리
- `linear` — 이슈 및 프로젝트 관리
- `todo` — 할일 관리

## Skills (슬래시 커맨드)

| 커맨드 | 설명 |
|---|---|
| `/daily-standup` | 오늘 일정 + 내 이슈 브리핑 |
| `/weekly-plan` | 이번 주 일정 + 마감 이슈 계획표 |
| `/sprint-create` | 스프린트 목표 입력 → 이슈 + 캘린더 일괄 생성 |
| `/overdue-check` | 기한 초과 이슈 감지 + 재조정 |
| `/meeting-prep` | 다음 회의 준비 자료 자동 생성 |

## Agents

| 에이전트 | 설명 |
|---|---|
| `pm-agent` | 이슈 병목·위험도 분석, 담당자 부하 체크 |
| `conflict-detector` | 캘린더 + 마감일 충돌 감지 및 재배치 제안 |

에이전트 실행 예시:
```
pm-agent를 실행해줘
conflict-detector 에이전트로 이번 주 충돌 확인해줘
```

## Hooks (자동 트리거)

| 이벤트 | 동작 |
|---|---|
| 이슈 생성 후 | 마감일 충돌 확인 안내 메시지 |
| 캘린더 이벤트 생성 후 | 등록 완료 알림 |
| 이슈 삭제 전 | 캘린더 연동 이벤트 삭제 안내 |

## 구조

```
plugins/linear-calendar/
├── plugin.json
├── README.md
├── skills/
│   ├── daily-standup/SKILL.md
│   ├── weekly-plan/SKILL.md
│   ├── sprint-create/SKILL.md
│   ├── overdue-check/SKILL.md
│   └── meeting-prep/SKILL.md
├── agents/
│   ├── pm-agent.md
│   └── conflict-detector.md
└── hooks/
    └── config.json
```
