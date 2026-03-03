'use client';

import Link from 'next/link';
import { MapPin, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CategoryBadge } from './CategoryBadge';
import { CATEGORY_CONFIG, RSVP_CONFIG } from '@/lib/calendar/constants';
import type { CalendarEventCategory, RsvpStatus } from '@/types/models';

interface EventCardEvent {
  id: string;
  title: string;
  startAt: string | Date;
  endAt: string | Date;
  isAllDay: boolean;
  location?: string | null;
  category: CalendarEventCategory;
  status: string;
  color?: string | null;
  maxParticipants?: number | null;
  myRsvp?: RsvpStatus | null;
  _count?: { rsvps: number };
}

interface EventCardProps {
  event: EventCardEvent;
}

export function EventCard({ event }: EventCardProps) {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const categoryConfig = CATEGORY_CONFIG[event.category];
  const dotColor = event.color || categoryConfig?.color || '#6B7280';

  const timeDisplay = event.isAllDay
    ? '종일'
    : `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;

  const dateDisplay = format(start, 'M월 d일 (EEE)', { locale: ko });

  return (
    <Link
      href={`/calendar/${event.id}`}
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:bg-card/80"
    >
      <div
        className="mt-1 w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <CategoryBadge category={event.category} />
          {event.status === 'TENTATIVE' && (
            <span className="text-xs text-yellow-500 font-medium">미확정</span>
          )}
        </div>
        <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {dateDisplay} {timeDisplay}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </span>
          )}
          {event._count && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {event._count.rsvps}
              {event.maxParticipants ? `/${event.maxParticipants}` : ''}명
            </span>
          )}
        </div>
      </div>
      {event.myRsvp && (
        <span
          className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${RSVP_CONFIG[event.myRsvp].bgColor} ${RSVP_CONFIG[event.myRsvp].color}`}
        >
          {RSVP_CONFIG[event.myRsvp].label}
        </span>
      )}
    </Link>
  );
}
