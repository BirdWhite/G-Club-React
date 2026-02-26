'use client';

import React from 'react';
import { Input } from '@/components/ui/input';

export interface LinkMenuProps {
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  handleLinkKeyDown: (e: React.KeyboardEvent) => void;
  setLink: () => void;
  setShowLinkMenu: (show: boolean) => void;
}

const LinkMenu = ({
  linkUrl,
  setLinkUrl,
  handleLinkKeyDown,
  setLink,
  setShowLinkMenu
}: LinkMenuProps) => {
  return (
    <div className="bg-muted border-b border-border p-2 flex flex-col gap-2">
      <div className="text-sm font-medium text-foreground">
        링크 삽입
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          onKeyDown={handleLinkKeyDown}
          placeholder="URL 입력 (예: https://example.com)"
          className="flex-1"
          autoFocus
        />
        <button
          onClick={setLink}
          className="px-3 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 flex items-center gap-1 shrink-0"
        >
          <span className="material-icons" style={{fontSize: '16px'}}>check</span> 적용
        </button>
        <button
          onClick={() => setShowLinkMenu(false)}
          className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-accent shrink-0"
        >
          취소
        </button>
      </div>
    </div>
  );
};

export { LinkMenu };
