import { formatRelativeTime } from '@/lib/utils/date';

interface DateTimeDisplayProps {
  date: Date | string;
  showIcon?: boolean;
  className?: string;
}

export function DateTimeDisplay({ date, showIcon = true, className = '' }: DateTimeDisplayProps) {
  return (
    <div className={`flex items-center text-muted-foreground ${className}`}>
      {showIcon && (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 mr-1.5 flex-shrink-0" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      )}
      <span>{formatRelativeTime(date)}</span>
    </div>
  );
}
