'use client';

import { HeroSection } from '@/components/common/HeroSection';

interface MobileHomePageProps {
  onStartClick: () => void;
  onLearnMoreClick: () => void;
}

export function MobileHomePage({ onStartClick, onLearnMoreClick }: MobileHomePageProps) {
  return (
    <div className="h-full bg-background">
      <HeroSection onStartClick={onStartClick} onLearnMoreClick={onLearnMoreClick} />
    </div>
  );
}
