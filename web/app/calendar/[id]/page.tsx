'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Calendar,
  Download,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CategoryBadge } from '@/components/calendar/CategoryBadge';
import { RsvpButton } from '@/components/calendar/RsvpButton';
import { RsvpList } from '@/components/calendar/RsvpList';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { STATUS_CONFIG } from '@/lib/calendar/constants';
import type {
  CalendarEventCategory,
  CalendarEventStatus,
  RsvpStatus,
} from '@/types/models';

interface EventRsvpItem {
  id: string;
  status: RsvpStatus;
  comment: string | null;
  user: { userId: string; name: string; image: string | null };
}

interface EventDetail {
  id: string;
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  category: CalendarEventCategory;
  status: CalendarEventStatus;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  url: string | null;
  sequence: number;
  maxParticipants: number | null;
  color: string | null;
  organizer: { userId: string; name: string; image: string | null };
  rsvps: EventRsvpItem[];
  myRsvp: EventRsvpItem | null;
  isAdmin: boolean;
  _count: { rsvps: number };
  createdAt: string;
  updatedAt: string;
}

export default function CalendarEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const loadingResolvedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [myRsvpStatus, setMyRsvpStatus] = useState<RsvpStatus | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/calendar/events/${id}`);
      const data = await res.json();

      if (data.success) {
        setEvent(data.event);
        setMyRsvpStatus(data.event.myRsvp?.status ?? null);
      } else {
        setError(data.error || '일정을 찾을 수 없습니다.');
      }
    } catch {
      setError('일정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // 로딩이 250ms 이상 걸릴 때만 로딩 UI 표시
  useEffect(() => {
    if (!isLoading) {
      loadingResolvedRef.current = true;
      setShowLoading(false);
      return;
    }
    loadingResolvedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadingResolvedRef.current) setShowLoading(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleDelete = async () => {
    if (!confirm('정말 이 일정을 취소하시겠습니까?')) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/calendar');
        router.refresh();
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRsvpChange = (status: RsvpStatus | null) => {
    setMyRsvpStatus(status);
    fetchEvent();
  };

  const handleDownloadIcs = () => {
    window.open(`/api/calendar/events/${id}/ical`, '_blank');
  };

  if (isLoading && showLoading) {
    return (
      <div className="bg-background flex items-center justify-center py-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (isLoading && !showLoading) {
    return <div className="bg-background min-h-[50vh]" />;
  }

  if (error || !event) {
    return (
      <div className="bg-background">
        <div className="flex flex-col items-center page-content-padding py-16">
          <p className="text-destructive mb-4">{error || '일정을 찾을 수 없습니다.'}</p>
          <Link href="/calendar" className="text-primary hover:underline">
            캘린더로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const statusConfig = STATUS_CONFIG[event.status];
  const isCancelled = event.status === 'CANCELLED';

  return (
    <div className="bg-background">
      <div className="flex flex-col items-center page-content-padding py-8">
        <div className="w-full max-w-2xl">
          {/* 상단 네비 */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              캘린더로
            </Link>
            {event.isAdmin && !isCancelled && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/calendar/${id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  수정
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  취소
                </button>
              </div>
            )}
          </div>

          {/* 일정 정보 */}
          <div className="rounded-2xl border border-border bg-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CategoryBadge category={event.category} size="md" />
              <span className={`text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>

            <h1 className={`text-2xl font-bold mb-4 ${isCancelled ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {event.title}
            </h1>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-foreground font-medium">
                    {format(start, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                  </p>
                  <p className="text-muted-foreground">
                    {event.isAllDay
                      ? '종일'
                      : `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-foreground">{event.location}</p>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-foreground">
                  참석 {event.rsvps.filter((r) => r.status === 'ACCEPTED').length}명
                  {event.maxParticipants ? ` / 최대 ${event.maxParticipants}명` : ''}
                </p>
              </div>

              {event.url && (
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {event.url}
                  </a>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  등록: {event.organizer.name}
                </p>
              </div>
            </div>

            {event.description && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* RSVP */}
          {!isCancelled && (
            <div className="rounded-2xl border border-border bg-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                참석 여부
              </h2>
              <RsvpButton
                eventId={id}
                currentStatus={myRsvpStatus}
                onRsvpChange={handleRsvpChange}
                disabled={isCancelled}
              />
            </div>
          )}

          {/* 참석자 목록 */}
          <div className="rounded-2xl border border-border bg-card p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              참석자 목록
            </h2>
            <RsvpList rsvps={event.rsvps} />
          </div>

          {/* iCal 다운로드 */}
          <button
            onClick={handleDownloadIcs}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Download className="w-4 h-4" />
            .ics 파일 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}
