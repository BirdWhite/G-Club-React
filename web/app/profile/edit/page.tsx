'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileProfileEditPage } from '@/components/mobile/MobileProfileEditPage';
import { DesktopProfileEditPage } from '@/components/desktop/DesktopProfileEditPage';

export default function ProfileEditPage() {
  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <>
      {isMobile ? (
        <MobileProfileEditPage />
      ) : (
        <DesktopProfileEditPage />
      )}
    </>
  );
}
