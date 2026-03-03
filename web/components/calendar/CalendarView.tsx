'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, dateFnsLocalizer, type View, type ToolbarProps } from 'react-big-calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  parse,
  startOfWeek,
  getDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { CATEGORY_CONFIG } from '@/lib/calendar/constants';
import type { CalendarEventCategory } from '@/types/models';

const locales = { 'ko': ko };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function CustomToolbar({ label, onNavigate, onView, view, views, localizer }: ToolbarProps<RBCEvent>) {
  const { messages } = localizer;
  const viewNames = Array.isArray(views) ? views : Object.keys(views);

  return (
    <div className="rbc-toolbar">
      <div className="rbc-toolbar-row1">
        <span className="rbc-btn-group">
          <button
            type="button"
            className="rbc-today-btn"
            onClick={() => onNavigate('TODAY')}
          >
            {messages.today}
          </button>
        </span>
        {viewNames.length > 1 && (
          <span className="rbc-btn-group rbc-toolbar-views-group">
            {viewNames.map((name) => (
              <button
                type="button"
                key={name}
                className={`rbc-view-btn ${view === name ? 'rbc-active' : ''}`}
                onClick={() => onView(name as View)}
              >
                {(messages as Record<string, string>)[name] ?? name}
              </button>
            ))}
          </span>
        )}
      </div>
      <span className="rbc-toolbar-label-wrapper rbc-toolbar-row2">
        <button
          type="button"
          className="rbc-nav-chevron"
          onClick={() => onNavigate('PREV')}
          aria-label={String(messages.previous ?? '이전')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="rbc-toolbar-label">{label}</span>
        <button
          type="button"
          className="rbc-nav-chevron"
          onClick={() => onNavigate('NEXT')}
          aria-label={String(messages.next ?? '다음')}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </span>
    </div>
  );
}

export interface RBCEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    category: CalendarEventCategory;
    color: string | null;
    isAllDay: boolean;
    location: string | null;
  };
}

interface CalendarEventSource {
  id: string;
  title: string;
  startAt: string | Date;
  endAt: string | Date;
  isAllDay: boolean;
  location: string | null;
  category: CalendarEventCategory;
  color: string | null;
}

interface CalendarViewProps {
  date: Date;
  view: View;
  onNavigate?: (newDate: Date) => void;
  onView?: (view: View) => void;
  onRangeChange: (rangeStart: Date, rangeEnd: Date) => void;
  events: CalendarEventSource[];
}

function toRBCEvents(source: CalendarEventSource[]): RBCEvent[] {
  return source.map((e) => ({
    id: e.id,
    title: e.title,
    start: new Date(e.startAt),
    end: new Date(e.endAt),
    resource: {
      category: e.category,
      color: e.color,
      isAllDay: e.isAllDay,
      location: e.location,
    },
  }));
}

export function CalendarView({
  date,
  view,
  onNavigate,
  onView,
  onRangeChange,
  events,
}: CalendarViewProps) {
  const router = useRouter();

  const rbcEvents = useMemo(() => toRBCEvents(events), [events]);

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range) && range.length > 0) {
        onRangeChange(range[0], range[range.length - 1]);
      } else if (!Array.isArray(range) && range.start && range.end) {
        onRangeChange(range.start, range.end);
      }
    },
    [onRangeChange]
  );

  const handleNavigate = useCallback(
    (newDate: Date) => {
      onNavigate?.(newDate);
    },
    [onNavigate]
  );

  const handleViewChange = useCallback(
    (newView: View) => {
      onView?.(newView);
    },
    [onView]
  );

  const handleSelectEvent = useCallback(
    (event: RBCEvent) => {
      router.push(`/calendar/${event.id}`);
    },
    [router]
  );

  const eventPropGetter = useCallback(
    (event: RBCEvent) => {
      const category = event.resource?.category;
      const color = event.resource?.color || (category ? CATEGORY_CONFIG[category]?.color : null) || '#6B7280';
      return {
        style: {
          backgroundColor: color,
          borderColor: color,
        },
      };
    },
    []
  );

  return (
    <Calendar
      localizer={localizer}
      events={rbcEvents}
      startAccessor="start"
      endAccessor="end"
      titleAccessor="title"
      culture="ko"
      date={date}
      view={view}
      onNavigate={handleNavigate}
      onView={handleViewChange}
      onRangeChange={handleRangeChange}
      onSelectEvent={handleSelectEvent}
      eventPropGetter={eventPropGetter}
      components={{ toolbar: CustomToolbar }}
      views={['month', 'week', 'day', 'agenda']}
      style={{ height: 500 }}
      messages={{
        today: '오늘',
        previous: '이전',
        next: '다음',
        month: '월',
        week: '주',
        day: '일',
        agenda: '목록',
        date: '날짜',
        time: '시간',
        event: '일정',
        noEventsInRange: '이 기간에 일정이 없습니다.',
      }}
    />
  );
}
