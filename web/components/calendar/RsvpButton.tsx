'use client';

import { useState } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RsvpStatus } from '@/types/models';

interface RsvpButtonProps {
  eventId: string;
  currentStatus: RsvpStatus | null;
  onRsvpChange: (status: RsvpStatus | null) => void;
  disabled?: boolean;
}

const RSVP_OPTIONS = [
  {
    status: RsvpStatus.ACCEPTED,
    label: '참석',
    icon: Check,
    activeClasses: 'bg-green-500 text-white border-green-500',
    hoverClasses: 'hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-500',
  },
  {
    status: RsvpStatus.TENTATIVE,
    label: '미정',
    icon: HelpCircle,
    activeClasses: 'bg-yellow-500 text-white border-yellow-500',
    hoverClasses: 'hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-yellow-500',
  },
  {
    status: RsvpStatus.DECLINED,
    label: '불참',
    icon: X,
    activeClasses: 'bg-red-500 text-white border-red-500',
    hoverClasses: 'hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500',
  },
] as const;

export function RsvpButton({
  eventId,
  currentStatus,
  onRsvpChange,
  disabled = false,
}: RsvpButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (status: RsvpStatus) => {
    if (isLoading || disabled) return;
    setIsLoading(true);

    try {
      if (currentStatus === status) {
        const res = await fetch(`/api/calendar/events/${eventId}/rsvp`, {
          method: 'DELETE',
        });
        if (res.ok) onRsvpChange(null);
      } else {
        const res = await fetch(`/api/calendar/events/${eventId}/rsvp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.ok) onRsvpChange(status);
      }
    } catch (error) {
      console.error('RSVP 처리 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {RSVP_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = currentStatus === option.status;

        return (
          <button
            key={option.status}
            onClick={() => handleClick(option.status)}
            disabled={isLoading || disabled}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all',
              isActive
                ? option.activeClasses
                : `border-border text-muted-foreground ${option.hoverClasses}`,
              (isLoading || disabled) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className="w-4 h-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
