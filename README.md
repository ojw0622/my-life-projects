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

Supabase SQL Editor에서 `supabase/schema.sql`을 실행하면 테이블과 RLS 정책이 생성됩니다 (재실행 가능).

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
  app/                  Next.js App Router
  components/ui/        shadcn/ui 컴포넌트
  lib/
    supabase/           브라우저·서버 클라이언트, 세션 갱신 proxy, DB 타입
    utils.ts            cn()
  modules/
    capital/            자본 — 포트폴리오 계산 엔진 (engine/)
    mind/               사유 — 에세이/메모
    body/               신체 — 맨몸운동, 러닝
  proxy.ts              요청마다 Supabase 세션 갱신
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
