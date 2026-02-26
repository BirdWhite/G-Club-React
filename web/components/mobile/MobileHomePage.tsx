'use client';

import { HeroSection } from '@/components/common/HeroSection';

interface MobileHomePageProps {
  onStartClick: () => void;
  onLearnMoreClick: () => void;
}

export function MobileHomePage({}: MobileHomePageProps) {
  return (
    <div className="bg-background pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom)))] md:pb-0">
      <HeroSection />
    </div>
  );
}
