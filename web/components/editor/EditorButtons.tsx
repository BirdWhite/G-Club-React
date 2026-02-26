'use client';

import { Editor } from '@tiptap/react';
import React from 'react';

export interface EditorButtonsProps {
  editor: Editor;
  isUploading: boolean;
  handleImageUpload: () => void;
  setShowLinkMenu: (show: boolean) => void;
  setShowYoutubeMenu: (show: boolean) => void;
  setYoutubeUrl: (url: string) => void;
  setLinkUrl: (url: string) => void;
  disabled?: boolean;
}

/** 현재 블록(paragraph/heading/codeBlock)에만 포맷 적용 - 선택 영역 전체가 아닌 커서가 있는 블록만 */
function restrictToCurrentBlockAndRun(editor: Editor, runCommand: () => void): void {
  const { state } = editor;
  const { $from } = state.selection;
  let blockDepth = 0;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (['paragraph', 'heading', 'codeBlock'].includes(node.type.name)) {
      blockDepth = d;
      break;
    }
  }
  if (blockDepth > 0) {
    const start = $from.before(blockDepth);
    const end = $from.after(blockDepth);
    editor.chain().focus().setTextSelection({ from: start, to: end }).run();
  }
  runCommand();
}

export function EditorButtons({
  editor,
  isUploading,
  handleImageUpload,
  setShowLinkMenu,
  setShowYoutubeMenu,
  setYoutubeUrl,
  setLinkUrl,
  disabled = false
}: EditorButtonsProps): React.JSX.Element {

  const buttonClass = (isActive?: boolean) => 
    `p-2 rounded-sm transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent'
    } disabled:opacity-50 disabled:cursor-not-allowed`;

  const toggleHeadingLevel2 = () => {
    restrictToCurrentBlockAndRun(editor, () => editor.chain().focus().toggleHeading({ level: 2 }).run());
  };
  const toggleHeadingLevel3 = () => {
    restrictToCurrentBlockAndRun(editor, () => editor.chain().focus().toggleHeading({ level: 3 }).run());
  };
  const toggleCodeBlock = () => {
    restrictToCurrentBlockAndRun(editor, () => editor.chain().focus().toggleCodeBlock().run());
  };

  const openLinkMenu = () => {
    setShowYoutubeMenu(false);
    setYoutubeUrl('');
    setShowLinkMenu(true);
  };
  const openYoutubeMenu = () => {
    setShowLinkMenu(false);
    setLinkUrl('');
    setShowYoutubeMenu(true);
  };
    
  return (
    <div className="flex items-center p-2 border-b border-border bg-muted flex-wrap gap-1">
      <button type="button" onClick={toggleHeadingLevel2} className={buttonClass(editor.isActive('heading', { level: 2 }))} disabled={disabled} title="제목 2 (현재 줄만)"><strong>H2</strong></button>
      <button type="button" onClick={toggleHeadingLevel3} className={buttonClass(editor.isActive('heading', { level: 3 }))} disabled={disabled} title="제목 3 (현재 줄만)"><strong>H3</strong></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive('bold'))} disabled={disabled}><strong>B</strong></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive('italic'))} disabled={disabled}><em>I</em></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={buttonClass(editor.isActive('strike'))} disabled={disabled}><s>S</s></button>
      <button type="button" onClick={toggleCodeBlock} className={buttonClass(editor.isActive('codeBlock'))} disabled={disabled} title="코드 블록 (현재 줄만)">&lt;/&gt;</button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive('bulletList'))} disabled={disabled}>•</button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass(editor.isActive('orderedList'))} disabled={disabled}>1.</button>
      <button type="button" onClick={() => editor.chain().focus().setHardBreak().run()} className={buttonClass()} disabled={disabled}>↵</button>
      <button type="button" onClick={handleImageUpload} className={buttonClass()} disabled={isUploading || disabled}>
        {isUploading ? '업로드중' : '이미지'}
      </button>
      <button type="button" onClick={openLinkMenu} className={buttonClass(editor.isActive('link'))} disabled={disabled}>링크</button>
      <button type="button" onClick={openYoutubeMenu} className={buttonClass()} disabled={disabled}>유튜브</button>
    </div>
  );
};

