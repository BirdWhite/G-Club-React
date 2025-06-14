'use client';

import { SessionProvider } from 'next-auth/react';

export default function SessionProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      session={undefined}
      refetchInterval={5 * 60} // 5분마다 세션 갱신
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}
