'use client';

import { HeroSection } from '@/components/HeroSection';

interface DesktopHomePageProps {
  onStartClick: () => void;
  onLearnMoreClick: () => void;
}

export default function DesktopHomePage({ onStartClick, onLearnMoreClick }: DesktopHomePageProps) {
  return (
    <div className="h-full bg-cyber-black-200">
      <HeroSection onStartClick={onStartClick} onLearnMoreClick={onLearnMoreClick} />
    </div>
  );
}
