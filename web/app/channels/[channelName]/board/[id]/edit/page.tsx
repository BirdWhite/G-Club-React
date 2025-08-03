'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RichTextEditor } from '@/components';
import { User } from '@supabase/supabase-js';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const channelName = params.channelName as string;
  const postId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login?callbackUrl=' + encodeURIComponent(`/channels/${channelName}/board/${postId}/edit`));
        return;
      }
      setUser(user);

      // 사용자 프로필(역할 포함) 정보 가져오기
      try {
        const profileRes = await fetch('/api/profile');
        if (profileRes.ok) {
            const profileData = await profileRes.json();
            setUserProfile(profileData.profile);
        } else {
            throw new Error('프로필 정보를 가져오는데 실패했습니다.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        setIsLoading(false);
        return;
      }


      try {
        const response = await fetch(`/api/channels/${channelName}/board/posts/${postId}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || '게시글을 불러오는데 실패했습니다.');

        const postAuthorId = data.post.author.userId;
        const currentUserRole = userProfile?.role?.name;
        const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

        if (user.id !== postAuthorId && !isAdmin) {
          setError('이 게시글을 수정할 권한이 없습니다.');
          // setTimeout(() => router.push(`/${channelName}/board/${postId}`), 2000);
          return;
        }

        setTitle(data.post.title);
        setContent(data.post.content);

      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (postId && channelName) {
      checkAuthAndFetchData();
    }
  }, [postId, channelName, router, userProfile?.role?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // TODO: 이미지 수정 로직 추가 필요
      
      const response = await fetch(`/api/channels/${channelName}/board/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '게시글 수정 중 오류가 발생했습니다.');
      
      alert('게시글이 성공적으로 수정되었습니다.');
      router.push(`/channels/${channelName}/board/${postId}`);
    } catch (error: any) {
      setError(error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-cyber-black-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-blue"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black-100 py-10">
      <div className="container mx-auto px-4">
        <div className="bg-cyber-black-200 rounded-lg shadow-lg p-6 border border-cyber-black-300">
          <h1 className="text-2xl font-bold text-white mb-6">
            게시글 수정
          </h1>
          
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
                disabled={!!error}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-cyber-gray mb-1">
                내용
              </label>
              <RichTextEditor 
                content={content} 
                onChange={setContent}
                disabled={!!error}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push(`/channels/${channelName}/board/${postId}`)}
                className="px-4 py-2 border border-cyber-black-300 rounded-md text-cyber-gray hover:bg-cyber-black-300 transition-colors"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyber-blue text-white font-semibold rounded-md hover:bg-sky-400 disabled:bg-cyber-blue/50 transition-colors"
                disabled={isSubmitting || !!error}
              >
                {isSubmitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
