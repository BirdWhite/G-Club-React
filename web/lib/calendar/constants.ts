import { CalendarEventCategory, CalendarEventStatus, RsvpStatus } from '@/types/models';

export const CATEGORY_CONFIG: Record<
  CalendarEventCategory,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  [CalendarEventCategory.REGULAR]: {
    label: '정기모임',
    color: '#3B82F6',
    bgColor: 'bg-blue-500/15',
    textColor: 'text-blue-500',
  },
  [CalendarEventCategory.TOURNAMENT]: {
    label: '대회',
    color: '#EF4444',
    bgColor: 'bg-red-500/15',
    textColor: 'text-red-500',
  },
  [CalendarEventCategory.EVENT]: {
    label: '이벤트',
    color: '#EC4899',
    bgColor: 'bg-pink-500/15',
    textColor: 'text-pink-500',
  },
  [CalendarEventCategory.SOCIAL]: {
    label: '친목/회식',
    color: '#F59E0B',
    bgColor: 'bg-amber-500/15',
    textColor: 'text-amber-500',
  },
  [CalendarEventCategory.GENERAL]: {
    label: '기타',
    color: '#6B7280',
    bgColor: 'bg-gray-500/15',
    textColor: 'text-gray-500',
  },
};

export const STATUS_CONFIG: Record<
  CalendarEventStatus,
  { label: string; color: string }
> = {
  [CalendarEventStatus.TENTATIVE]: { label: '미확정', color: 'text-yellow-500' },
  [CalendarEventStatus.CONFIRMED]: { label: '확정', color: 'text-green-500' },
  [CalendarEventStatus.CANCELLED]: { label: '취소', color: 'text-red-500' },
};

export const RSVP_CONFIG: Record<
  RsvpStatus,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  [RsvpStatus.ACCEPTED]: {
    label: '참석',
    icon: '✓',
    color: 'text-green-500',
    bgColor: 'bg-green-500/15',
  },
  [RsvpStatus.TENTATIVE]: {
    label: '미정',
    icon: '?',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/15',
  },
  [RsvpStatus.DECLINED]: {
    label: '불참',
    icon: '✕',
    color: 'text-red-500',
    bgColor: 'bg-red-500/15',
  },
};
