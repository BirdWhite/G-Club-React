'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileProvider';
import { EventForm } from '@/components/calendar/EventForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { CalendarEventCategory, CalendarEventStatus } from '@/types/models';

interface EventData {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: CalendarEventCategory;
  status: CalendarEventStatus;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  url: string | null;
  maxParticipants: number | null;
  color: string | null;
}

export default function EditCalendarEventPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useProfile();
  const id = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin =
    profile?.role?.name === 'SUPER_ADMIN' || profile?.role?.name === 'ADMIN';

  useEffect(() => {
    if (profile && !isAdmin) {
      router.replace('/calendar');
      return;
    }

    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/calendar/events/${id}`);
        const data = await res.json();
        if (data.success) {
          setEvent(data.event);
        } else {
          setError(data.error || '일정을 찾을 수 없습니다.');
        }
      } catch {
        setError('일정을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (profile && isAdmin) {
      fetchEvent();
    }
  }, [id, profile, isAdmin, router]);

  if (!profile || isLoading) {
    return (
      <div className="bg-background flex items-center justify-center py-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) return null;

  if (error || !event) {
    return (
      <div className="bg-background">
        <div className="flex flex-col items-center page-content-padding py-16">
          <p className="text-destructive mb-4">{error || '일정을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.back()}
            className="text-primary hover:underline"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="flex flex-col items-center page-content-padding py-8">
        <div className="w-full max-w-2xl">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            뒤로
          </button>

          <h1 className="text-2xl font-bold text-foreground mb-6">
            일정 수정
          </h1>

          <EventForm
            mode="edit"
            initialData={{
              id: event.id,
              title: event.title,
              description: event.description ?? undefined,
              location: event.location ?? undefined,
              category: event.category,
              status: event.status,
              startAt: event.startAt,
              endAt: event.endAt,
              isAllDay: event.isAllDay,
              url: event.url ?? undefined,
              maxParticipants: event.maxParticipants,
              color: event.color ?? undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
