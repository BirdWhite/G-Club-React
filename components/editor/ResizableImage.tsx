'use client';

import { Extension } from '@tiptap/core';

// 이미지 크기 조절을 위한 커스텀 확장 기능
export const ResizableImage = Extension.create({
  name: 'resizableImage',
  
  addAttributes() {
    return {
      width: {
        default: '100%',
        renderHTML: (attributes: Record<string, any>) => {
          return {
            width: attributes.width,
            style: `width: ${attributes.width}`,
          };
        },
      },
    };
  },
  
  addNodeView() {
    return ({ node, editor, getPos }: { node: any; editor: any; getPos: any }) => {
      const dom = document.createElement('div');
      dom.classList.add('image-resizer-container');
      
      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.style.width = node.attrs.width;
      
      const resizeHandle = document.createElement('div');
      resizeHandle.classList.add('resize-handle');
      
      dom.appendChild(img);
      dom.appendChild(resizeHandle);
      
      let startX: number;
      let startWidth: number;
      
      const startResize = (e: MouseEvent) => {
        startX = e.pageX;
        startWidth = img.offsetWidth;
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
      };
      
      const resize = (e: MouseEvent) => {
        if (getPos && typeof getPos === 'function') {
          const currentWidth = startWidth + (e.pageX - startX);
          const minWidth = 100; // 최소 너비
          const maxWidth = dom.parentElement?.offsetWidth || 800; // 최대 너비
          
          const newWidth = Math.max(minWidth, Math.min(currentWidth, maxWidth));
          const widthInPercent = `${Math.round((newWidth / maxWidth) * 100)}%`;
          
          editor.commands.updateAttributes('image', { width: widthInPercent });
          img.style.width = widthInPercent;
        }
      };
      
      const stopResize = () => {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
      };
      
      resizeHandle.addEventListener('mousedown', startResize);
      
      return {
        dom,
        destroy: () => {
          resizeHandle.removeEventListener('mousedown', startResize);
        },
      };
    };
  },
});
