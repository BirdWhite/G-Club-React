'use client';

import React, { useState } from 'react';
import type { Comment } from '@/types/models';

interface CommentsSectionProps {
  comments: Comment[];
  onSubmit: (content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<boolean>;
  currentUserId: string | null;
  isSubmitting: boolean;
  error: string | null;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
  comments,
  onSubmit,
  onDelete,
  currentUserId,
  isSubmitting,
  error,
}) => {
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    await onSubmit(content);
    setContent('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">댓글 ({comments.length})</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 작성하세요"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? '작성 중...' : '댓글 작성'}
        </button>
      </form>

      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="border-b pb-4 last:border-b-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                {comment.user.image ? (
                  <img
                    className="h-8 w-8 rounded-full mr-3"
                    src={comment.user.image}
                    alt={comment.user.name || '프로필 이미지'}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    <span className="text-gray-500 text-xs">
                      {comment.user.name?.[0] || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">
                    {comment.user.name || '익명'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(comment.createdAt)}
                  </p>
                </div>
              </div>
              {currentUserId === comment.user.id && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-red-500 text-sm hover:text-red-700"
                  disabled={isSubmitting}
                >
                  삭제
                </button>
              )}
            </div>
            <div className="mt-2 text-gray-800 text-sm whitespace-pre-wrap">
              {comment.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentsSection;
