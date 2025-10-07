'use client';

import { useEditor, EditorContent, Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { JsonValue } from '@prisma/client/runtime/library';
import { useEffect, useState } from 'react';
import { ResizableImage } from './ResizableImage';

interface RichTextViewerProps {
  content: JsonValue;
}

// content가 Tiptap이 이해할 수 있는 유효한 객체인지 확인하는 타입 가드
function isValidTiptapJson(value: JsonValue): value is Content {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && 'type' in value && value.type === 'doc';
}

export function RichTextViewer({ content }: RichTextViewerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
        inline: true,
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-500 hover:text-blue-600 underline',
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
          class: 'youtube-video mx-auto rounded-lg',
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
    // 유효한 Tiptap JSON일 경우에만 content로 전달, 아닐 경우 빈 문서 렌더링
    content: isValidTiptapJson(content) ? content : { type: 'doc', content: [] },
  });

  // 클라이언트에서만 렌더링
  if (!isMounted || !editor) {
    return <div className="prose prose-sm sm:prose-base max-w-none">로딩 중...</div>;
  }

  return (
    <div className="prose prose-sm sm:prose-base max-w-none 
      prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground
      prose-blockquote:border-l-primary prose-blockquote:bg-muted prose-blockquote:text-foreground
      prose-code:bg-muted prose-code:text-foreground prose-code:px-1 prose-code:py-0.5 prose-code:rounded
      prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
      prose-img:rounded-lg prose-img:shadow-sm
      prose-hr:border-border">
      <EditorContent 
        editor={editor} 
        className="[&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_li]:marker:text-foreground" 
      />
    </div>
  );
};

