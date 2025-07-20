'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RichTextEditor } from '@/components';

interface WriteFormProps {
  channelName: string;
  boardName: string;
}

export default function WriteForm({ channelName, boardName }: WriteFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tempImages, setTempImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      let processedContent = content;
      
      if (tempImages.length > 0) {
        const finalizeRes = await fetch('/api/upload/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempImages }),
        });
        
        if (!finalizeRes.ok) throw new Error('이미지 처리 중 오류가 발생했습니다.');
        
        const result = await finalizeRes.json();
        if (result.images && Array.isArray(result.images)) {
          result.images.forEach((img: any) => {
            if (img.success && img.originalUrl && img.newUrl) {
              processedContent = processedContent.replace(
                new RegExp(img.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                img.newUrl
              );
            }
          });
        }
      }
      
      const postRes = await fetch(`/api/channels/${channelName}/board/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: processedContent,
          published: true,
        }),
      });
      
      const data = await postRes.json();
      if (!postRes.ok) {
        throw new Error(data.error || '게시글 작성 중 오류가 발생했습니다.');
      }
      
      router.push(`/channels/${channelName}/board`);
      router.refresh(); // 목록 페이지를 새로고침하여 새 글을 바로 확인
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (images: string[]) => {
    setTempImages(prev => [...prev, ...images]);
  };
  
  return (
    <div className="bg-cyber-black-200 rounded-lg shadow-lg p-6 border border-cyber-black-300">
      {error && (
        <div className="mb-4 p-3 bg-cyber-orange/10 text-cyber-orange rounded-md border border-cyber-orange/30">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-cyber-gray mb-1">
            제목
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-cyber-black-300 bg-cyber-black-100 text-cyber-gray rounded-md focus:outline-none focus:ring-2 focus:ring-cyber-blue"
            placeholder="제목을 입력하세요"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="content" className="block text-sm font-medium text-cyber-gray mb-1">
            내용
          </label>
          <RichTextEditor 
            content={content} 
            onChange={setContent}
            onImageUpload={handleImageUpload}
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push(`/channels/${channelName}/board`)}
            className="px-4 py-2 border border-cyber-black-300 rounded-md text-cyber-gray hover:bg-cyber-black-300 transition-colors"
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-cyber-blue text-white font-semibold rounded-md hover:bg-sky-400 disabled:bg-cyber-blue/50 transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
} 