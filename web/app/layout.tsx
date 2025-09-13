import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ProfileProvider } from "@/contexts/ProfileProvider";

// 전역 변수 선언
declare global {
  var __cronSchedulerStarted: boolean | undefined;
}

// 서버 시작 시 한 번만 크론 작업 초기화
if (typeof window === 'undefined' && !global.__cronSchedulerStarted) {
  import('@/lib/cron/server-init');
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "얼티메이트",
  description: "부산대학교 게임 동아리 얼티메이트 홈페이지",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <ProfileProvider>
          <div className="h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </ProfileProvider>
      </body>
    </html>
  );
}
