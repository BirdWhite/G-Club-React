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
      // URL 형식이 아닐 경우 빈 공간 제거
      const trimmedUrl = url.trim();
      
      // 입력이 이미 영상 ID만 있는 경우 (11자리 영숫자 문자열)
      if (/^[\w-]{11}$/.test(trimmedUrl)) {
        console.log('유튜브 ID 직접 입력된 경우:', trimmedUrl);
        return trimmedUrl;
      }
      
      // youtu.be 짧은 URL 형식 (https://youtu.be/VIDEO_ID)
      if (trimmedUrl.includes('youtu.be')) {
        const match = trimmedUrl.match(/youtu\.be\/([^\/?&]+)/);
        if (match && match[1]) {
          console.log('youtu.be 형식에서 추출된 ID:', match[1]);
          return match[1];
        }
      }
      
      // 일반 YouTube URL (https://www.youtube.com/watch?v=VIDEO_ID)
      if (trimmedUrl.includes('youtube.com/watch')) {
        const match = trimmedUrl.match(/[?&]v=([^&#]+)/);
        if (match && match[1]) {
          console.log('일반 유튜브 URL에서 추출된 ID:', match[1]);
          return match[1];
        }
      }
      
      // YouTube 임베드 URL (https://www.youtube.com/embed/VIDEO_ID)
      if (trimmedUrl.includes('/embed/')) {
        const match = trimmedUrl.match(/\/embed\/([^\/\?&"']+)/);
        if (match && match[1]) {
          console.log('임베드 URL에서 추출된 ID:', match[1]);
          return match[1];
        }
      }
      
      // iframe 코드 처리
      if (trimmedUrl.includes('<iframe') && trimmedUrl.includes('youtube')) {
        const srcMatch = trimmedUrl.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
          console.log('iframe 코드에서 추출된 URL:', srcMatch[1]);
          
          // 직접 YouTube 임베드 URL에서 ID 추출
          const embedMatch = srcMatch[1].match(/(?:youtube\.com\/embed\/|\/embed\/|\/v\/|youtu\.be\/)([^\/\?&]+)/i);
          if (embedMatch && embedMatch[1]) {
            console.log('iframe의 src에서 직접 추출한 ID:', embedMatch[1]);
            return embedMatch[1];
          }
          
          // 일반적인 방법으로 다시 시도
          return extractYoutubeId(srcMatch[1]);
        }
      }
      
      console.log('유효한 유튜브 ID가 아님:', trimmedUrl);
      return null;
    } catch (error) {
      console.error('유튜브 ID 추출 오류:', error);
      return null;
    }
  };

  // 유튜브 삽입 처리 함수
  const insertYoutube = () => {
    if (!editor) {
      console.error('에디터가 초기화되지 않았습니다.');
      return;
    }
    
    console.log('유튜브 URL 입력값:', youtubeUrl);
    console.log('유튜브 URL 길이:', youtubeUrl.length);
    console.log('유튜브 URL 타입:', typeof youtubeUrl);
    
    const videoId = extractYoutubeId(youtubeUrl);
    console.log('추출된 유튜브 ID:', videoId);
    
    if (videoId) {
      try {
        console.log('Tiptap에 전달할 비디오 ID:', videoId);
        console.log('현재 에디터 상태:', editor.getJSON());
        
        // editor 메서드 확인
        console.log('editor.commands 사용 가능:', !!editor.commands);
        console.log('editor.chain 사용 가능:', !!editor.chain);
        console.log('setYoutubeVideo 메서드 사용 가능:', !!editor.commands.setYoutubeVideo);
        
        // 실행
        try {
          // 유튜브 비디오를 HTML로 직접 삽입
          const youtubeHTML = `<div data-youtube-video="true"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" width="640" height="480" allowfullscreen></iframe></div>`;
          
          // HTML 직접 삽입 - 가장 성공적인 방법
          editor.commands.insertContent(youtubeHTML);
          console.log('유튜브 비디오 삽입 성공:', youtubeHTML);
          
          console.log('삽입 후 에디터 상태:', editor.getJSON());
        } catch (insertError) {
          console.error('삽입 도중 오류 발생:', insertError);
        }
        
        setShowYoutubeMenu(false);
        setYoutubeUrl('');
      } catch (error) {
        console.error('유튜브 비디오 삽입 오류 상세내용:', error);
        console.error('오류 스택:', error instanceof Error ? error.stack : '스택 없음');
        alert('유튜브 비디오 삽입 중 오류가 발생했습니다. 개발자 도구의 콘솔을 확인하세요.');
      }
    } else {
      console.error('유효한 유튜브 ID를 추출할 수 없습니다. 입력된 URL:', youtubeUrl);
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
export default YoutubeMenu;
