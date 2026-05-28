# 디자인 시스템 및 테마 가이드 (design_system.md)

이 문서는 G-Club 웹서비스의 일관성 있고 수준 높은 비주얼 아이덴티티를 보장하기 위해 개발자 및 AI 디자인 가이드를 제시합니다. G-Club은 사이버펑크(Cyberpunk) 및 게이밍 감성의 미래지향적 다크 테마를 기반으로 디자인되었습니다.

---

G-Club은 임의의 원색(Plain red, blue, green) 대신, Tailwind CSS v4의 `@theme` 및 CSS 커스텀 속성을 사용한 정밀한 조화 색상 세트를 사용합니다. (`web/app/globals.css` 참고)

### 1.1 테마 모드 관리 규칙 (Light & Dark Mode)
G-Club은 시스템 색상 선호도 자동 반영 및 유연한 수동 토글을 위해 `next-themes` 패키지의 `ThemeProvider`를 사용합니다.
* **기본값 (시스템 테마 동기화)**: `ThemeProvider` 설정에 의해 기본적으로 사용자 기기의 시스템 다크/라이트 모드 설정을 추적하여 반영합니다. (`defaultTheme="system"` 및 `enableSystem`)
* **동작 방식**: `next-themes`가 테마 상태에 맞춰 `<html>` 엘리먼트에 자동으로 `.dark` 클래스를 추가하거나 제거합니다. `suppressHydrationWarning`을 `<html>` 엘리먼트에 선언하여 서버/클라이언트 테마 하이드레이션 불일치를 예방합니다.
* **동작 원리**: 테마 모드가 변경되면 CSS 변수값들이 바뀌고, 이를 참조하는 Tailwind CSS v4 유틸리티 클래스(예: `bg-background`, `text-foreground`)들에 의해 화면의 테마가 실시간 전환됩니다. `@media (prefers-color-scheme: dark)` 미디어 쿼리는 더 이상 개별 컴포넌트의 다크 모드를 오버라이드하지 않으며, 오직 `.dark` 클래스에 매핑된 CSS 변수가 싱글 소스로 동작합니다.

### 1.2 사이버펑크 포인트 컬러 (Cyber Palette)
* **일렉트릭 블루 (Cyber Blue)**: `--color-cyber-blue` (`#38BDF8`)
  * 주요 브랜드 색상 및 중요 활성화 상태, 기본 버튼 및 링크 액션에 사용.
* **네온 퍼플 (Cyber Purple)**: `--color-cyber-purple` (`#C252E1`)
  * 세컨더리 포인트 컬러 및 하이라이트, 액센트 요소에 사용.
* **네온 오렌지 (Cyber Orange)**: `--color-cyber-orange` (`#F97316`)
  * 주의(Warning), 실시간 변동, 하이라이팅 요소에 사용.
* **사이버 그레이 (Cyber Gray)**: `--color-cyber-gray` (`#E5E7EB`)
  * 일반 텍스트 및 기본 밝은 텍스트 컬러.
* **사이버 레드 (Cyber Red)**: `--color-cyber-red` (`#EF4444`)
  * 파괴적 작업, 삭제 버튼, 거절 상태 표시.

### 1.3 테마별 변수 매핑 테이블 (Variables mapping)
포인트 컬러 외의 구조적 요소(배경, 카드, 선 등)는 아래와 같이 라이트/다크 모드에 맞춰 자동으로 변환됩니다.

| 테마 변수명 | 라이트 모드 (`:root`) 값 | 다크 모드 (`.dark`) 값 | 주요 사용처 |
| :--- | :--- | :--- | :--- |
| `--background` | `var(--color-neutral-100)` | `var(--color-neutral-900)` | 서비스 전체 배경색 (바닥층) |
| `--foreground` | `var(--color-neutral-900)` | `var(--color-neutral-50)` | 기본 텍스트 및 전경색 |
| `--card` | `var(--color-neutral-50)` | `var(--color-neutral-800)` | 주요 카드 및 섹션 박스 배경 (1층) |
| `--card-foreground` | `var(--color-neutral-900)` | `var(--color-neutral-50)` | 카드 내부 텍스트 색상 |
| `--card-elevated` | `var(--color-neutral-200)` | `var(--color-neutral-700)` | 카드 호버 시 또는 더 깊이 있는 카드 배경 |
| `--border` | `var(--color-neutral-200)` | `var(--color-neutral-800)` | 카드 경계선, 테두리 및 구분선 |
| `--popover` | `var(--color-neutral-50)` | `var(--color-neutral-700)` | 플로팅 메뉴, 모달, 드롭다운 배경 (3층) |
| `--header-background` | `var(--color-neutral-50)` | `var(--color-neutral-950)` | 헤더 컨테이너 배경 (1층) |
| `--muted` | `var(--color-neutral-200)` | `var(--color-neutral-800)` | 비활성 컴포넌트, 배지, 세컨더리 배경 (2층) |
| `--accent` | `var(--color-neutral-200)` | `var(--color-neutral-700)` | 메뉴/리스트 아이템 호버 시 배경색 (3층 호버) |
| `--accent-foreground` | `var(--color-neutral-900)` | `var(--color-neutral-50)` | 호버 시 텍스트 색상 |

### 1.4 UI 깊이감(Depth)과 층(Layer)의 가이드라인
G-Club UI는 시각적 편안함과 구조적 안정감을 위해 최대 **4단계의 깊이층(Elevation)** 규칙을 따릅니다.

* **Layer 0 (Base - 바닥)**: 전체 화면 배경 (`bg-background`)
* **Layer 1 (Surface - 카드/컨테이너)**: 레이아웃 위에 얹히는 큰 카드나 헤더 구역 (`bg-card`, `bg-header-background`)
* **Layer 2 (Component - 상호작용 요소)**: 카드 내에 들어가는 폼, 입력필드, 일반 탭 버튼 (`bg-secondary`, `bg-muted`, `bg-input`)
* **Layer 3 (Overlay/Hover - 최상단 피드백)**: 모달, 팝오버 창 및 호버 피드백 효과 (`bg-popover`, `hover:bg-accent`)

### 1.5 어드민 대시보드 컬러 (Admin Palette)
* 관리자 대시보드 영역에는 다른 구역과 구분하기 위한 파스텔 그린 계열의 테마를 정의하여 사용합니다.
  * `--color-admin-50`: `#E8F5BD` (배경)
  * `--color-admin-500`: `#84B179` (주요 제어 버튼)

### 1.5 Tailwind CSS v4 `@theme` 통합 정의 규칙
Tailwind CSS v4 버전부터는 복수의 theme 지시어를 병렬 선언하지 않고, **단일 `@theme` 블록 내부에 커스텀 유틸리티 키 매핑과 테마 컬러 확장을 모두 통합**하여 작성하는 것이 공식 표준입니다.
* 모든 커스텀 유틸리티(예: `--color-background: var(--background)`)는 `@theme` 블록 내에서 CSS 변수를 직접 매핑하여 정의합니다.
* 임의의 중복 `@theme inline` 또는 분산 선언을 작성해서는 안 됩니다.


---

## ✍️ 2. 타이포그래피 (Typography)

* **메인 폰트**: `Paperlogy-8ExtraBold`
  * 웹 폰트 로드: `https://fastly.jsdelivr.net/gh/projectnoonnu/2408-3@1.0/Paperlogy-8ExtraBold.woff2`
  * 게이밍 무드에 최적화된 굵고 둥근 볼드 타입의 서체로 헤더 및 주요 버튼, 숫자 등에 사용됩니다.
* **폴백 폰트**: `Arial`, `Helvetica`, `sans-serif`

---

## 📱 3. 모바일 퍼스트 & PWA 최적화 레이아웃

G-Club은 모바일 하이브리드 앱 배포를 고려하여 **모바일 뷰포트 우선 설계**가 강제됩니다.

* **네비게이션바 패딩 스페이싱**:
  * 모바일 화면(`max-width: 767px`) 하단에는 고정 하단 네비게이션바가 들어섭니다.
  * 따라서 `main` 콘텐츠 영역은 하단바에 가려지지 않도록 **반드시 모바일에서 `padding-bottom: 4rem`**을 확보하고, 데스크톱(`min-width: 768px`)에서는 `0`으로 제거해 주어야 합니다.
* **페이지 패딩 공통 클래스 (`.page-content-padding`)**:
  * 모바일과 데스크톱에서의 일관된 좌우 간격을 위해 다음 클래스를 메인 콘텐츠 래퍼에 활용합니다.
  * 모바일: `px-8` (2rem)
  * 태블릿 이상: `sm:px-10` (2.5rem)
  * 데스크톱 이상: `lg:px-12` (3rem)
* **모바일 스크롤 및 스무스 모션**:
  * 터치 조작 시 끊김 없는 스크롤을 위해 `.mobile-overscroll` (`-webkit-overflow-scrolling: touch`)을 활용합니다.

---

## ✨ 4. 인터랙션 및 애니메이션 (Micro-interactions)

사용자가 마우스를 올리거나 요소를 탭했을 때 살아있는 듯한 피드백을 전달하여 "프리미엄 사이트" 느낌을 줍니다.

* **기본 카드(`.card`) 및 프로필 카드 호버 효과**:
  * 카드 요소는 그림자나 물리적인 공중 부양(`translateY`) 효과를 사용하지 않고, 호버 시 테두리선 색상(`border-color`)만 은은하게 전환(`transition`)하여 깔끔하고 세련된 플랫 디자인을 유지합니다.
* **메뉴/네비게이션 활성화 및 호버 효과**:
  * 그라데이션이나 입체적인 내부 섀도우/글로우 효과는 시각적으로 과하고 불필요한 복잡함을 피하기 위해 일절 사용하지 않습니다. 활성화 및 호버 시에는 단색 플랫 하이라이트(`bg-primary/10`, `hover:bg-muted/40`)만을 사용하여 극도로 심플하고 세련된 플랫 디자인을 일관되게 유지합니다.
* **버튼 호버 트랜지션**:
  * 모든 액티브 요소(버튼, 링크, 탭)는 `transition-all duration-200 ease-in-out`을 기본 장착하여 반응 속도감을 개선합니다.

---

## 🚨 개발 보조 AI를 위한 테마 적용 요약표
| 변수명 | 추천 적용 태그 / Tailwind 클래스 | 용도 설명 |
| :--- | :--- | :--- |
| `bg-background` | `<body>` / `bg-background` | 서비스 전체 배경색 |
| `bg-card` | 카드 컨테이너 / `bg-card` | 컴포넌트 단위 배경 블록 |
| `text-primary` | 활성화 텍스트 / `text-primary` | 일렉트릭 블루 색상의 강조 텍스트 |
| `text-foreground` | 일반 단락 / `text-foreground` | 기본 사이버 그레이 텍스트 |
| `border-border` | 선, 테두리 / `border-border` | 컨테이너 경계선 구분 |
| `btn-primary` | 주요 버튼 / `btn-primary` | 일렉트릭 블루 배경의 버튼 스타일 |
