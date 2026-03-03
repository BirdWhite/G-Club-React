'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarEventCategory, CalendarEventStatus } from '@/types/models';
import { CATEGORY_CONFIG, STATUS_CONFIG } from '@/lib/calendar/constants';

interface EventFormData {
  id?: string;
  title?: string;
  description?: string;
  location?: string;
  category?: CalendarEventCategory;
  status?: CalendarEventStatus;
  startAt?: string;
  endAt?: string;
  isAllDay?: boolean;
  url?: string;
  maxParticipants?: number | null;
  color?: string;
}

interface EventFormProps {
  initialData?: EventFormData;
  mode: 'create' | 'edit';
}

export function EventForm({ initialData, mode }: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [category, setCategory] = useState<CalendarEventCategory>(
    initialData?.category || CalendarEventCategory.GENERAL
  );
  const [eventStatus, setEventStatus] = useState<CalendarEventStatus>(
    initialData?.status || CalendarEventStatus.CONFIRMED
  );
  const [isAllDay, setIsAllDay] = useState(initialData?.isAllDay || false);
  const [startAt, setStartAt] = useState(
    initialData?.startAt
      ? new Date(initialData.startAt).toISOString().slice(0, 16)
      : ''
  );
  const [endAt, setEndAt] = useState(
    initialData?.endAt
      ? new Date(initialData.endAt).toISOString().slice(0, 16)
      : ''
  );
  const [url, setUrl] = useState(initialData?.url || '');
  const [maxParticipants, setMaxParticipants] = useState<string>(
    initialData?.maxParticipants?.toString() || ''
  );

  const formatLocalDatetime = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  };

  const handleStartChange = (newStart: string) => {
    setStartAt(newStart);
    if (isAllDay) {
      setEndAt(newStart.slice(0, 10));
    } else {
      const startDate = new Date(newStart);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      setEndAt(formatLocalDatetime(endDate));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      let startDate: Date;
      let endDate: Date;

      if (isAllDay) {
        const startStr = startAt.slice(0, 10);
        const endStr = endAt.slice(0, 10);
        startDate = new Date(startStr + 'T00:00:00.000');
        endDate = new Date(endStr + 'T00:00:00.000');
        if (endStr === startStr) {
          endDate = new Date(endStr + 'T23:59:59.999');
        }
      } else {
        startDate = new Date(startAt);
        endDate = new Date(endAt);
      }

      const payload = {
        title,
        description: description || null,
        location: location || null,
        category,
        status: eventStatus,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        isAllDay,
        url: url || null,
        maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        color: CATEGORY_CONFIG[category]?.color || null,
      };

      const apiUrl =
        mode === 'create'
          ? '/api/calendar/events'
          : `/api/calendar/events/${initialData?.id}`;

      const res = await fetch(apiUrl, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '오류가 발생했습니다.');
        return;
      }

      const eventId = mode === 'create' ? data.event.id : initialData?.id;
      router.push(`/calendar/${eventId}`);
      router.refresh();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* 제목 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          제목 <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="일정 제목을 입력하세요"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* 카테고리 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          카테고리
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key as CalendarEventCategory)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                category === key
                  ? `${config.bgColor} ${config.textColor} border-current`
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* 종일 토글 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isAllDay}
          onClick={() => setIsAllDay(!isAllDay)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            isAllDay ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
              isAllDay ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-sm text-foreground">종일</span>
      </div>

      {/* 시작/종료 시간 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            시작 <span className="text-destructive">*</span>
          </label>
          <input
            type={isAllDay ? 'date' : 'datetime-local'}
            value={isAllDay ? startAt.slice(0, 10) : startAt}
            onChange={(e) => handleStartChange(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            종료 <span className="text-destructive">*</span>
          </label>
          <input
            type={isAllDay ? 'date' : 'datetime-local'}
            value={isAllDay ? endAt.slice(0, 10) : endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* 장소 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          장소
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="장소를 입력하세요 (선택)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* 설명 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          설명
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="일정에 대한 설명을 입력하세요 (선택)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      {/* 최대 참석 인원 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          최대 참석 인원
        </label>
        <input
          type="number"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value)}
          min={1}
          placeholder="무제한 (비워두면 제한 없음)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* 관련 링크 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          관련 링크
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* 일정 상태 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          상태
        </label>
        <div className="flex gap-2">
          {Object.entries(STATUS_CONFIG)
            .filter(([key]) => key !== 'CANCELLED')
            .map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => setEventStatus(key as CalendarEventStatus)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  eventStatus === key
                    ? `${config.color} border-current bg-current/10`
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                {config.label}
              </button>
            ))}
        </div>
      </div>

      {/* 제출 */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-accent transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting
            ? '처리 중...'
            : mode === 'create'
            ? '일정 등록'
            : '일정 수정'}
        </button>
      </div>
    </form>
  );
}
