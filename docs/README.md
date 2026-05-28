# G-Club 프로젝트 개발 가이드 및 문서

G-Club은 게임 동아리원들의 활발한 소통과 편의를 돕기 위해 만든 웹 애플리케이션입니다.
이 문서 폴더(`docs/`)는 프로젝트의 시스템 구조, 코딩 규칙, 디자인 가이드라인, 핵심 기능 명세를 저장하여 개발자 및 AI 개발 보조 솔루션이 개발 패턴을 유지할 수 있도록 하는 **단일 진실 공급원(Single Source of Truth)**입니다.

---

## 🚀 프로젝트 개요
* **서비스명**: G-Club
* **주요 타겟**: 게임 동아리 회원 (게임 메이트 구하기, 내전 팀 구성 및 경매, 공지사항 등)
* **인프라 철학**: Oracle Cloud Infrastructure(OCI) 무료 티어의 ARM Ubuntu VM 환경을 활용하여 추가 비용 없이 인프라 전체를 로컬 도커/프로세스 단위로 구동(Supabase, Next.js, Nginx)하는 가성비 극대화 아키텍처.
* **향후 로드맵**: Progressive Web App(PWA) 기술을 적극 도입하여, 안드로이드/iOS 모바일 앱 출시까지 고려한 멀티 플랫폼 지향 설계.

---

## 📂 문서 가이드 및 구조
각 마크다운 파일을 통해 필요한 가이드라인과 설계 내용을 확인할 수 있습니다.

### 1. [시스템 아키텍처 및 인프라 (architecture.md)](file:///c:/Users/NYS/Documents/GitHub/G-Club-React/docs/architecture.md)
* OCI 무료 티어 ARM Ubuntu VM 가상 서버 내부 구조.
* local Supabase 컨테이너 설정 및 Next.js & Nginx 리버스 프록시 연동.
* PWA(Progressive Web App)를 통한 모바일 하이브리드 앱 출시 전략.

### 2. [코딩 컨벤션 및 개발 규칙 (coding_conventions.md)](file:///c:/Users/NYS/Documents/GitHub/G-Club-React/docs/coding_conventions.md)
* Next.js 15 App Router & React Server Components(RSC) 개발 기준.
* Prisma ORM 데이터베이스 접근 및 쿼리/트랜잭션 가이드.
* Supabase Realtime을 통한 데이터 실시간 동기화 패턴.
* Zod와 react-hook-form 유효성 검증 컨벤션.

### 3. [디자인 시스템 및 테마 가이드 (design_system.md)](file:///c:/Users/NYS/Documents/GitHub/G-Club-React/docs/design_system.md)
* Tailwind CSS v4 기반의 CSS 커스텀 속성(`@theme`)과 컬러 파레트 (`cyber-blue`, `cyber-purple`, `cyber-orange` 등).
* 게이밍/사이버펑크 무드를 연출하기 위한 타이포그래피(`Paperlogy` 폰트) 및 UI 디자인 요소.
* 모바일 및 PWA 사용성을 극대화하기 위한 반응형 뷰포트 설계 가이드라인.

### 4. [기능 명세 및 비즈니스 로직 (features.md)](file:///c:/Users/NYS/Documents/GitHub/G-Club-React/docs/features.md)
* **게임 메이트 구하기**: 모집 글 등록, 상태 실시간 업데이트, 시작 시간 경과 시 자동 만료 처리 로직.
* **팀 경매 시스템(대회용)**: `AuctionBoard` 컴포넌트의 포인트 입찰 및 팀 선발 경매 메커니즘.
* **공지사항 및 일정 관리**: 동아리 행사 캘린더 및 공지 글 작성.
* **푸시 알림**: 웹 푸시 알림 및 서비스 워커를 활용한 하이브리드 모바일 앱 뼈대 구성.

---

> [!IMPORTANT]
> **AI 개발 어시스턴트 유의사항:**
> G-Club 프로젝트에 코드를 작성하거나 수정을 시도할 때는 반드시 본 `docs/` 폴더 내 가이드라인 문서들을 사전에 완독하고 규칙을 준수해야 합니다. 임의로 구조를 변경하거나 테마 컬러를 변칙적으로 선언해서는 안 됩니다.
