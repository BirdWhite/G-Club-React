'use client';

import React from 'react';
import { Sparkle } from 'lucide-react';
import { cn } from '@/lib/utils/common';

interface TrackerScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showScore?: boolean;
}

export const TrackerScoreBadge = ({
  score,
  size = 'md',
  className,
  showScore = false,
}: TrackerScoreBadgeProps) => {
  const safeScore = Math.min(1000, Math.max(0, score));
  const percentage = safeScore / 1000;
  
  const getTierColor = (s: number) => {
    if (s < 200) return 'text-slate-400';
    if (s < 400) return 'text-blue-400';
    if (s < 600) return 'text-emerald-400';
    if (s < 800) return 'text-yellow-400';
    return 'text-red-500';
  };

  const colorClass = getTierColor(safeScore);

  const config = {
    sm: { container: 'w-12 h-12', stroke: 3, radius: 21, icon: 'w-6 h-6', inner: 'w-[39px] h-[39px]' },
    md: { container: 'w-20 h-20', stroke: 5, radius: 35, icon: 'w-8 h-8', inner: 'w-[65px] h-[65px]' },
    lg: { container: 'w-32 h-32', stroke: 8, radius: 56, icon: 'w-12 h-12', inner: 'w-[104px] h-[104px]' },
    xl: { container: 'w-48 h-48', stroke: 12, radius: 84, icon: 'w-18 h-18', inner: 'w-[156px] h-[156px]' },
  };

  const { container, stroke, radius, icon, inner } = config[size];
  const sizeValue = (radius + stroke) * 2;
  const center = sizeValue / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage);

  return (
    <div className={cn("relative flex flex-row items-center justify-center select-none gap-3", className)}>
      <div className={cn("relative flex items-center justify-center", container)}>
        {/* Progress SVG */}
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${sizeValue} ${sizeValue}`}
          className="-rotate-90 transform"
        >
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            className="text-secondary"
          />
          
          {/* Progress Bar */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-1000 ease-out", colorClass)}
          />
        </svg>
        
        {/* Inner Badge Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "rounded-full bg-background border border-border flex items-center justify-center shadow-inner",
            inner
          )}>
            <Sparkle className={cn(icon, colorClass)} />
          </div>
        </div>
      </div>
      
      {showScore && (
        <div className="text-left flex flex-col items-start leading-[1.1]">
            <span className={cn("text-lg font-black", colorClass)}>{safeScore}</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase opacity-70">pts</span>
        </div>
      )}
    </div>
  );
};

export default TrackerScoreBadge;
