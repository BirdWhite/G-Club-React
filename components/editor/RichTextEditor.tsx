'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { useState, useCallback, useEffect, useRef } from 'react';
import { YoutubeMenu } from './YoutubeMenu';
import { LinkMenu } from './LinkMenu';
import { ResizableImage } from './ResizableImage';
import { EditorButtons } from './EditorButtons';
import 'material-icons/iconfont/material-icons.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  postId?: string;
  onImageUpload?: (tempImages: string[]) => void;
}

export const RichTextEditor = ({ content, onChange, postId, onImageUpload }: RichTextEditorProps) => {
  // 에디터 상태 관리
  const [editorReady, setEditorReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tempImages, setTempImages] = useState<string[]>([]);
  const initialContentRef = useRef(content);

  // 링크 및 유튜브 상태
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [showYoutubeMenu, setShowYoutubeMenu] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Tiptap 에디터 초기화
  const editor = useEditor({
    // Next.js SSR 하이드레이션 불일치 방지를 위해 추가
    immediatelyRender: false,
    extensions: [
      StarterKit,
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
    content,
    onUpdate: ({ editor }) => {
      onChange(editor?.getHTML() || '');
    },
  });

  // 에디터 초기화 확인
  useEffect(() => {
    if (editor) {
      setEditorReady(true);
    }
  }, [editor]);

  // 이미지 업로드 처리 함수
  const uploadImage = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isTemporary', 'true'); // 임시 업로드 플래그
      
      if (postId) {
        formData.append('postId', postId);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      
      // 임시 이미지 URL 추적
      if (data.isTemporary && data.url) {
        setTempImages(prev => [...prev, data.url]);
      }
      
      return data.url;
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      alert('이미지 업로드에 실패했습니다.');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [postId]);

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

  // 임시 이미지 정보 부모 컴포넌트에 전달
  useEffect(() => {
    if (onImageUpload && tempImages.length > 0) {
      onImageUpload(tempImages);
    }
  }, [tempImages, onImageUpload]);
  
  // 에디터 내용이 초기화되면 임시 이미지 목록도 초기화
  useEffect(() => {
    if (content === '' || content !== initialContentRef.current) {
      setTempImages([]);
    }
  }, [content]);
  
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
    return (
      <div className="border border-gray-300 rounded-md overflow-hidden p-4 min-h-[300px] flex items-center justify-center">
        <p>에디터 로딩중...</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
        >
          <div className="flex bg-white border border-gray-200 rounded shadow p-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
              title="굵게"
            >
              <span className="material-icons" style={{fontSize: '18px'}}>format_bold</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
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
              className={`p-1 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
              title="링크"
            >
              <span className="material-icons" style={{fontSize: '18px'}}>link</span>
            </button>
          </div>
        </BubbleMenu>
      )}
      
      <EditorButtons 
        editor={editor}
        isUploading={isUploading}
        handleImageUpload={handleImageUpload}
        setShowLinkMenu={setShowLinkMenu}
        setShowYoutubeMenu={setShowYoutubeMenu}
        setYoutubeUrl={setYoutubeUrl}
        setLinkUrl={setLinkUrl}
      />
      
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
      `}</style>
      
      <EditorContent editor={editor} className="prose max-w-none p-4 min-h-[300px]" />
    </div>
  );
};

export default RichTextEditor;
