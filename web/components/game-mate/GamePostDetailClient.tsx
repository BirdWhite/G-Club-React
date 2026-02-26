'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GamePost } from '@/types/models';
import toast from 'react-hot-toast';
import { useGamePostDetailSubscription } from '@/hooks/useRealtimeSubscription';
import { ChevronDown, ChevronRight, Users, Clock } from 'lucide-react';

import { GamePostHeader } from '@/components/game-mate/GamePostHeader';
import { GamePostContent } from '@/components/game-mate/GamePostContent';
import { ParticipantList } from '@/components/game-mate/ParticipantList';
import { WaitingList } from '@/components/game-mate/WaitingList';
import { ActionButtons } from '@/components/game-mate/ActionButtons';
import { CommentSection } from '@/components/game-mate/CommentSection';

interface GamePostDetailClientProps {
  initialPost: GamePost;
  userId?: string;
}

export function GamePostDetailClient({ initialPost, userId }: GamePostDetailClientProps) {
  const router = useRouter();
  const { post, loading: isSubmitting, refresh } = useGamePostDetailSubscription(initialPost.id, initialPost);
  const [isParticipantListExpanded, setIsParticipantListExpanded] = useState(false);
  const [isWaitingListExpanded, setIsWaitingListExpanded] = useState(false);
  
  // 조회수 증가 (페이지 로드 시 한 번만)
  const viewCountIncremented = useRef(false);
  
  useEffect(() => {
    if (!viewCountIncremented.current) {
      viewCountIncremented.current = true;
      
      const incrementViewCount = async () => {
        try {
          await fetch(`/api/game-posts/${initialPost.id}/view`, { 
            method: 'POST' 
          });
        } catch (error) {
          console.error('조회수 증가 실패:', error);
        }
      };
      
      incrementViewCount();
    }
  }, [initialPost.id]);

  // 게시글이 삭제된 경우 리다이렉트
  useEffect(() => {
    if (post === null) {
      toast.error('게시글이 삭제되었습니다.');
      router.push('/game-mate');
    }
  }, [post, router]);
  
  const currentPost = post || initialPost;

  const handleAction = async (action: () => Promise<Response>, successMessage: string, errorMessage: string) => {
    if (isSubmitting) return;
    
    try {
      const response = await action();
      const contentType = response.headers.get('content-type') ?? '';
      let data: { error?: string } = {};

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('JSON Parse Error:', jsonError);
          data = { error: '서버 응답을 파싱할 수 없습니다.' };
        }
      } else {
        // HTML 등 비-JSON 응답 (404, 500 에러 페이지 등)
        const text = await response.text();
        console.error('Non-JSON response:', { status: response.status, contentType, preview: text.slice(0, 100) });
        data = { 
          error: response.status === 404 
            ? '요청한 리소스를 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.' 
            : '서버가 예상치 못한 응답을 반환했습니다. 페이지를 새로고침 후 다시 시도해주세요.' 
        };
      }

      if (!response.ok) {
        console.error('API Error:', { 
          status: response.status, 
          statusText: response.statusText,
          data
        });
        throw new Error(data.error || errorMessage);
      }
      
      toast.success(successMessage);
      refresh(); // Re-fetch data using the hook's method

    } catch (error: unknown) {
      console.error('Action Error:', error);
      toast.error(error instanceof Error ? error.message : errorMessage);
    }
  };

  const handleParticipate = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/participate`, { method: 'POST' }),
    '게임 참여가 완료되었습니다.',
    '게임 참여 중 오류가 발생했습니다.'
  );

  const handleCancelParticipation = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/participate`, { method: 'DELETE' }),
    '참여가 취소되었습니다.',
    '참여 취소 중 오류가 발생했습니다.'
  );
  
  const handleWait = (availableTime: string | null) => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/wait`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableTime })
    }),
    '예비 참여가 등록되었습니다.',
    '예비 참여 등록 중 오류가 발생했습니다.'
  );

  const handleLeaveEarly = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/leave-early`, { method: 'PATCH' }),
    '중도 퇴장 처리되었습니다.',
    '중도 퇴장 처리 중 오류가 발생했습니다.'
  );
  
  const handleDeletePost = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/game-posts/${currentPost.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '게시글 삭제 중 오류가 발생했습니다.');
      }
      
      toast.success('게시글이 삭제되었습니다.');
      router.push('/game-mate');

    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditPost = () => {
    router.push(`/game-mate/${currentPost.id}/edit`);
  };

  const handleToggleStatus = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/toggle-status`, { method: 'PATCH' }),
    '게임 상태가 변경되었습니다.',
    '게임 상태 변경 중 오류가 발생했습니다.'
  );

  const handleCloseRecruitment = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/close-recruitment`, { method: 'PATCH' }),
    '모집이 종료되었습니다.',
    '모집 종료 중 오류가 발생했습니다.'
  );

  const isOwner = currentPost.isOwner; // Use server-provided value
  const isParticipating = currentPost.isParticipating; // Use server-provided value
  const isWaiting = currentPost.isWaiting; // Use server-provided value
  

  return (
    <>
      <GamePostHeader
        post={currentPost}
        isOwner={isOwner || false}
        onDelete={handleDeletePost}
        onEdit={handleEditPost}
        loading={isSubmitting}
      />

      <div className="mt-2">
        <GamePostContent post={currentPost} />
      </div>

      <div className="mt-8">
        <div
          className="flex items-center mb-4 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors w-fit"
          onClick={() => setIsParticipantListExpanded(!isParticipantListExpanded)}
        >
          <Users className="h-5 w-5 text-foreground mr-2" />
          <span className="text-xl font-bold text-foreground mr-3">
            참여 {currentPost.participants?.filter(p => p.status === 'ACTIVE').length || 0}/{currentPost.maxParticipants}
          </span>
          <div className="ml-1">
            {isParticipantListExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
        {isParticipantListExpanded && (
          <ParticipantList
            participants={currentPost.participants}
            authorId={currentPost.author.userId}
            gamePostId={currentPost.id}
            gameStatus={currentPost.status}
            isOwner={isOwner}
            onParticipantUpdate={refresh}
          />
        )}
      </div>

      {currentPost.waitingList && currentPost.waitingList.filter(w => w.status === 'WAITING' || w.status === 'INVITED' || w.status === 'TIME_WAITING').length > 0 && (
         <div className="mt-8">
            <div 
              className="flex items-center mb-4 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors w-fit"
              onClick={() => setIsWaitingListExpanded(!isWaitingListExpanded)}
            >
              <Clock className="h-5 w-5 text-foreground mr-2" />
              <h3 className="text-xl font-bold text-cyber-gray mr-3">
                예비 {currentPost.waitingList.filter(w => w.status === 'WAITING' || w.status === 'INVITED' || w.status === 'TIME_WAITING').length}
              </h3>
              <div className="ml-3">
                {isWaitingListExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </div>
            {isWaitingListExpanded && (
              <WaitingList waitingList={currentPost.waitingList.filter(w => w.status === 'WAITING' || w.status === 'INVITED' || w.status === 'TIME_WAITING')} />
            )}
         </div>
      )}

      {userId && (
        <div className="mt-8">
          <ActionButtons
            postStatus={currentPost.status}
            isFull={currentPost.isFull || false}
            isParticipating={isParticipating || false}
            isWaiting={isWaiting || false}
            isOwner={isOwner || false}
            gamePostId={currentPost.id}
            gameStartTime={currentPost.startTime}
            waitingList={currentPost.waitingList || []}
            onParticipate={handleParticipate}
            onCancelParticipation={handleCancelParticipation}
            onLeaveEarly={handleLeaveEarly}
            onWait={handleWait}
            onToggleStatus={handleToggleStatus}
            onCloseRecruitment={handleCloseRecruitment}
            onWaitingListUpdate={refresh}
            loading={isSubmitting}
          />
        </div>
      )}

      {/* 댓글 섹션 */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-cyber-gray mb-4">댓글</h3>
        <CommentSection gamePostId={currentPost.id} />
      </div>
    </>
  );
}
 