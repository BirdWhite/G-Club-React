'use client';

import { CalendarOff } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { EventCard } from './EventCard';
import type { CalendarEventCategory, RsvpStatus } from '@/types/models';

interface EventListEvent {
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

interface EventListProps {
  events: EventListEvent[];
  selectedDate: Date | null;
  isLoading?: boolean;
}

export function EventList({ events, selectedDate, isLoading }: EventListProps) {
  const dateLabel = selectedDate
    ? format(selectedDate, 'M월 d일 (EEE)', { locale: ko })
    : '날짜를 선택하세요';

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        일정을 불러오는 중...
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">{dateLabel}</h2>
      {events.length === 0 ? (
        <div className="py-8 text-center">
          <CalendarOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">등록된 일정이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
