'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { formatAbsoluteTime, formatDateOnly, formatTimeOnly } from '@/lib/utils/date';
import { CATEGORY_CONFIG } from '@/lib/calendar/constants';
import type { CalendarEventCategory } from '@/types/models';

interface CalendarEventPreviewItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  category: CalendarEventCategory;
}

interface CalendarPreviewResponse {
  success: boolean;
  events: CalendarEventPreviewItem[];
}

function isOngoing(event: CalendarEventPreviewItem): boolean {
  const now = new Date();
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  return start <= now && now <= end;
}

function formatEventDateTime(event: CalendarEventPreviewItem): string {
  const ongoing = isOngoing(event);
  if (event.isAllDay) {
    return ongoing ? '진행중' : formatDateOnly(event.startAt);
  }
  if (ongoing) {
    return `진행중 (${formatTimeOnly(event.startAt)} ~ ${formatTimeOnly(event.endAt)})`;
  }
  return formatAbsoluteTime(event.startAt);
}

export function CalendarPreview() {
  const [events, setEvents] = useState<CalendarEventPreviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const now = new Date();
        const params = new URLSearchParams({
          startDate: now.toISOString(),
          includeOngoing: 'true',
          limit: '3',
        });

        const response = await fetch(`/api/calendar/events?${params}`);
        const data: CalendarPreviewResponse = await response.json();

        if (response.status === 401) {
          setEvents([]);
          return;
        }

        if (data.success && Array.isArray(data.events)) {
          setEvents(data.events.slice(0, 3));
        }
      } catch {
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="px-0 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xl font-bold text-foreground">
            <CalendarDays className="w-5 h-5" />
            일정
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-0 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/calendar"
          className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors group"
        >
          <CalendarDays className="w-5 h-5" />
          일정
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-6">
          <CalendarDays className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">일정이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const config = CATEGORY_CONFIG[event.category];
            return (
              <Link
                key={event.id}
                href={`/calendar/${event.id}`}
                className="flex min-h-[5.5rem] rounded-lg bg-card border border-border/50 hover:border-border hover:bg-muted/30 transition-all group overflow-hidden p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {event.title}
                    </h3>
                    {config && (
                      <span
                        className={`shrink-0 px-2 py-1 text-xs rounded-full ${config.bgColor} ${config.textColor}`}
                      >
                        {config.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>{formatEventDateTime(event)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
