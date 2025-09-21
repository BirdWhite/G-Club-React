'use client';

import { useEffect, useState } from 'react';
import Header from "@/components/Header";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen grid grid-rows-[auto_1fr]">
        <Header />
        <main className="overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr]">
      <Header />
      <main className="overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
