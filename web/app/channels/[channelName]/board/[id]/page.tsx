'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface PostData {
  id: string;
  title: string;
  content: any; // TipTap JSON 또는 HTML 문자열
  createdAt: string;
  updatedAt: string;
  published: boolean;
  authorId: string; // author's UserProfile ID
  viewCount: number;
  author: {
    id: string; // author's UserProfile ID
    userId: string; // author's Supabase Auth User ID
    name: string | null;
    image: string | null;
  };
  board: {
    id: string;
    name: string;
    description: string | null;
  };
}

// 간단한 TipTap JSON-to-HTML 렌더러
function renderTipTapContent(content: any): string {
    if (typeof content === 'string') {
        return content;
    }
    if (content && content.type === 'doc' && Array.isArray(content.content)) {
        return content.content.map((node: any) => {
            if (node.type === 'paragraph') {
                return `<p>${node.content?.map((textNode: any) => textNode.text).join('') || ''}</p>`;
            }
            // 다른 노드 타입(headings, lists 등)에 대한 처리 추가 가능
            return '';
        }).join('');
    }
    return '';
}


export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const channelName = params.channelName as string;
  const postId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null); // 역할 정보를 포함한 프로필
  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState<PostData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // 사용자 프로필(역할 포함) 정보 가져오기
        // 간단하게 fetch로 구현. 실제로는 SWR/React-Query 사용 권장
        const res = await fetch('/api/profile');
        if (res.ok) {
            const profileData = await res.json();
            setUserProfile(profileData.profile);
        }
      }
    };
    
    fetchUserData();
  }, []);
  
  // 게시글 정보 로드
  useEffect(() => {
    const fetchPostData = async () => {
      if (!postId || !channelName) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/channels/${channelName}/board/posts/${postId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '게시글을 불러오는데 실패했습니다.');
        }
        
        setPost(data.post);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        console.error('게시글 로딩 오류:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostData();
  }, [postId, channelName]);
  
  // 권한 확인
  const isAuthor = post && user && post.author.userId === user.id;
  const isAdmin = userProfile && (userProfile.role?.name === 'ADMIN' || userProfile.role?.name === 'SUPER_ADMIN');
  
  const canEdit = isAuthor || isAdmin;
  const canDelete = isAuthor || isAdmin;
  
  // 게시글 삭제 처리
  const handleDelete = async () => {
    if (!post || !confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/channels/${channelName}/board/posts/${post.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '게시글 삭제에 실패했습니다.');
      }
      
      alert('게시글이 삭제되었습니다.');
      router.push(`/channels/${channelName}/board`);

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      console.error('게시글 삭제 오류:', err);
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-black-100 py-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-blue"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !post) {
    return (
      <div className="min-h-screen bg-cyber-black-100 py-10">
        <div className="container mx-auto px-4">
          <div className="bg-cyber-black-200 rounded-lg shadow-lg p-6 text-center border border-cyber-black-300">
            <h1 className="text-2xl font-bold text-cyber-orange mb-4">오류</h1>
            <p className="text-cyber-gray">{error || '게시글을 찾을 수 없습니다.'}</p>
            <button 
              onClick={() => router.back()}
              className="mt-6 px-4 py-2 bg-cyber-blue text-white rounded-md hover:bg-sky-400 transition-colors"
            >
              이전 페이지로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black-100 py-10">
      <div className="container mx-auto px-4">
        <div className="bg-cyber-black-200 rounded-lg shadow-lg p-6 mb-4 border border-cyber-black-300">
          <div className="flex justify-between items-start mb-4 border-b border-cyber-black-300 pb-4">
            <div>
              <Link 
                href={`/channels/${channelName}/board`}
                className="text-sm text-cyber-blue hover:underline mb-2 inline-block"
              >
                {post.board.name}
              </Link>
              <h1 className="text-3xl font-bold text-white">{post.title}</h1>
            </div>
            
            {(canEdit || canDelete) && (
              <div className="flex space-x-2 flex-shrink-0 ml-4">
                {canEdit && (
                  <Link 
                    href={`/channels/${channelName}/board/${post.id}/edit`}
                    className="px-3 py-1 text-sm border border-cyber-black-400 rounded-md text-cyber-gray hover:bg-cyber-black-300 transition-colors"
                  >
                    수정
                  </Link>
                )}
                {canDelete && (
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1 text-sm border border-cyber-orange/50 rounded-md text-cyber-orange hover:bg-cyber-orange/10 disabled:opacity-50 transition-colors"
                  >
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center text-sm text-cyber-gray mb-6">
            <div className="flex items-center">
                {post.author.image && <img src={post.author.image} alt={post.author.name || ''} className="w-8 h-8 rounded-full mr-3 bg-white" />}
                <span className="font-medium text-white">{post.author.name || '알 수 없음'}</span>
            </div>
            <span className="mx-3">·</span>
            <span>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })}
            </span>
            <span className="mx-3">·</span>
            <span>조회 {post.viewCount}</span>
          </div>
          
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderTipTapContent(post.content) }}
          />
        </div>
        
        <div className="flex justify-between">
          <Link 
            href={`/channels/${channelName}/board`}
            className="px-4 py-2 bg-cyber-black-200 border border-cyber-black-300 text-cyber-gray rounded-md hover:bg-cyber-black-300 transition-colors"
          >
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
