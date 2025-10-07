'use client';

import { HeroSection } from '@/components/common/HeroSection';

interface DesktopHomePageProps {
  onStartClick: () => void;
  onLearnMoreClick: () => void;
}

export function DesktopHomePage({}: DesktopHomePageProps) {
  return (
    <div className="h-full bg-background">
      <HeroSection />
    </div>
  );
}
