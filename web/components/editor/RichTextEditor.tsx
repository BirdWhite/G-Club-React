'use client';

import { useEditor, EditorContent, BubbleMenu, Content, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useEffect } from 'react';
import { YoutubeMenu } from './YoutubeMenu';
import { LinkMenu } from './LinkMenu';
import { ResizableImage } from './ResizableImage';
import { EditorButtons } from './EditorButtons';
import 'material-icons/iconfont/material-icons.css';
import { JsonValue } from '@prisma/client/runtime/library';

// content가 Tiptap이 이해할 수 있는 유효한 객체인지 확인하는 타입 가드
function isValidTiptapJson(value: unknown): value is Content {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && 'type' in value && (value as { type: string }).type === 'doc';
}

interface RichTextEditorProps {
  content?: JsonValue;
  onChange: (content: JsonValue) => void;
  postId?: string;
  disabled?: boolean;
  showToolbar?: boolean;
  placeholder?: string;
  mobileStyle?: boolean;
}

export function RichTextEditor({ content, onChange, postId, disabled = false, showToolbar = true, placeholder, mobileStyle = false }: RichTextEditorProps) {
  // 에디터 상태 관리
  const [editorReady, setEditorReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // const initialContentRef = useRef(content); // 현재 미사용

  // 링크 및 유튜브 상태
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [showYoutubeMenu, setShowYoutubeMenu] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Tiptap 에디터 초기화
  const editor = useEditor({
    // Next.js SSR 하이드레이션 불일치 방지를 위해 추가
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || '내용을 입력하세요...',
        emptyEditorClass: 'is-editor-empty',
        emptyNodeClass: 'is-empty',
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
        includeChildren: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
        inline: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Youtube.configure({
        addPasteHandler: true,
        allowFullscreen: true,
        autoplay: false,
        ccLanguage: 'ko',
        controls: true,
        height: 480,
        width: 640,
        HTMLAttributes: {
          class: 'youtube-video',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: 'true',
          frameborder: '0',
        },
        inline: false,
        modestBranding: true,
        nocookie: false,
        progressBarColor: 'red',
      }),
      ResizableImage,
    ],
    content: isValidTiptapJson(content) ? content : { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },

  });

  // 에디터 초기화 확인
  useEffect(() => {
    if (editor) {
      setEditorReady(true);
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // 이미지 업로드 처리 함수
  const uploadImage = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      // 공지사항 전용 - postId가 있으면 수정 모드, 없으면 새 글 작성 모드
      if (postId) {
        // 수정 모드: 바로 정식 폴더에 업로드
        formData.append('noticeId', postId);
      } else {
        // 새 글 작성 모드: 미리 생성된 ID 사용
        let noticeId = localStorage.getItem('tempNoticeId');
        if (!noticeId) {
          // UUID 생성 및 검증
          noticeId = await generateValidNoticeId();
          localStorage.setItem('tempNoticeId', noticeId);
        }
        formData.append('noticeId', noticeId);
      }

      const apiEndpoint = '/api/upload/notice-image'; // 공지사항 전용으로 단순화

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      
      return data.url;
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      alert('이미지 업로드에 실패했습니다.');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [postId]);

  // 유효한 공지사항 ID 생성 함수
  const generateValidNoticeId = async (): Promise<string> => {
    const maxAttempts = 10; // 최대 시도 횟수
    
    for (let i = 0; i < maxAttempts; i++) {
      const noticeId = crypto.randomUUID();
      
      try {
        // ID 유효성 검증 API 호출
        const response = await fetch('/api/notices/validate-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ noticeId }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.isValid && !result.exists) {
            return noticeId;
          }
        }
      } catch (error) {
        console.error('ID 검증 중 오류:', error);
      }
    }
    
    // 최대 시도 횟수 초과 시 에러 발생
    console.error('유효한 ID 생성에 실패했습니다. 최대 시도 횟수를 초과했습니다.');
    throw new Error('ID 생성에 실패했습니다. 페이지를 새로고침해주세요.');
  };

  // 이미지 업로드 버튼 처리
  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async () => {
      if (input.files?.length) {
        const file = input.files[0];
        const imageUrl = await uploadImage(file);
        
        if (imageUrl && editor) {
          editor.chain().focus().setImage({ src: imageUrl }).run();
        }
      }
    };
    
    input.click();
  }, [editor, uploadImage]);

  // tempImages 관련 로직 제거 - 더 이상 필요하지 않음
  
  // tempImages 관련 로직 제거 - 더 이상 필요하지 않음
  
  // 링크 설정 함수
  const setLink = useCallback(() => {
    if (!editor) return;
    
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    
    // 올바른 URL 형식인지 확인
    let href = linkUrl;
    if (!/^https?:\/\//.test(href)) {
      href = `https://${href}`;
    }
    
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setShowLinkMenu(false);
    setLinkUrl('');
  }, [editor, linkUrl]);
  
  // 링크 키 입력 처리
  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setLink();
    }
  };

  // 로딩 처리
  if (!editorReady) {
    if (mobileStyle) {
      return (
        <div className="flex items-center justify-center min-h-[120px] bg-transparent">
          <p className="text-muted-foreground text-base">로딩 중...</p>
        </div>
      );
    }
    
    return (
      <div className="border border-border bg-input rounded-md overflow-hidden p-4 min-h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">에디터 로딩중...</p>
      </div>
    );
  }

  return (
    <div className={mobileStyle ? "bg-transparent" : "border border-border rounded-md overflow-hidden bg-input"}>
      
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="bg-popover border border-border rounded-md shadow-lg"
        >
          <div className="flex p-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 rounded-sm ${editor.isActive('bold') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              title="굵게"
            >
              <span className="material-icons" style={{fontSize: '18px'}}>format_bold</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 rounded-sm ${editor.isActive('italic') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              title="기울임"
            >
              <span className="material-icons" style={{fontSize: '18px'}}>format_italic</span>
            </button>
            <button
              onClick={() => {
                const url = window.prompt('URL을 입력하세요');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              className={`p-1 rounded-sm ${editor.isActive('link') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              title="링크"
            >
              <span className="material-icons" style={{fontSize: '18px'}}>link</span>
            </button>
          </div>
        </BubbleMenu>
      )}
      
      {showToolbar && (
        <EditorButtons 
          editor={editor as Editor}
          isUploading={isUploading}
          handleImageUpload={handleImageUpload}
          setShowLinkMenu={setShowLinkMenu}
          setShowYoutubeMenu={setShowYoutubeMenu}
          setYoutubeUrl={setYoutubeUrl}
          setLinkUrl={setLinkUrl}
          disabled={disabled}
        />
      )}
      
      {showLinkMenu && (
        <LinkMenu
          linkUrl={linkUrl}
          setLinkUrl={setLinkUrl}
          handleLinkKeyDown={handleLinkKeyDown}
          setLink={setLink}
          setShowLinkMenu={setShowLinkMenu}
        />
      )}
      
      {showYoutubeMenu && (
        <YoutubeMenu
          editor={editor}
          youtubeUrl={youtubeUrl}
          setYoutubeUrl={setYoutubeUrl}
          setShowYoutubeMenu={setShowYoutubeMenu}
        />
      )}
      
      <style jsx global>{`
        /* Tiptap Placeholder 스타일 */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          color: #9CA3AF;
          opacity: 0.8;
        }
        
        /* 빈 단락에서 플레이스홀더가 여러 줄로 표시되지 않도록 */
        .ProseMirror p.is-empty:not(:first-child)::before {
          display: none;
        }
        
        .image-resizer-container {
          position: relative;
          display: inline-block;
        }
        .resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          background-color: #0096ff;
          cursor: nwse-resize;
          border-radius: 2px;
        }
        .ProseMirror img {
          display: inline-block;
          cursor: default;
          max-width: 100%;
        }
        .ProseMirror .youtube-video {
          position: relative;
          width: 100%;
          max-width: 640px;
          height: auto;
          aspect-ratio: 16/9;
          margin: 1rem 0;
          border-radius: 4px;
          overflow: hidden;
          padding-top: 0;
          display: block;
        }
        .ProseMirror .youtube-video iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
        
        /* Tiptap 에디터 하이라이트 제거 */
        .ProseMirror {
          outline: none !important;
          border: none !important;
          color: var(--foreground);
        }
        
        .ProseMirror p {
          color: var(--foreground);
        }
        .ProseMirror:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .ProseMirror * {
          outline: none !important;
        }
        .ProseMirror *:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .ProseMirror p {
          outline: none !important;
          border: none !important;
        }
        .ProseMirror p:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* 중복된 플레이스홀더 스타일 제거 - 위에서 이미 정의됨 */
        
        /* 리스트 스타일 */
        .ProseMirror ol {
          list-style-type: decimal;
          list-style-position: outside;
          margin: 0.5em 0;
          padding-left: 2em;
        }
        
        .ProseMirror ul {
          list-style-type: disc;
          list-style-position: outside;
          margin: 0.5em 0;
          padding-left: 2em;
        }
        
        .ProseMirror li {
          margin-bottom: 0.25em;
          display: list-item;
        }
        
        .ProseMirror li ol,
        .ProseMirror li ul {
          margin: 0.25em 0;
          padding-left: 1em;
        }
        
        /* 리스트 항목 내부 텍스트 스타일 */
        .ProseMirror li p {
          margin: 0;
          display: inline;
        }
        
        /* 제목 스타일 */
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 1em 0 0.5em 0;
          color: #ffffff;
        }
        
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.8em 0 0.4em 0;
          color: #ffffff;
        }
        
        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 0.6em 0 0.3em 0;
          color: #ffffff;
        }
        
        .ProseMirror h4 {
          font-size: 1.1em;
          font-weight: bold;
          margin: 0.5em 0 0.25em 0;
          color: #ffffff;
        }
        
        .ProseMirror h5 {
          font-size: 1em;
          font-weight: bold;
          margin: 0.4em 0 0.2em 0;
          color: #ffffff;
        }
        
        .ProseMirror h6 {
          font-size: 0.9em;
          font-weight: bold;
          margin: 0.3em 0 0.15em 0;
          color: #ffffff;
        }
      `}</style>
      
      <div
        className="flex-grow cursor-text"
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent
          editor={editor}
          className={`tiptap prose prose-invert max-w-none focus:outline-none ${
            mobileStyle ? 'p-0 min-h-[120px] text-foreground' : 'p-4 min-h-[300px]'
          }`}
        />
      </div>
    </div>
  );
};

