import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ProfileProvider } from "@/contexts/ProfileProvider";

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
          <Header />
          <main>
            {children}
          </main>
        </ProfileProvider>
      </body>
    </html>
  );
}
