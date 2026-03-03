'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Plus, CalendarDays } from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { useProfile } from '@/contexts/ProfileProvider';
import { CalendarView } from '@/components/calendar/CalendarView';
import { CalendarSubscribe } from '@/components/calendar/CalendarSubscribe';
import { CATEGORY_CONFIG } from '@/lib/calendar/constants';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { CalendarEventCategory, RsvpStatus } from '@/types/models';

interface CalendarEventItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location: string | null;
  category: CalendarEventCategory;
  status: string;
  color: string | null;
  maxParticipants: number | null;
  myRsvp: RsvpStatus | null;
  _count: { rsvps: number };
}

function getRangeBounds(rangeStart: Date, rangeEnd: Date): { start: Date; end: Date } {
  const start = startOfWeek(rangeStart, { weekStartsOn: 0 });
  const end = endOfWeek(rangeEnd, { weekStartsOn: 0 });
  return { start, end };
}

export default function CalendarPage() {
  const { profile } = useProfile();
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategories, setActiveCategories] = useState<Set<CalendarEventCategory>>(
    new Set(Object.keys(CATEGORY_CONFIG) as CalendarEventCategory[])
  );

  const isAdmin =
    profile?.role?.name === 'SUPER_ADMIN' || profile?.role?.name === 'ADMIN';

  const fetchEvents = useCallback(async (rangeStart: Date, rangeEnd: Date) => {
    try {
      setIsLoading(true);
      const { start, end } = getRangeBounds(rangeStart, rangeEnd);

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: '200',
      });

      const res = await fetch(`/api/calendar/events?${params}`);
      const data = await res.json();

      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('일정 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    fetchEvents(monthStart, monthEnd);
  }, [fetchEvents]);

  const handleRangeChange = useCallback(
    (rangeStart: Date, rangeEnd: Date) => {
      fetchEvents(rangeStart, rangeEnd);
    },
    [fetchEvents]
  );

  const filteredEvents = useMemo(
    () => events.filter((e) => activeCategories.has(e.category)),
    [events, activeCategories]
  );

  const toggleCategory = (cat: CalendarEventCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  if (!profile) {
    return (
      <div className="bg-background flex items-center justify-center py-32">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="flex flex-col items-center page-content-padding py-8">
        <div className="w-full max-w-4xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-8 h-8" />
              캘린더
            </h1>
            {isAdmin && (
              <Link
                href="/calendar/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                일정 추가
              </Link>
            )}
          </div>

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const isActive = activeCategories.has(key as CalendarEventCategory);
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(key as CalendarEventCategory)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    isActive
                      ? `${config.bgColor} ${config.textColor} border-current`
                      : 'border-border text-muted-foreground opacity-50 hover:opacity-80'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* 캘린더 뷰 */}
          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            {isLoading && events.length === 0 ? (
              <div className="flex items-center justify-center h-[500px]">
                <LoadingSpinner />
              </div>
            ) : (
              <CalendarView
                date={date}
                onNavigate={setDate}
                onRangeChange={handleRangeChange}
                events={filteredEvents}
              />
            )}
          </div>

          {/* 구독 URL */}
          <CalendarSubscribe userId={profile.userId} />
        </div>
      </div>
    </div>
  );
}
