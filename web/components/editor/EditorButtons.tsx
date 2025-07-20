'use client';

import { Editor } from '@tiptap/react';
import React from 'react';

export interface EditorButtonsProps {
  editor: any;
  isUploading: boolean;
  handleImageUpload: () => void;
  setShowLinkMenu: (show: boolean) => void;
  setShowYoutubeMenu: (show: boolean) => void;
  setYoutubeUrl: (url: string) => void;
  setLinkUrl: (url: string) => void;
  disabled?: boolean;
}

export const EditorButtons = ({
  editor,
  isUploading,
  handleImageUpload,
  setShowLinkMenu,
  setShowYoutubeMenu,
  setYoutubeUrl,
  setLinkUrl,
  disabled = false
}: EditorButtonsProps) => {

  const buttonClass = (isActive?: boolean) => 
    `p-2 rounded-sm transition-colors ${
      isActive
        ? 'bg-cyber-blue text-white'
        : 'text-cyber-gray hover:bg-cyber-black-600'
    } disabled:opacity-50 disabled:cursor-not-allowed`;
    
  return (
    <div className="flex items-center p-2 border-b border-cyber-black-300 bg-cyber-black-300 flex-wrap gap-1">
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={buttonClass(editor.isActive('heading', { level: 2 }))} disabled={disabled}><strong>H2</strong></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={buttonClass(editor.isActive('heading', { level: 3 }))} disabled={disabled}><strong>H3</strong></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive('bold'))} disabled={disabled}><strong>B</strong></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive('italic'))} disabled={disabled}><em>I</em></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={buttonClass(editor.isActive('strike'))} disabled={disabled}><s>S</s></button>
      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={buttonClass(editor.isActive('codeBlock'))} disabled={disabled}>&lt;/&gt;</button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive('bulletList'))} disabled={disabled}>•</button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass(editor.isActive('orderedList'))} disabled={disabled}>1.</button>
      <button type="button" onClick={() => editor.chain().focus().setHardBreak().run()} className={buttonClass()} disabled={disabled}>↵</button>
      <button type="button" onClick={handleImageUpload} className={buttonClass()} disabled={isUploading || disabled}>
        {isUploading ? '업로드중' : '이미지'}
      </button>
      <button type="button" onClick={() => setShowLinkMenu(true)} className={buttonClass(editor.isActive('link'))} disabled={disabled}>링크</button>
      <button type="button" onClick={() => setShowYoutubeMenu(true)} className={buttonClass()} disabled={disabled}>유튜브</button>
    </div>
  );
};

export default EditorButtons;
