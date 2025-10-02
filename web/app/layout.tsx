import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ProfileProvider } from "@/contexts/ProfileProvider";
import { PWAInstaller } from "@/components/common/PWAInstaller";
import { PWAManager } from "@/components/PWAManager";
import { ClientLayout } from "@/components/layout/ClientLayout";

// 전역 변수 선언
declare global {
  var __cronSchedulerStarted: boolean | undefined;
}

// 서버 시작 시 한 번만 크론 작업 초기화
if (typeof window === 'undefined' && !global.__cronSchedulerStarted) {
  import('@/lib/cron/server-init');
}

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',  // 폰트 로드 전에도 텍스트 표시
  preload: true,    // 폰트 미리 로드
});

export const metadata: Metadata = {
  title: "얼티메이트",
  description: "부산대학교 게임 동아리 얼티메이트 홈페이지",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "얼티메이트",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "얼티메이트",
    title: "얼티메이트 - 부산대학교 게임 동아리",
    description: "부산대학교 게임 동아리 얼티메이트 홈페이지",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    shortcut: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="얼티메이트" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
      </head>
      <body className={inter.className}>
        <ProfileProvider>
          <PWAManager>
            <ClientLayout>
              {children}
            </ClientLayout>
            <PWAInstaller />
          </PWAManager>
        </ProfileProvider>
      </body>
    </html>
  );
}
