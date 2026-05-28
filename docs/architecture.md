# 시스템 아키텍처 및 인프라 구성 가이드 (architecture.md)

이 문서는 G-Club 프로젝트의 물리적/논리적 아키텍처 및 인프라 호스팅 구성을 설명합니다. 무료 인프라 리소스를 극대화하여 안정적인 웹 서비스 및 PWA 애플리케이션을 호스팅하기 위한 설정 방법을 명시합니다.

---

## 🏛️ 전체 시스템 구성도

```mermaid
graph TD
    Client[사용자 / PWA 앱 클라이언트] <-->|HTTPS 443| Nginx[Nginx Reverse Proxy]
    
    subgraph OCI ARM VM (Ubuntu 22.04 LTS)
        Nginx <-->|Proxy Pass 3000| NextJS[Next.js App Server]
        Nginx <-->|Proxy Pass 8000| Kong[Supabase Kong API Gateway]
        
        subgraph Local Supabase (Docker Compose)
            Kong <--> Auth[Supabase Auth / GoTrue]
            Kong <--> Database[(PostgreSQL Database)]
            Kong <--> Realtime[Supabase Realtime Service]
            Kong <--> Storage[Supabase Storage / Local S3 API]
        end
        
        NextJS <-->|Prisma Client direct TCP| Database
        NextJS <-->|API Calls / Realtime Sync| Kong
    end
```

---

## ☁️ 1. OCI (Oracle Cloud Infrastructure) 무료 티어 환경

G-Club은 OCI의 **Always Free** 서비스 요건을 충족하는 컴퓨팅 인프라에서 호스팅됩니다.

* **인스턴스 스펙**: Ampere A1 Compute (ARM64 아키텍처)
  * **OS**: Ubuntu 22.04 LTS 또는 24.04 LTS (ARM64)
  * **CPU**: 최대 4 OCPUs
  * **RAM**: 최대 24 GB RAM
  * **디스크**: 최대 200 GB Block Storage (NVMe 기반)
* **네트워크 설정 (VCN Security List)**:
  * 인그레스 규칙(Ingress Rules)에 **TCP 80 (HTTP)**, **TCP 443 (HTTPS)** 포트를 개방하여 외부 트래픽 허용.
  * 내부 통신 포트(3000, 5432, 8000, 54321 등)는 외부 방화벽(ufw / OCI Security List)에서 차단하고 Nginx를 통해서만 라우팅.

---

## 🐳 2. 로컬 Supabase 컨테이너 구성

비용 절감을 위해 Supabase 공식 Cloud 서비스를 이용하지 않고, OCI VM 내부에 **Self-Hosted Supabase**를 Docker Compose 형태로 구축하여 로컬 호스팅합니다.

* **Supabase 로컬 구성요소**:
  * **PostgreSQL (Database)**: 실제 사용자 데이터, 게시글, 매칭 정보, 경매 데이터 저장 및 Prisma ORM을 통한 직접 쿼리.
  * **Kong (API Gateway)**: 외부 및 내부에서 Supabase API 호출을 단일 포트(기본 8000)로 모으는 게이트웨이.
  * **GoTrue (Auth)**: 이메일 로그인, OAuth 소셜 로그인 등을 로컬에서 처리하는 인증 서비스.
  * **Realtime**: PostgreSQL의 Write-Ahead Log (WAL)를 수신하여 웹 소켓을 통해 클라이언트에 실시간 DB 변경 이벤트를 발행.
* **실행 명령어**:
  ```bash
  # supabase docker-compose 실행 경로
  docker-compose up -d
  ```

---

## 🛡️ 3. Nginx 리버스 프록시 및 SSL 설정

Nginx는 클라이언트로부터 들어오는 외부의 HTTP/HTTPS 요청을 받아 포트에 맞게 내부 프로세스로 라우팅하고, SSL 인증서를 적용하는 중추 역할을 합니다.

* **역할 및 라우팅**:
  * `https://gclub.club/` ➔ Next.js 로컬 서버 (`http://127.0.0.1:3000`)
  * `https://gclub.club/supabase/` ➔ Supabase Kong API Gateway (`http://127.0.0.1:8000`)
* **Nginx 설정 파일 예시 (`/etc/nginx/sites-available/gclub`)**:
  ```nginx
  server {
      server_name gclub.club www.gclub.club;

      # Next.js 프록시
      location / {
          proxy_pass http://127.0.0.1:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
      }

      # Supabase API 프록시 (Realtime 웹소켓 연결 허용)
      location /supabase/ {
          proxy_pass http://127.0.0.1:8000/;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "Upgrade";
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```
* **SSL 설정**:
  * **Let's Encrypt / Certbot**을 활용하여 무료 SSL 인증서를 발급하고 90일 주기 자동 갱신(`cron`)을 활성화합니다.

---

## ⚡ 4. Next.js 로컬 구동 및 PM2 관리

Next.js 서버는 빌드된 프로덕션 번들을 상시 구동하기 위해 프로세스 매니저(`PM2`) 또는 `systemd` 서비스를 사용합니다.

* **프로덕션 구동 및 백그라운드 관리**:
  ```bash
  # 빌드 진행
  npm run build
  
  # PM2를 통한 실행 및 재시작 방지 관리
  pm2 start npm --name "g-club-web" -- run start
  pm2 save
  pm2 startup
  ```
* Next.js는 내부 루프백 IP(`127.0.0.1:3000`)에만 바인딩하여 무단 포트 접근을 차단합니다.

---

## 📱 5. PWA (Progressive Web App) 아키텍처

G-Club은 추후 스토어 앱 출시(iOS App Store, Google Play Store)를 고려하여 하이브리드 성격을 띠는 **PWA** 형태로 구축되어 있습니다.

* **패키지**: `@ducanh2912/next-pwa` 사용.
* **구성 파일**:
  * `web/public/manifest.json`: 앱 이름, 시작 URL, 테마 색상, 아이콘 모음 정의.
  * `web/worker/index.ts` (또는 서비스 워커 파일): 네트워크 오프라인 상태에서도 기본 UI가 표출되도록 캐싱 정책 설정.
* **앱 출시 가이드**:
  * 추후 모바일 앱 래퍼(Capacitor, Bubble, PWABuilder 등)를 활용하여 PWA 소스를 패키징하고 웹뷰 기반 하이브리드 앱으로 빌드하여 네이티브 앱 출시 준비를 진행합니다.
