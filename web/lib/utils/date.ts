import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isTomorrow,
  isThisYear,
  differenceInCalendarDays,
  differenceInYears,
} from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 상대/절대 시간을 상황에 맞게 포맷하는 함수
 * - 65분 이내: n분 후, n분 전
 * - 오늘: 오늘 HH:mm
 * - 어제: 어제 HH:mm
 * - 내일: 내일 HH:mm
 * - n일: n일 후/전 (E) HH:mm
 * - 30일 이상: M월 d일 (E) HH:mm
 * - 1년 이상: y년 M월 d일 (E) HH:mm
 */
export function formatRelativeTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffMinutes = Math.abs(diffMs) / (60 * 1000);
  const timeStr = format(targetDate, 'HH:mm', { locale: ko });

  if (diffMinutes <= 65) {
    return formatDistanceToNow(targetDate, { addSuffix: true, locale: ko });
  }
  if (differenceInYears(targetDate, now) !== 0) {
    return format(targetDate, 'y년 M월 d일 (E) HH:mm', { locale: ko });
  }
  const daysDiff = differenceInCalendarDays(targetDate, now);
  if (Math.abs(daysDiff) >= 30) {
    return format(targetDate, 'M월 d일 (E) HH:mm', { locale: ko });
  }
  if (isTomorrow(targetDate)) {
    return `내일 ${timeStr}`;
  }
  if (isToday(targetDate)) {
    return `오늘 ${timeStr}`;
  }
  if (isYesterday(targetDate)) {
    return `어제 ${timeStr}`;
  }
  if (daysDiff > 0) {
    return `${daysDiff}일 후 ${format(targetDate, '(E) HH:mm', { locale: ko })}`;
  }
  return `${Math.abs(daysDiff)}일 전 ${format(targetDate, '(E) HH:mm', { locale: ko })}`;
}

/**
 * 절대시간 포맷 (상세 페이지용)
 * - 오늘/어제/내일: 오늘 HH:mm, 어제 HH:mm, 내일 HH:mm
 * - 올해: M월 d일 (E) HH:mm
 * - 그 외: y년 M월 d일 (E) HH:mm
 */
export function formatAbsoluteTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const timeStr = format(targetDate, 'HH:mm', { locale: ko });
  if (isToday(targetDate)) {
    return `오늘 ${timeStr}`;
  }
  if (isYesterday(targetDate)) {
    return `어제 ${timeStr}`;
  }
  if (isTomorrow(targetDate)) {
    return `내일 ${timeStr}`;
  }
  if (isThisYear(targetDate)) {
    return format(targetDate, 'M월 d일 (E) HH:mm', { locale: ko });
  }
  return format(targetDate, 'y년 M월 d일 (E) HH:mm', { locale: ko });
}

// 날짜만 포맷하는 함수 (시간 제외)
export function formatDateOnly(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(targetDate)) {
    return '오늘';
  } else if (isYesterday(targetDate)) {
    return '어제';
  } else if (isTomorrow(targetDate)) {
    return '내일';
  } else if (isThisYear(targetDate)) {
    return format(targetDate, 'M월 d일 (E)', { locale: ko });
  } else {
    return format(targetDate, 'yyyy년 M월 d일 (E)', { locale: ko });
  }
}

// 시간만 포맷하는 함수
export function formatTimeOnly(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return format(targetDate, 'HH:mm', { locale: ko });
}

// 현재 날짜와 시간을 YYYY-MM-DDThh:mm 형식으로 반환하는 함수
export function getCurrentDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}
