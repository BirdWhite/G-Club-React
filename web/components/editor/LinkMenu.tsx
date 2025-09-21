'use client';

import React from 'react';

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
    <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-col gap-2">
      <div className="text-sm font-medium">
        링크 삽입
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          onKeyDown={handleLinkKeyDown}
          placeholder="URL 입력 (예: https://example.com)"
          className="flex-1 p-2 border border-gray-300 rounded"
          autoFocus
        />
        <button
          onClick={setLink}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
        >
          <span className="material-icons" style={{fontSize: '16px'}}>check</span> 적용
        </button>
        <button
          onClick={() => setShowLinkMenu(false)}
          className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
        >
          취소
        </button>
      </div>
    </div>
  );
};

export { LinkMenu };
