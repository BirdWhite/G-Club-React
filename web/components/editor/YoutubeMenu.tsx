'use client';

import { Editor } from '@tiptap/react';
import React from 'react';

export interface YoutubeMenuProps {
  editor: Editor | null;
  youtubeUrl: string;
  setYoutubeUrl: (url: string) => void;
  setShowYoutubeMenu: (show: boolean) => void;
}

const YoutubeMenu = ({ editor, youtubeUrl, setYoutubeUrl, setShowYoutubeMenu }: YoutubeMenuProps) => {
  // 유튜브 URL에서 영상 ID를 추출하는 함수
  const extractYoutubeId = (url: string): string | null => {
    try {
      const trimmedUrl = url.trim();
      
      // 입력이 이미 영상 ID만 있는 경우 (11자리 영숫자 문자열)
      if (/^[\w-]{11}$/.test(trimmedUrl)) {
        return trimmedUrl;
      }
      
      // youtu.be 짧은 URL 형식 (https://youtu.be/VIDEO_ID)
      if (trimmedUrl.includes('youtu.be')) {
        const match = trimmedUrl.match(/youtu\.be\/([^\/?&]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // 일반 YouTube URL (https://www.youtube.com/watch?v=VIDEO_ID)
      if (trimmedUrl.includes('youtube.com/watch')) {
        const match = trimmedUrl.match(/[?&]v=([^&#]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // YouTube 임베드 URL (https://www.youtube.com/embed/VIDEO_ID)
      if (trimmedUrl.includes('/embed/')) {
        const match = trimmedUrl.match(/\/embed\/([^\/\?&"']+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // iframe 코드 처리
      if (trimmedUrl.includes('<iframe') && trimmedUrl.includes('youtube')) {
        const srcMatch = trimmedUrl.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
          // 직접 YouTube 임베드 URL에서 ID 추출
          const embedMatch = srcMatch[1].match(/(?:youtube\.com\/embed\/|\/embed\/|\/v\/|youtu\.be\/)([^\/\?&]+)/i);
          if (embedMatch && embedMatch[1]) {
            return embedMatch[1];
          }
          return extractYoutubeId(srcMatch[1]);
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // 유튜브 삽입 처리 함수
  const insertYoutube = () => {
    if (!editor) {
      alert('에디터가 초기화되지 않았습니다.');
      return;
    }
    
    const videoId = extractYoutubeId(youtubeUrl);
    
    if (videoId) {
      try {
        editor.commands.setYoutubeVideo({
          src: `https://www.youtube.com/embed/${videoId}`,
          width: 640,
          height: 360,
        });
        
        setShowYoutubeMenu(false);
        setYoutubeUrl('');
      } catch (error) {
        alert('유튜브 비디오 삽입 중 오류가 발생했습니다.');
      }
    } else {
      alert('유효한 유튜브 URL이 아닙니다. 다른 형식의 URL을 시도해보세요.');
    }
  };
  
  // 키 입력 이벤트 처리
  const handleYoutubeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertYoutube();
    }
  };

  return (
    <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-col gap-2">
      <div className="text-sm font-medium mb-1">
        유튜브 영상 삽입
      </div>
      <div className="text-xs text-gray-600">
        유튜브 영상 URL 또는 임베드 코드를 붙여넣어주세요.
      </div>
      <input
        type="text"
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
        onKeyDown={handleYoutubeKeyDown}
        placeholder="예: https://www.youtube.com/watch?v=xtEa91AX8Ys"
        className="flex-1 p-2 border border-gray-300 rounded"
        autoFocus
      />
      <div className="flex justify-end gap-2 mt-1">
        <button
          onClick={insertYoutube}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 flex items-center gap-1"
        >
          <span className="material-icons" style={{fontSize: '16px'}}>add</span> 삽입
        </button>
        <button
          onClick={() => setShowYoutubeMenu(false)}
          className="px-3 py-1 bg-gray-300 text-sm rounded hover:bg-gray-400"
        >
          취소
        </button>
      </div>
    </div>
  );
};

export { YoutubeMenu };
