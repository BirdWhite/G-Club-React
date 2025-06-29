'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { GamePost, Participant } from '@/types/game';
import ParticipantManager from '@/components/game/ParticipantManager';

export default function EditGamePostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<GamePost | null>(null);
  const [formData, setFormData] = useState<Partial<GamePost>>({
    title: '',
    content: '',
    maxPlayers: 2,
  });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 게시글 데이터 불러오기
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (!id) return;

    const fetchPost = async () => {
      try {
        const postRes = await fetch(`/api/game-posts/${id}?includeParticipants=true`);
        
        if (!postRes.ok) throw new Error('게시글을 불러오는데 실패했습니다.');
        
        const postData = await postRes.json();
        
        // 작성자 확인
        if (postData.authorId !== session?.user?.id) {
          router.push(`/game-mate/${id}`);
          toast.error('권한이 없습니다.');
          return;
        }
        
        setPost(postData);
        
        // 게시글 데이터에 참여자 목록이 포함되어 있는 경우
        if (postData.participants) {
          setParticipants(postData.participants);
        }
        // startTime을 datetime-local 입력 형식에 맞게 변환하여 설정
        setFormData({
          ...postData,
          startTime: postData.startTime ? new Date(postData.startTime).toISOString().slice(0, 16) : '',
        });
      } catch (error) {
        console.error('게시글 로딩 오류:', error);
        toast.error('게시글을 불러오는 중 오류가 발생했습니다.');
        router.push('/game-mate');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchPost();
    }
  }, [id, status, router, session?.user?.id]);

  // 날짜 형식을 datetime-local 입력에 맞게 변환하는 함수
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // 타임존 오프셋을 고려하여 로컬 시간으로 변환
    const tzOffset = date.getTimezoneOffset() * 60000; // 분 단위를 밀리초로 변환
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString();
    return localISOTime.slice(0, 16); // 'YYYY-MM-DDTHH:MM' 형식으로 반환
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !post) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    // 로딩 상태 설정
    setIsSubmitting(true);

    try {
      // 참여자 정보 준비
      const participantsData = participants
        .filter(p => p.user?.id) // 유효한 사용자만 필터링
        .map(p => ({
          id: p.id.startsWith('temp-') ? undefined : p.id,
          userId: p.user.id,
          isReserve: Boolean(p.isReserve)
        }));

      console.log('제출 데이터:', {
        title: formData.title,
        content: formData.content,
        maxPlayers: formData.maxPlayers,
        startTime: formData.startTime,
        participants: participantsData
      });

      // 게시글 수정 및 참여자 정보 업데이트를 한 번의 API 호출로 처리
      const updateResponse = await fetch(`/api/game-posts/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          maxPlayers: formData.maxPlayers,
          startTime: formData.startTime,
          participants: participantsData // 참여자 정보 포함
        }),
      });

      // 응답 처리
      const responseContentType = updateResponse.headers.get('content-type');
      let responseData;
      
      try {
        // 응답이 JSON 형식인지 확인
        if (responseContentType && responseContentType.includes('application/json')) {
          responseData = await updateResponse.json();
        } else {
          const errorText = await updateResponse.text();
          console.error('서버 응답이 JSON 형식이 아닙니다:', errorText);
          throw new Error('서버 응답 형식이 올바르지 않습니다.');
        }

        if (!updateResponse.ok) {
          console.error('API 오류 응답:', responseData);
          throw new Error(responseData.error || responseData.message || '게시글 수정에 실패했습니다.');
        }

        // 성공 처리
        toast.success(responseData.message || '게시글이 성공적으로 수정되었습니다.');
        router.push(`/game-mate/${id}`);
        
      } catch (parseError) {
        console.error('응답 파싱 오류:', parseError);
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
      }
      
    } catch (err) {
      console.error('게시글 수정 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '게시글 수정 중 알 수 없는 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">게시글을 찾을 수 없습니다.</h2>
        <p className="text-gray-600 mt-2">요청하신 게시글이 존재하지 않거나 삭제되었을 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 text-gray-800">게시글 수정</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
            <input
              type="text"
              name="title"
              value={formData.title || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
            <textarea
              name="content"
              value={formData.content || ''}
              onChange={handleChange}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            ></textarea>
          </div>

          {/* 참여자 관리 */}
          {session?.user?.id && (
            <div className="pt-4 border-t border-gray-200">
              <ParticipantManager
                initialParticipants={participants}
                onParticipantsChange={(newParticipants) => setParticipants(newParticipants as Participant[])}
                currentUserId={session.user.id}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">최대 인원</label>
              <div className="relative">
                <input
                  type="number"
                  name="maxPlayers"
                  value={formData.maxPlayers || 2}
                  onChange={handleChange}
                  min={2}
                  max={100}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">명</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              저장하기
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}