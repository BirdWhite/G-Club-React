'use client';

import { useEditor, EditorContent, Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { JsonValue } from '@prisma/client/runtime/library';

interface RichTextViewerProps {
  content: JsonValue;
}

// content가 Tiptap이 이해할 수 있는 유효한 객체인지 확인하는 타입 가드
function isValidTiptapJson(value: JsonValue): value is Content {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && 'type' in value && value.type === 'doc';
}

export const RichTextViewer = ({ content }: RichTextViewerProps) => {
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
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
        width: 640,
        height: 480,
        HTMLAttributes: {
          class: 'youtube-video mx-auto rounded-lg',
        },
      }),
    ],
    // 유효한 Tiptap JSON일 경우에만 content로 전달, 아닐 경우 빈 문서 렌더링
    content: isValidTiptapJson(content) ? content : { type: 'doc', content: [] },
  });

  if (!editor) {
    return null;
  }

  return (
    <EditorContent editor={editor} className="prose prose-sm sm:prose-base max-w-none" />
  );
};

export default RichTextViewer; 