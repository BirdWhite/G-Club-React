# G-Club 프로젝트 개발 표준 (for AI Agent)

## 1. 프로젝트 개요

- **목표:** Next.js, Supabase, Prisma를 활용하여 게임 동아리 웹 서비스를 구축한다.
- **핵심 기술 스택:**
  - **프레임워크:** Next.js (App Router)
  - **백엔드/DB:** Supabase (PostgreSQL, Auth, Realtime, Storage)
  - **ORM:** Prisma
  - **UI:** TailwindCSS

---

## 2. 아키텍처 및 디렉토리 구조

**원칙:** 기능과 역할에 따라 파일을 명확히 분리하여 응집도를 높이고 결합도를 낮춘다.

- `web/app/**`: **페이지 및 API 라우트**.
  - `web/app/(app)`: 사용자 인증이 필요한 페이지 그룹 (향후 사용 예정).
  - `web/app/api/**`: 서버 API 엔드포인트. 기능별로 디렉토리를 생성한다. (예: `api/game-posts/[id]`)
- `web/components/**`: **React 컴포넌트**.
  - `common/`: 여러 페이지/기능에서 공통으로 사용되는 복합 컴포넌트 (예: `Header`, `LoadingSpinner`).
  - `[feature]/`: 특정 기능에 강하게 종속된 컴포넌트 (예: `game-mate/GamePostCard`, `editor/RichTextEditor`).
- `web/hooks/**`: **클라이언트 사이드 로직 및 상태 관리**.
  - UI 관련 로직과 순수 비즈니스 로직(API 호출, 데이터 가공)을 커스텀 훅으로 캡슐화한다.
  - 이름은 `use[FeatureName]` 규칙을 따른다. (예: `useGamePostDetail`)
- `web/lib/**`: **핵심 유틸리티 및 설정**.
  - `lib/prisma.ts`: **Must** `import`하여 사용하는 싱글톤 Prisma 클라이언트.
  - `lib/supabase/client.ts`: **클라이언트 컴포넌트** 전용 Supabase 클라이언트.
  - `lib/supabase/server.ts`: **서버 컴포넌트 및 API 라우트** 전용 Supabase 클라이언트.
  - `lib/auth/serverAuth.ts`: **서버 사이드 인증**을 위한 표준 함수.
- `web/types/**`: **전역 타입 정의**.
  - `types/models.ts`: Prisma 모델을 확장하는 등 전역적으로 사용되는 복합 데이터 타입을 정의한다.

---

## 3. 핵심 개발 원칙 및 규칙

### 3.1. 인증 (Authentication)
- **규칙:** 모든 서버 사이드 로직(API 라우트, 서버 컴포넌트)에서 사용자 인증은 **반드시** `lib/auth/serverAuth.ts`의 `serverAuth()` 함수를 사용해야 한다.
- **Good:**
  ```typescript
  // in web/app/api/.../route.ts
  import { serverAuth } from '@/lib/auth/serverAuth';
  
  export async function POST(req: Request) {
    const { user } = await serverAuth();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }
    // ...
  }
  ```
- **Bad:**
  ```typescript
  // API 라우트에서 직접 Supabase 클라이언트로 세션 가져오기 (지양)
  import { createClient } from '@/lib/supabase/server';
  
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  // 이 방식 대신 serverAuth()를 사용해야 함
  ```

### 3.2. API 라우트 (Route Handlers)
- **규칙 1:** 모든 `export`된 함수(GET, POST 등)는 **반드시** `try...catch` 블록으로 감싸야 한다.
- **규칙 2:** 로직의 시작 부분에서 `serverAuth()`를 호출하여 인증을 먼저 처리해야 한다.
- **규칙 3:** 성공 시 `NextResponse.json(data, { status: 200 })`, 에러 발생 시 `NextResponse.json({ error: message }, { status: <code_number> })` 형태로 일관된 응답을 반환해야 한다.
- **권장:** Prisma 오류 발생 시, `error.code`를 확인하여 구체적인 HTTP 상태 코드를 반환하는 것을 권장한다.
  - 예: 고유 제약 조건 위반(`P2002`) -> `409 Conflict`
  - 예: 찾을 수 없는 리소스(`P2025`) -> `404 Not Found`

### 3.3. 데이터베이스 (Prisma & Supabase)
- **규칙 1 (Prisma):** `schema.prisma` 변경 후, **반드시** `npx prisma migrate dev --name <migration-name>` 명령으로 마이그레이션을 생성해야 한다. `prisma db push`는 사용하지 않는다.
- **규칙 2 (Supabase RLS):** **모든 신규 테이블은 생성과 동시에 RLS를 활성화하고 정책(Policy)을 수립해야 한다.** 프로덕션 환경에 RLS가 비활성화된 테이블이 있어서는 **절대** 안 된다.

### 3.4. 컴포넌트 & 상태 관리
- **규칙 1:** 모든 컴포넌트는 **서버 컴포넌트**를 기본으로 작성한다. `useState`, `useEffect`, 이벤트 핸들러 등 브라우저 API가 필요할 때만 파일 상단에 `'use client'`를 선언한다.
- **규칙 2:** 클라이언트 컴포넌트의 데이터 페칭 및 상태 관리는 `web/hooks/**`에 위치한 커스텀 훅으로 캡슐화한다.
- **패턴:** 현재 프로젝트는 `useState`, `useEffect`, `fetch` API를 사용하는 것을 표준 데이터 페칭 패턴으로 한다.

---

## 4. 타입 시스템 (TypeScript)
- **규칙:** Prisma 모델과 관계(relation)를 포함하는 복잡한 데이터 타입은 `web/types/models.ts`에 정의하여 재사용한다.
- **Good:**
  ```typescript
  // web/types/models.ts
  import { Prisma } from '@prisma/client';
  
  export type PostWithAuthor = Prisma.PostGetPayload<{
    include: { author: true };
  }>;
  
  // web/app/some-page.tsx
  import { PostWithAuthor } from '@/types/models';
  
  function PostCard({ post }: { post: PostWithAuthor }) { ... }
  ```
- **Bad:**
  ```typescript
  // 컴포넌트 파일에 직접 복잡한 타입 작성 (지양)
  import { Prisma } from '@prisma/client';
  
  function PostCard({ post }: { post: Prisma.PostGetPayload<{ include: { author: true } }> }) { ... }
  ```

---

## 5. 금지 사항
- `.env` 파일에 민감한 정보 직접 하드코딩 금지 (`.env.local` 사용).
- `console.log` 문을 커밋에 포함시키지 말 것.
- RLS 정책 없는 테이블 추가 금지.
- `serverAuth()`를 사용하지 않는 서버 사이드 인증 로직 작성 금지. 