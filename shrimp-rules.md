# G-Club 프로젝트 개발 표준 (for AI Agent)

## 1. 프로젝트 개요

- **목표:** Next.js, Supabase, Prisma를 활용하여 게임 동아리 웹 서비스를 구축하고, 장기적으로 React Native 앱으로 확장 가능한 코드베이스를 유지합니다.
- **핵심 기술 스택:**
  - **프레임워크:** Next.js (App Router)
  - **백엔드/DB:** Supabase (PostgreSQL, Auth, Realtime, Storage)
  - **ORM:** Prisma
  - **UI:** TailwindCSS, Shadcn/UI (또는 유사 UI 라이브러리)

---

## 2. 아키텍처 및 디렉토리 구조

**원칙:** 기능과 역할에 따라 파일을 명확히 분리하여 응집도를 높이고 결합도를 낮춥니다.

- `web/app/**`: **페이지 및 API 라우트**.
  - `web/app/(app)`: 사용자 인증이 필요한 페이지 그룹.
  - `web/app/api/**`: 서버 API 엔드포인트.
- `web/components/**`: **React 컴포넌트**.
  - `ui/`: 재사용 가능한 순수 UI 요소 (예: Button, Input). `Shadcn/UI`가 여기에 해당합니다.
  - `common/`: 여러 페이지/기능에서 공통으로 사용되는 복합 컴포넌트 (예: `Header`, `PageLayout`).
  - `[feature]/`: 특정 기능에 강하게 종속된 컴포넌트 (예: `game-mate/GameMateForm`).
- `web/hooks/**`: **비즈니스 로직 및 상태 관리**.
  - React Native와 코드 공유를 위해 UI 로직과 순수 비즈니스 로직을 분리해야 합니다.
  - **UI 로직:** `toast` 알림, 다이얼로그 열기 등 UI와 직접 상호작용하는 로직.
  - **순수 비즈니스 로직:** API 호출, 데이터 정제/가공 등 UI와 무관한 로직.
- `web/lib/**`: **핵심 유틸리티 및 설정**.
  - `lib/supabase/client.ts`: 클라이언트 컴포넌트용 Supabase 클라이언트.
  - `lib/supabase/server.ts`: 서버 컴포넌트 및 API 라우트용 Supabase 클라이언트.
  - `lib/prisma.ts`: Prisma 클라이언트 싱글톤 인스턴스.
  - `lib/utils.ts`: 범용 유틸리티 함수 (예: `cn`, 날짜 포맷팅).
- `web/prisma/**`: **데이터베이스 스키마**.
  - `schema.prisma` 파일만 직접 수정합니다.
- `web/types/**`: **전역 타입 정의**.
  - `types/models.ts`: Prisma 모델과 연관되거나 전역적으로 사용되는 데이터 모델 타입을 정의합니다.

---

## 3. 핵심 개발 원칙 및 규칙

### 3.1. Next.js (App Router)
- **서버 컴포넌트 우선:** 모든 컴포넌트는 서버 컴포넌트로 시작합니다. `useState`, `useEffect`, 이벤트 핸들러 등 브라우저 API가 필요한 경우에만 파일 상단에 `'use client'`를 선언하여 클라이언트 컴포넌트로 전환합니다.
- **최소 단위 클라이언트 컴포넌트:** 사용자 인터랙션이 필요한 부분만 최소 단위의 클라이언트 컴포넌트로 분리합니다. (예: `Button` 컴포넌트 자체는 클라이언트 컴포넌트, 이를 사용하는 페이지는 서버 컴포넌트)
- **데이터 페칭:** 가급적 서버 컴포넌트에서 직접 `async/await`를 사용하여 데이터를 페칭합니다. 클라이언트 컴포넌트에서는 `SWR`이나 `React-Query` 사용을 권장합니다.

### 3.2. Supabase
- **RLS (Row-Level Security) 최우선:**
  - **규칙:** **모든 신규 테이블은 생성과 동시에 RLS를 활성화하고, 정책(Policy)을 수립해야 합니다.**
  - **실행:** Prisma 마이그레이션 실행 시, 생성되는 `migration.sql` 파일에 해당 테이블의 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`와 `CREATE POLICY ...` 구문을 직접 추가하여 정책을 코드로 관리합니다.
  - **금지:** **프로덕션 환경에서 RLS가 비활성화된 테이블이 있어서는 안 됩니다.**
- **인증:**
  - API 라우트 및 서버 컴포넌트에서는 `lib/supabase/server.ts`의 `createClient()`를 사용하여 인증 상태를 확인합니다.
  - 미들웨어(`middleware.ts`)를 활용하여 특정 경로에 대한 접근 제어를 중앙에서 관리합니다.

### 3.3. Prisma
- **마이그레이션:**
  - **규칙:** `schema.prisma` 변경 후, **반드시** 다음 명령어로 마이그레이션 파일을 생성합니다.
    ```bash
    npx prisma migrate dev --name <meaningful-migration-name>
    ```
  - **금지:** `prisma db push`는 개발 초기 단계에서만 제한적으로 사용하고, 협업 시점부터는 사용하지 않습니다.
- **클라이언트 사용:** `lib/prisma.ts`에 정의된 싱글톤 Prisma 클라이언트 인스턴스만 `import`하여 사용합니다.

### 3.4. API 라우트
- **에러 핸들링:**
  - 모든 API 라우트는 `try-catch` 구문으로 감싸야 합니다.
  - Prisma 오류 발생 시, `error.code`를 확인하여 구체적인 HTTP 상태 코드와 메시지를 반환합니다.
    - 예: 고유 제약 조건 위반(`P2002`) -> `409 Conflict`
    - 예: 찾을 수 없는 리소스(`P2025`) -> `404 Not Found`
  - 일반적인 서버 오류는 `500 Internal Server Error`를 반환합니다.

## 4. React Native 확장성
- **목표:** 웹과 앱 간의 코드 재사용성 극대화.
- **규칙:** `web/hooks`와 `web/lib`, `web/types` 디렉토리의 코드는 UI 프레임워크(React DOM)에 대한 의존성을 최소화하여 작성합니다.
- **예시:**
  - **Good:** 순수 데이터 처리 로직을 담은 훅.
    ```typescript
    // web/hooks/useGameData.ts
    export const processGameData = (data) => { ... };
    ```
  - **Bad:** 웹 전용 `alert`나 `toast` 라이브러리를 직접 호출하는 로직. 이는 UI 로직을 다루는 별도의 훅으로 분리해야 합니다.

## 5. 금지 사항
- **`.env` 파일에 민감한 정보 직접 하드코딩 금지.** (`.env.local` 사용)
- **`console.log` 문 남겨두기 금지.** (개발 중에는 사용하되, 커밋 전 제거)
- **규칙 없는 임의의 디렉토리 구조 변경 금지.** (변경 필요시 팀과 논의)
- **RLS 정책 없는 테이블 추가 금지.** 