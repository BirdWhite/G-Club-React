'use client';

import { useState } from 'react';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';

interface CalendarSubscribeProps {
  userId: string;
}

export function CalendarSubscribe({ userId }: CalendarSubscribeProps) {
  const [copied, setCopied] = useState(false);

  const subscribeUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/ical?token=${userId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(subscribeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = subscribeUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <LinkIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">일정 구독</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Google Calendar, Apple Calendar 등에서 이 URL을 구독하면 일정이 자동으로 동기화됩니다.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={subscribeUrl}
          className="flex-1 text-xs bg-background border border-border rounded-md px-3 py-2 text-muted-foreground truncate"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              복사됨
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              복사
            </>
          )}
        </button>
      </div>
    </div>
  );
}
