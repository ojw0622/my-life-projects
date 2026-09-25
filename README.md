# My Life Dashboard

자본(Capital) · 사유(Mind) · 신체(Body) 세 모듈로 구성된 개인 통합 대시보드.

- Next.js (App Router) · TypeScript (`strict`) · Tailwind CSS v4 · shadcn/ui
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Vitest

## 시작하기

```bash
npm install
cp .env.example .env.local   # Supabase URL / anon key 입력
npm run dev
```

1. Supabase SQL Editor에서 `supabase/schema.sql`을 실행합니다 (재실행 가능). 모든 테이블에 본인 행만 접근하는 RLS가 걸립니다.
2. Authentication → URL Configuration에서 Site URL을 앱 주소로, Redirect URLs에 `<앱 주소>/auth/confirm`을 추가합니다.
3. `/login`에서 이메일·비밀번호로 가입합니다. 이메일 확인을 끄면 가입 즉시 로그인됩니다.

v1 스키마 테이블(`capital_portfolios` 등)은 자동으로 지우지 않습니다. 필요 없으면 `schema.sql` 끝의 주석 블록을 실행하세요.

## 화면

| 경로 | 내용 |
| --- | --- |
| `/` | Spaced Reflection(과거 글 하루 한 편), 자본 요약, 주간 마일리지, 오늘의 운동 |
| `/capital` | 자산 표·등록/수정/삭제, 현재 vs 목표 비중 차트, 밴드 이탈 경고, 신규 현금 배분 계산기, 저축·배당 입금, USD/KRW 환율 |
| `/mind` | 에세이 목록, 원칙(투자/삶/신체) |
| `/mind/new`, `/mind/[id]` | 마크다운 에디터 + 실시간 미리보기 |
| `/body` | 맨몸운동 빠른 입력(볼륨 자동 계산), 러닝 입력(페이스 자동 계산), 주간 마일리지 |

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 라우트 타입 생성 후 `tsc --noEmit` |
| `npm run test` | Vitest 단위 테스트 |

## 디렉토리 구조

```
src/
  app/
    (dashboard)/        로그인 필요한 화면 (홈, capital, mind, body)
    login/, auth/       로그인·회원가입, 이메일 확인 콜백
  components/ui/        shadcn/ui 컴포넌트
  lib/
    supabase/           클라이언트, requireUser, 세션 갱신 proxy, DB 타입
    forms.ts            Server Action 폼 검증·상태 공통 유틸
    date.ts             Asia/Seoul 기준 날짜 계산
  modules/<module>/
    lib/                순수 함수 + zod 스키마 (단위 테스트 대상)
    components/         화면 컴포넌트
    actions.ts          Server Actions (CRUD)
    queries.ts          서버 컴포넌트용 조회
    capital/engine/     포트폴리오 계산 엔진
  proxy.ts              세션 갱신, 비로그인 요청은 /login으로
supabase/schema.sql     DB 스키마 + RLS
```

## 자본 엔진 (`src/modules/capital/engine`)

순수 함수로만 구성되어 있으며 입력을 변경하지 않습니다. 목표 비중은 0~1 사이 소수이고 합이 1이어야 합니다.

- `calculateDrift(holdings)` — 종목별 현재 비중, 괴리율(drift = 현재 − 목표), 상대 괴리율, 목표 금액과의 차이.
- `allocateCash(holdings, cash)` — 매수만으로 신규 현금을 배분해 목표 비중에 가장 가깝게 수렴하는 매수 수량을 계산합니다.
  1. water-filling으로 연속 최적해를 구해 정수 lot 단위로 일괄 매수
  2. 남은 현금을 목표와의 제곱 거리를 가장 크게 줄이는 lot부터 하나씩 매수
  3. 이번 배분에서 산 lot을 되돌려 더 큰 lot을 사는 편이 나으면 교체 (기존 보유분은 절대 매도하지 않음)

  `lotSize`로 소수점 매수(예: 0.0001 BTC)를 지원합니다.
