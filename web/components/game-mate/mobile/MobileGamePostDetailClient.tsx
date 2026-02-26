'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GamePost } from '@/types/models';
import toast from 'react-hot-toast';
import { useGamePostDetailSubscription } from '@/hooks/useRealtimeSubscription';
import { ChevronDown, ChevronRight, Users, Clock } from 'lucide-react';

import { MobileGamePostHeader } from './MobileGamePostHeader';
import { GamePostContent } from '../GamePostContent';
import { ParticipantList } from '../ParticipantList';
import { WaitingList } from '../WaitingList';
import { ActionButtons } from '../ActionButtons';
import { CommentSection } from '../CommentSection';

interface MobileGamePostDetailClientProps {
  initialPost: GamePost;
  userId?: string;
}

export function MobileGamePostDetailClient({ initialPost, userId }: MobileGamePostDetailClientProps) {
  const router = useRouter();
  const { post, loading: isSubmitting, refresh } = useGamePostDetailSubscription(initialPost.id, initialPost);
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

  const handleAction = async (
    action: () => Promise<Response>,
    successMessage: string,
    errorMessage: string
  ) => {
    try {
      const response = await action();
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON Parse Error:', jsonError);
        data = { error: '서버 응답을 파싱할 수 없습니다.' };
      }

      if (!response.ok) {
        throw new Error(data.error || errorMessage);
      }

      toast.success(successMessage);
      refresh(); // 데이터 새로고침
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : errorMessage);
    }
  };

  const handleJoin = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/join`, { method: 'POST' }),
    '게임에 참여했습니다!',
    '게임 참여 중 오류가 발생했습니다.'
  );

  const handleLeave = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/leave`, { method: 'PATCH' }),
    '게임에서 나갔습니다.',
    '게임 나가기 중 오류가 발생했습니다.'
  );

  const handleWait = () => handleAction(
    () => fetch(`/api/game-posts/${currentPost.id}/wait`, { method: 'POST' }),
    '예비 참가로 등록되었습니다.',
    '예비 참가 등록 중 오류가 발생했습니다.'
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
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON Parse Error:', jsonError);
        data = { error: '서버 응답을 파싱할 수 없습니다.' };
      }

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

  const isOwner = currentPost.isOwner || false;
  const isParticipating = currentPost.isParticipating || false;
  const isWaiting = currentPost.isWaiting || false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <MobileGamePostHeader
        post={currentPost}
        onDelete={handleDeletePost}
        onEdit={handleEditPost}
        isOwner={isOwner}
        loading={isSubmitting}
      />

      <div className="mt-2">
        <GamePostContent post={currentPost} />
      </div>

      <div className="mt-8">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-foreground mr-2" />
          <span className="text-xl font-bold text-foreground">
            {currentPost.participants?.filter(p => p.status === 'ACTIVE').length || 0}/{currentPost.maxParticipants}
          </span>
        </div>
        <ParticipantList
          participants={currentPost.participants}
          authorId={currentPost.author.userId}
          gamePostId={currentPost.id}
          gameStatus={currentPost.status}
          isOwner={isOwner}
          onParticipantUpdate={refresh}
        />
      </div>

      {currentPost.waitingList && currentPost.waitingList.filter(w => w.status === 'WAITING' || w.status === 'INVITED' || w.status === 'TIME_WAITING').length > 0 && (
         <div className="mt-8">
            <div 
              className="flex items-center mb-4 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors w-fit"
              onClick={() => setIsWaitingListExpanded(!isWaitingListExpanded)}
            >
              <Clock className="h-5 w-5 text-foreground mr-2" />
              <h3 className="text-xl font-bold text-cyber-gray mr-3">예비 목록</h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyber-orange/20 text-cyber-orange border border-cyber-orange/30">
                {currentPost.waitingList.filter(w => w.status === 'WAITING' || w.status === 'INVITED' || w.status === 'TIME_WAITING').length}명
              </span>
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
            onParticipate={handleJoin}
            onCancelParticipation={handleLeave}
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
    </div>
  );
}
