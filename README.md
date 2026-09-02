# 랜턴 7 (Lantern 7) — 한글화 데모

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub%20Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)](https://sigco3111.github.io/neon-vector-defense/) [![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![React](https://img.shields.io/badge/React-19-20232a?style=flat-square&logo=react)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)

> 원작자 [Calculator5329](https://github.com/Calculator5329/neon-vector-defense)의 React + TypeScript + Canvas 기반 SF 타워 디펜스 게임을 한국어로 번역·배포한 데모입니다. 게임 내 표시 텍스트(메뉴, HUD, 모달, 리더보드, 데이터, 안내문 등)를 한글로 전환했고, 식별자와 게임 시스템 로직은 원본 그대로 유지합니다.
>
> **라이브 데모 : https://sigco3111.github.io/neon-vector-defense/**

---

## 🌌 게임 소개

**랜턴 7**은 인류가 우주에 세운 마지막 등대, **랜턴 세븐**의 수호자(Warden)가 되어 콤바인 합동군의 침략에 맞서 싸우는 SF 타워 디펜스 게임입니다.

> 인류는 깊은 우주 곳곳에 **랜턴**이라 불리는 등대 중계소를 세웠습니다. 이 등대들은 **연속성**(Continuity) — 모든 식민지를 건넌 colonists의 업로드된 의식을 백업하는 핵심 장치입니다. **벡스 콤바인** 합동군이 그들을 포위하고 있지만, 이 침략은 사실 284년 전에 끝난 전쟁의 포위 명령을 여전히 실행 중인 자기복제 물류 함대입니다. 당신은 랜턴 세븐의 수호자입니다. 라인을 지키고 회수된 신호 파편을 따라가세요.

---

## 🎮 게임 특징

### 16개 섹터와 인터랙티브 스타맵
- **3개 영역** — **코어 릴레이**, **포지 벨트**, **암흑 권역**
- 각 섹터는 고유한 **라인 형태**, **건설 불가 구역**, **마스터리 별**, **비주얼 테마** 보유
- 순차적 캠페인 체인을 따라 점진적으로 해금

### 4단계 프로토콜
- **신규 (Recruit)** — 입문용 표준 난이도
- **베테랑 (Veteran)** — 더 긴 캠페인, 더 강한 웨이브
- **정점 (Apex)** — 정예 합동군과의 격돌
- **말멸 (Extinction)** — 무한에 가까운 압도적 압박

### 건틀릿 프로토콜
- **매주 시드 기반** 3구간 로그라이트 런
- 코어와 일부 크레딧이 구간 사이에 carry over
- 맵 사이의 시드된 유물 초안
- 첫 사망 시 런 종료, 구간별 리플레이가 리더보드에 연결

### 주간 운영
- **주간 변이** — 규칙 트위스트가 누적되는 매주 변형
- **챔피언 건틀릿** — 모두 우승자의 런과 경합

### 21개 타워 × 2개 업그레이드 경로
- 지원, 군중 제어, 은신 무효화, 폭발, 드론, 미사일, 중력, 공명, 타겟팅, 후반 타워 등 다양한 역할
- 각 타워마다 두 갈래 업그레이드 분기

### 7개 사령관 능력
- **Q / W / E / R / T / Y / U** 키로 해제
- 궤도 폭격, 슬로우 필드, 오버드라이브, 응급 인양, 적응 리셋, 후반 컨트롤 도구

### 다양한 적 변형
- 장갑형, 폭발 내성, 냉각 내성, 위상 은신, 수리형, 보스, 중첩 hull 등

### 진행 및 메타 루프
- **서비스 기록**, **타워 해금**, **프리플레이**, **회수 신호 파편**, **코스메틱 보상**
- **워든 랭크**, **인양물 지갑**, **데일리/위클리 운영 보드 퀘스트**, **감시 스트릭** (코스메틱/QoL 전용 — 런 밸런스 영향 X)

### 런 내 QoL
- 빌드 페이즈 웨이브 미리보기, 키보드 배치, 타워 사이클링
- 베테랑 출격 — 반복 런용 배치 후 일괄 업그레이드

### 배틀플랜 리플레이
- `?run=<runId>` URL로 어떤 런이든 관전 (~5KB 압축 액션 스트림)
- 예산 seek로 25분 런을 lag-free 스크럽
- 레거시/부분 리플레이용 코스메틱 재구성 폴백

### 봇 라이벌 고스트
- 런 내 pacing 곡선이 코어/크레딧을 동일 섹터의 신병/스탠다드/정예 봇 프로필과 비교

### 리더보드와 피드백
- 서버 검증된 Firestore 스코어보드
- 익명 피드백 제출
- 점수는 일치하는 공개 리플레이가 필요하며 서버 시각 기준 정렬

### AI 현장 도우미 (선택)
- Cloudflare Worker 프록시, OpenRouter, 서버 사용량 제한을 통한 옵션 헬퍼

---

## 🛠️ 기술 하이라이트

### Canvas 렌더러
- 벡터 스타일 적/타워 아트를 supersampled 오프스크린 캔버스에 그림
- 반동, 글로우, 흔들림, 트레일, 비네팅, 데미지 이펙트 애니메이션

### 결정론적 헤드리스 엔진
- 시드 RNG + 고정 timestep → 모든 런 비트 재현 가능
- 동일한 게임 모델이 라이브 플레이, 봇 플레이테스트, 밸런스 시뮬레이션, 퍼포먼스 하네스, 관리 분석을 구동

### 서버측 안티치트
- 제출된 점수는 Cloud Functions에서 압축 액션 스트림을 재시뮬레이션
- 정규 밸런스/챌린지 스냅샷과 비교 후 신뢰 결정

### 원격 밸런스 설정
- 옵션 Firestore `config/balance` 문서로 타워/적/프로토콜/수익/글로벌 배수를 redeploy 없이 핫패치

### 밸런스 하네스
- `npm run balance` — 맵/프로토콜/봇 매트릭스, 타워 효율, 전략 실행 가능성, 솔로 타워 런 시뮬레이션 + in-app `balance-report.json` 생성

### 봇 시뮬레이션
- `npm run sim` — 신병/스탠다드/정예 봇 티어를 공개 게임 API로 실행하여 난이도 목표 유지

### 절차적 오디오 + 생성 음악
- `public/audio/`의 레이어드 신스 이펙트, 음악 팩, 섹터 앰비언스, 스팅거, 아나운서 라인

### 생성형 아트 파이프라인
- OpenRouter 이미지 모델을 통해 메뉴/섹터/브리핑/승리/패배/아카이브 이미지를 옵션 생성
- `public/art/`에 트림된 생성 결과물 보관

### Firebase 통합
- 익명 플레이어 인증, 공개 리더보드 읽기, 검증된 점수/피드백/텔레메트리 쓰기, 관리자 전용 데이터 접근

---

## 🎯 데모 모드와 관전 모드

### 데모 모드 (리크루터용)
URL 끝에 `?demo=1`을 붙여 백엔드 통신 없는 데모 세션 실행:

```
https://sigco3111.github.io/neon-vector-defense/?demo=1
```

- 모든 섹터/프로토콜/타워 즉시 해금
- 텔레메트리 비활성, 점수 제출 차단
- 프로덕션 데이터 오염 방지

### 리플레이 관전
```
https://sigco3111.github.io/neon-vector-defense/?run=r_<runId>
```

- 읽기 전용 `ReplayViewer` 표시
- 25분 런의 lag-free 스크럽 지원

---

## 🕹️ 조작

| 입력 | 동작 |
|---|---|
| `1`-`9`, `0` | 타워 선택 후 키보드 배치 모드 진입 |
| 화살표 키, `Enter` | 배치 커서 이동 및 선택한 타워 건설 |
| 맵 클릭 | 타워 배치 또는 파워업 수집 |
| `Shift`-클릭 | 선택한 타워 연속 배치 |
| 타워 클릭 | 업그레이드/타겟팅/스탯/배경/판매 패널 열기 |
| `Tab` / 화살표 키, `Enter` | 배치된 타워 사이클 후 업그레이드 패널 포커스 |
| `Q W E R T Y` | 사령관 능력 |
| 우클릭 / `Esc` | 배치/조준/선택 취소 |
| `Space` | 다음 웨이브 시작 또는 웨이브 중 일시정지 |

---

## 🔧 로컬 개발

```bash
npm install
npm run dev          # Vite 개발 서버 (localhost:5173)
npm run build        # 타입체크 + 프로덕션 빌드
npm run preview      # 빌드 결과물 미리보기
npm run sim          # 헤드리스 봇 시뮬레이션 (전체)
npm run sim -- quick # 빠른 시뮬레이션
npm run balance      # public/balance-report.json 생성
npm run perf         # 헤드리스 엔진 부하 테스트
npm run perf:browser # 브라우저 FPS 샘플링 (/?perf=)
```

---

## 🌐 한글화 노트

이 저장소는 원작자의 게임 로직, 데이터 구조, 시뮬레이션 정확성을 그대로 보존하면서 **사용자 대면 표시 텍스트**만 한국어로 전환한 fork입니다.

### 변경 범위
- ✅ 메뉴, HUD, 모달, 리더보드, 운영 보드, 도감, 리플레이 뷰어 등 UI 라벨
- ✅ 타워/적/맵/능력의 `name`, `description`, `lore` 등 표시 필드
- ✅ 데일리/위클리 변형, 프리플레이 계약, 유물 초안, 훈련 미션 등 메타 콘텐츠
- ✅ 인게임 가이드/도움말 시스템
- ✅ 오류 메시지, 도구 설명, aria-label 등 접근성 텍스트

### 보존 범위
- 🔒 객체 키, enum 값, 식별자(id, type, tier, role, rarity, cost 등)
- 🔒 CSS 클래스명, React key, data-testid
- 🔒 변수명, 함수명, export된 상수명
- 🔒 게임 로직, 시뮬레이션, 점수 계산, 밸런스 수치
- 🔒 원본 아트/오디오 자산 (자체 생성된 디자인 자산)
- 🔒 Firebase 통합 코드 (단, 백엔드 의존 기능은 데모 모드/리플레이 모드에서만 동작)

### 데모 모드 안내
이 저장소는 **GitHub Pages**에 정적 호스팅되므로 Firebase 백엔드(Firestore, Cloud Functions)와 연결되지 않습니다. 다음 기능은 동작하지 않습니다:
- 글로벌 리더보드 제출/읽기
- 관리자 콘솔
- AI 현장 도우미 (서버 프록시 없음)
- 원격 밸런스 설정 핫패치

**데모 모드 (`?demo=1`)** 또는 **리플레이 관전 (`?run=r_...`)** 사용을 권장합니다. 로컬에서는 백엔드 의존 기능이 정상 동작합니다 (`.env.local` 구성 시).

---

## 📦 빌드 산출물

- React 19 + TypeScript + Vite 기반 SPA
- `dist/` 정적 산출물
- 단일 `index.html` + 청크 분할된 JS/CSS 번들
- Firebase SDK 청크는 lazy load (첫 진입 시 미로드)
- React/Firebase/vendor 청크 분리 → 게임 코드 변경 시 캐시 보존

---

## 📚 원본 문서

원본 저장소의 상세 문서는 다음을 참고하세요:

| 문서 | 내용 |
|---|---|
| `docs/architecture.md` | 모듈 맵, 레이어 모델, 런타임 흐름 |
| `docs/tech_spec.md` | Firestore 스키마, Cloud Functions, 환경 변수 |
| `docs/business_plan.md` | 전략, 실행 순서, KPI, 런칭 게이트 |
| `docs/decision_log.md` | 현재 신뢰 가능한 설계 결정 |
| `docs/roadmap.md` | 출시된 기능과 다음 우선순위 |
| `docs/asset_provenance.md` | 미디어 라이선스 vs MIT 소스 |

---

## 📜 라이선스

이 한글화 데모는 원본 저장소와 동일한 **MIT 라이선스**를 따릅니다.

원본 소스 코드와 문서는 MIT 라이선스입니다. 생성된 아트/오디오 자산은 별도 권리입니다 — 자세한 내용은 `docs/asset_provenance.md` (원본 저장소) 참조.

원작자: [Calculator5329](https://github.com/Calculator5329)

---

> ⚠️ **참고**: 이 저장소는 개인 한글화 데모이며, 원본 게임의 공식 배포는 아닙니다. 원본의 모든 권리는 원작자에게 있습니다.
