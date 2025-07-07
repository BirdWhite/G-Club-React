import { format, isToday, isYesterday, isTomorrow, isThisYear } from 'date-fns';
import { ko } from 'date-fns/locale';

// 게임 시간을 상대적으로 포맷하는 함수
export function formatRelativeTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(targetDate)) {
    return `오늘 ${format(targetDate, 'a h:mm', { locale: ko })}`;
  } else if (isYesterday(targetDate)) {
    return `어제 ${format(targetDate, 'a h:mm', { locale: ko })}`;
  } else if (isTomorrow(targetDate)) {
    return `내일 ${format(targetDate, 'a h:mm', { locale: ko })}`;
  } else if (isThisYear(targetDate)) {
    return format(targetDate, 'M월 d일 (E) a h:mm', { locale: ko });
  } else {
    return format(targetDate, 'yyyy년 M월 d일 (E) a h:mm', { locale: ko });
  }
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
  return format(targetDate, 'a h:mm', { locale: ko });
}

// 현재 날짜와 시간을 YYYY-MM-DDThh:mm 형식으로 반환하는 함수
export function getCurrentDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}
