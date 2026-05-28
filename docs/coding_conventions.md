# 코딩 컨벤션 및 개발 규칙 가이드 (coding_conventions.md)

이 문서는 G-Club 프로젝트의 일관된 코드 품질 유지와 오류 방지를 위해 개발자 및 AI 코딩 어시스턴트가 반드시 준수해야 하는 코딩 컨벤션과 아키텍처 규칙을 명시합니다.

---

## ⚡ 1. Next.js 15 & React 개발 규칙

Next.js 15 App Router 구조에 맞춰 Server Component와 Client Component를 명확하게 나누어 구현합니다.

### 1.1 Server Components (RSC) vs Client Components
* **기본값 (RSC)**: `web/app/` 내부의 모든 페이지(`page.tsx`, `layout.tsx`)는 특별한 상호작용이 없는 한 기본적으로 **React Server Component**로 구현합니다.
  * 데이터 베이스 조회(Prisma ORM 호출) 및 SEO 메타데이터 작성은 RSC 내에서 직접 수행합니다.
* **클라이언트 컴포넌트 (`'use client'`)**:
  * 사용자의 입력(버튼 클릭, 폼 전송, 상태 제어 등)이 수반되는 컴포넌트는 최상단에 `'use client';` 지시어를 명시합니다.
  * 실시간 웹소켓 구독(Supabase Realtime) 및 React 훅(`useState`, `useEffect`, `useContext`) 사용이 필요한 컴포넌트는 클라이언트 컴포넌트로 분리합니다.

### 1.2 서버 액션 (Server Actions)
* 폼 전송, 데이터 등록/수정/삭제 등의 Mutation 작업은 Next.js의 **Server Actions**를 사용합니다.
* 예시: `web/app/auction/actions.ts` 내에 `'use server';`를 명시하고 데이터베이스 갱신 함수(`placeBid` 등)를 정의하여 클라이언트에서 호출합니다.

---

## 🗄️ 2. Prisma ORM 사용 및 데이터베이스 접근 규칙

데이터베이스(PostgreSQL) 조작은 Prisma ORM을 사용하며, 다음 규칙을 반드시 준수합니다.

* **싱글톤 클라이언트 인스턴스 사용**:
  * 중복된 Prisma 연결로 인한 Connection Pool 고갈 및 핫 리로딩 에러를 방지하기 위해, 반드시 `web/lib/database/prisma.ts`에 정의된 싱글톤 인스턴스를 가져와 사용합니다.
  * **올바른 예**:
    ```typescript
    import prisma from '@/lib/database/prisma';
    ```
  * **잘못된 예**:
    ```typescript
    import { PrismaClient } from '@prisma/client';
    const prisma = new PrismaClient(); // 절대 금지
    ```
* **데이터 모델 변경**:
  * `web/prisma/schema.prisma` 파일을 수정한 경우, `npx prisma generate`와 `npx prisma db push`를 사용하여 변경사항을 로컬 DB에 반영해야 합니다.
  * 테스트 데이터 구축을 위해 `web/prisma/seed.ts` 파일 및 `npm run db:seed` 스크립트를 관리합니다.

---

## 🟢 3. Supabase 연동 및 실시간 통신(Realtime) 규칙

Supabase는 인증(Auth) 및 실시간 소켓 연동(Realtime), 파일 스토리지(Storage)를 처리하는 데 사용됩니다.

### 3.1 클라이언트 초기화 규칙
* **클라이언트 사이드 컴포넌트** (`'use client'`):
  ```typescript
  import { createClient } from '@/lib/database/supabase/client';
  const supabase = createClient();
  ```
* **서버 사이드 컴포넌트 및 서버 액션**:
  ```typescript
  import { createServerClient } from '@/lib/database/supabase/server';
  const supabase = await createServerClient();
  ```

### 3.2 Supabase Realtime 구독 및 해제
* 실시간 테이블 감시(예: 입찰 내역 갱신, 게임메이트 글 실시간 업데이트) 시, 컴포넌트 언마운트 시점에 **반드시 리스너를 구독 해제(Unsubscribe)** 해 주어야 메모리 누수를 방지할 수 있습니다.
* **올바른 구현 패턴**:
  ```typescript
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('table-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'AuctionBid' },
        (payload) => {
          // 실시간 데이터 변경 처리 로직
        }
      )
      .subscribe();

    // 언마운트 시 자동 해제
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  ```

---

## 📂 4. 폴더 구조 및 컴포넌트 개발 가이드

컴포넌트의 역할과 도메인에 따라 엄격하게 분류하여 파일을 구성합니다.

* **`web/components/ui/`**: Shadcn UI 등으로 생성된 기본 프리미티브 컴포넌트들을 위치시킵니다. (임의 수정 최소화)
* **`web/components/[domain]/`**: 도메인별 기능적 컴포넌트들을 묶어 관리합니다.
  * `auction/`: 경매용 컴포넌트 (`AuctionBoard.tsx`, `AuctionTimer.tsx` 등)
  * `game-mate/`: 메이트 찾기용 컴포넌트 (`MatePostCard.tsx` 등)
  * `common/`: 공통 레이아웃, 헤더, 로딩 컴포넌트 등
* **데스크톱 / 모바일 전용 분리**:
  * PWA 대응 과정에서 레이아웃 차이가 매우 극심한 경우 `components/desktop/`와 `components/mobile/`로 전용 뷰 컴포넌트를 분리하여 개발합니다.

---

## 📝 5. 폼 처리 및 입력 유효성 검증

* 사용자 입력 및 폼 유효성 검증에는 `react-hook-form`과 `zod` 스키마 빌더를 결합하여 개발합니다.
* 폼 데이터 스키마는 클라이언트 단과 서버 액션 양측에서 이중 검증하여 데이터의 신뢰성을 보장합니다.
