'use client';

import { HeroSection } from '@/components/HeroSection';

interface MobileHomePageProps {
  onStartClick: () => void;
  onLearnMoreClick: () => void;
}

export default function MobileHomePage({ onStartClick, onLearnMoreClick }: MobileHomePageProps) {
  return (
    <div className="h-full bg-cyber-black-200">
      <HeroSection onStartClick={onStartClick} onLearnMoreClick={onLearnMoreClick} />
    </div>
  );
}
