'use client';

import { Editor } from '@tiptap/react';
import React from 'react';

export interface EditorButtonsProps {
  editor: Editor | null;
  isUploading: boolean;
  handleImageUpload: () => void;
  setShowLinkMenu: (show: boolean) => void;
  setShowYoutubeMenu: (show: boolean) => void;
  setYoutubeUrl: (url: string) => void;
  setLinkUrl: (url: string) => void;
}

const EditorButtons = ({
  editor,
  isUploading,
  handleImageUpload,
  setShowLinkMenu,
  setShowYoutubeMenu,
  setYoutubeUrl,
  setLinkUrl
}: EditorButtonsProps) => {
  return (
    <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
      <button
        type="button"
        onClick={() => editor && editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        title="굵게"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor && editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded ${editor?.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        title="기울임"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor && editor.chain().focus().toggleStrike().run()}
        className={`p-2 rounded ${editor?.isActive('strike') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        title="취소선"
      >
        <s>S</s>
      </button>
      <button
        type="button"
        onClick={() => editor && editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        title="제목"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor && editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-2 rounded ${editor?.isActive('heading', { level: 3 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        title="부제목"
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor && editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded ${editor?.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        title="글머리 기호"
      >
        • 목록
      </button>
      <button
        type="button"
        onClick={() => editor && editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded ${editor?.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        title="번호 매기기"
      >
        1. 목록
      </button>
      <button
        type="button"
        onClick={() => editor && editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded ${editor?.isActive('blockquote') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        title="인용"
      >
        인용
      </button>
      <button
        type="button"
        onClick={handleImageUpload}
        className={`p-2 rounded hover:bg-gray-100 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isUploading}
        title="이미지 업로드"
      >
        {isUploading ? '업로드 중...' : '이미지'}
      </button>
      <button
        type="button"
        onClick={() => {
          if (!editor) return;
          if (editor.isActive('link')) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
          } else {
            setShowLinkMenu(true);
            setLinkUrl(editor.getAttributes('link')?.href || '');
          }
        }}
        className={`p-2 rounded ${editor?.isActive('link') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        title="링크"
      >
        <span className="material-icons" style={{fontSize: '18px'}}>link</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setShowYoutubeMenu(true);
          setYoutubeUrl('');
        }}
        className="p-2 rounded hover:bg-gray-100"
        title="유튜브 영상 삽입"
      >
        <span className="material-icons" style={{fontSize: '18px'}}>smart_display</span>
      </button>
    </div>
  );
};

export { EditorButtons };
export default EditorButtons;
