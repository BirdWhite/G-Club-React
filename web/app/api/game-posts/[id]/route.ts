import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { isAdmin_Server } from '@/lib/database/auth';
import { notificationService } from '@/lib/notifications/notificationService';
import { autoPromoteFirstWaitingParticipant } from '@/lib/database/gameParticipantUtils';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// 모집글 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteContext['params']> }
) {
  try {
    const { id } = await params;
    console.log('게임글 조회 요청 - ID:', id);
    
    const { searchParams } = new URL(request.url);
    const isList = searchParams.get('list') === 'true';
    
    // 현재 사용자 정보 가져오기
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    console.log('사용자 ID:', userId);

    const post = await prisma.gamePost.findUnique({
      where: { 
        id,
        status: { not: 'DELETED' } // 삭제된 게시글 제외
      },
      include: {
        game: {
          select: {
            name: true,
            iconUrl: true,
          },
        },
        author: {
          select: {
            id: true,
            userId: true,
            name: true,
            image: true,
          },
        },
        participants: {
          orderBy: { joinedAt: 'asc' },
        },
        waitingList: {
          include: {
            user: {
              select: {
                id: true,
                userId: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { requestedAt: 'asc' },
        },
      },
    });

    if (!post) {
      console.log('게임글을 찾을 수 없음 - ID:', id);
      return NextResponse.json(
        { error: '모집글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    console.log('게임글 찾음 - 제목:', post.title, '상태:', post.status);

    // 참여자 정보를 별도로 조회 (게스트 참여자 포함)
    const participants = await prisma.gameParticipant.findMany({
      where: { gamePostId: id },
      include: {
        user: {
          select: {
            id: true,
            userId: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // 목록용 응답인 경우 _count 추가
    if (isList) {
      const responseData = {
        ...post,
        participants: participants,
        _count: {
          participants: participants.filter(p => p.status === 'ACTIVE').length,
          waitingList: Array.isArray(post.waitingList) ? post.waitingList.filter(w => w.status === 'WAITING' || w.status === 'INVITED').length : 0,
        },
        startTime: post.startTime.toISOString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        // 사용자 상태 정보 추가
        isOwner: userId === post.author.userId,
        isParticipating: userId ? participants.some((p) => p.userId === userId && p.status === 'ACTIVE') : false,
        isWaiting: userId ? Array.isArray(post.waitingList) && post.waitingList.some((w) => w.userId === userId && w.status === 'WAITING') : false,
      };
      return NextResponse.json(responseData);
    }

    // 상세 조회 시에도 _count 정보 포함
    const activeParticipantsCount = participants.filter(p => p.status === 'ACTIVE').length;
    const isFull = activeParticipantsCount >= post.maxParticipants;
    
    const responseData = {
      ...post,
      participants: participants,
      isFull: isFull,
      _count: {
        participants: activeParticipantsCount,
        waitingList: Array.isArray(post.waitingList) ? post.waitingList.filter(w => w.status === 'WAITING' || w.status === 'INVITED').length : 0,
      },
      startTime: post.startTime.toISOString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      // 사용자 상태 정보 추가
      isOwner: userId === post.author.userId,
      isParticipating: userId ? participants.some((p) => p.userId === userId && p.status === 'ACTIVE') : false,
      isWaiting: userId ? Array.isArray(post.waitingList) && post.waitingList.some((w) => w.userId === userId && w.status === 'WAITING') : false,
    };
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('모집글 상세 조회 오류:', error);
    console.error('에러 스택:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: '모집글을 불러오는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 모집글 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<RouteContext['params']> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    console.log('게임글 수정 요청 - ID:', id);
    
    const requestBody = await request.json();
    console.log('요청 본문:', requestBody);
    
    const { title, content, maxParticipants, startDate, startTime, participants = [] } = requestBody;

    if (!title || !content || maxParticipants === undefined || !startDate || !startTime) {
      console.log('필수 항목 누락:', { title: !!title, content: !!content, maxParticipants, startDate: !!startDate, startTime: !!startTime });
      return NextResponse.json({ error: '모든 필수 항목을 입력해주세요.' }, { status: 400 });
    }
    
    // 날짜와 시간을 합쳐서 DateTime 객체 생성
    const dateOnly = new Date(startDate);
    const timeOnly = new Date(startTime);
    
    const combinedDateTime = new Date(
      dateOnly.getFullYear(),
      dateOnly.getMonth(),
      dateOnly.getDate(),
      timeOnly.getHours(),
      timeOnly.getMinutes(),
      timeOnly.getSeconds()
    );
    
    console.log('합쳐진 날짜시간:', combinedDateTime.toISOString());

    // content 필드 검증
    if (typeof content !== 'object' || content === null) {
      console.log('content 검증 실패:', typeof content, content);
      return NextResponse.json({ error: '내용 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    
    console.log('content 검증 통과:', content);
    if (maxParticipants < 2 || maxParticipants > 100) {
      console.log('maxParticipants 검증 실패:', maxParticipants);
      return NextResponse.json({ error: '인원수는 2명 이상 100명 이하로 설정해주세요.' }, { status: 400 });
    }
    
    console.log('maxParticipants 검증 통과:', maxParticipants);

    const existingPost = await prisma.gamePost.findUnique({ 
      where: { 
        id,
        status: { not: 'DELETED' } // 삭제된 게시글 제외
      },
      include: {
        participants: true,
      }
    });

    if (!existingPost) {
      console.log('게시글을 찾을 수 없음:', id);
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    console.log('기존 게시글 찾음:', existingPost.title);
    
    if (existingPost.authorId !== user.id) {
      console.log('권한 없음 - 작성자:', existingPost.authorId, '현재 사용자:', user.id);
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
    }
    
    console.log('권한 확인 통과');

    // 추가하려는 참여자 수가 최대인원을 초과하는지 확인
    const validParticipants = participants.filter((p: { userId?: string; name?: string }) => {
      const hasValidUserId = p.userId && p.userId.trim().length > 0;
      const hasValidName = p.name && p.name.trim().length > 0;
      return hasValidUserId || hasValidName;
    });

    // participants 배열에는 이미 작성자가 포함되어 있으므로, 
    // validParticipants.length가 최대인원을 초과하는지 확인
    const totalParticipantsAfterUpdate = validParticipants.length;
    
    
    if (totalParticipantsAfterUpdate > maxParticipants) {
      console.log('총 참여자 수 초과:', totalParticipantsAfterUpdate, '>', maxParticipants);
      return NextResponse.json({ error: `최대 인원(${maxParticipants}명)을 초과하여 참여자를 추가할 수 없습니다. 현재 추가 가능한 인원: ${maxParticipants}명` }, { status: 400 });
    }
    
    console.log('총 참여자 수 검증 통과:', totalParticipantsAfterUpdate, '<=', maxParticipants);

    const updatedPost = await prisma.$transaction(async (prisma) => {
      // 게시글 업데이트
      const post = await prisma.gamePost.update({
        where: { id },
        data: {
          title,
          content,
          maxParticipants,
          startTime: combinedDateTime,
        },
      });

      // 기존 참여자 중 작성자와 중도 퇴장자 제외하고 모두 제거
      await prisma.gameParticipant.deleteMany({
        where: {
          gamePostId: id,
          status: 'ACTIVE', // 활성 참여자만 삭제 (중도 퇴장자는 보존)
          OR: [
            { userId: { not: user.id } }, // 일반 사용자 중 작성자 제외
            { userId: null } // 게스트 참여자 모두 제거
          ]
        },
      });

      // 새로운 참여자들 추가 (이미 위에서 필터링됨)
      
      for (const participant of validParticipants) {
        if (participant.userId && participant.userId.trim()) {
          // 기존 사용자 확인
          const existingUser = await prisma.userProfile.findUnique({
            where: { userId: participant.userId }
          });

          if (existingUser) {
            // 이미 존재하는 참여자인지 확인 (작성자 제외)
            const existingParticipant = await prisma.gameParticipant.findFirst({
              where: {
                gamePostId: id,
                userId: existingUser.userId,
              },
            });

            if (!existingParticipant) {
              // 기존 사용자를 참여자로 추가
              await prisma.gameParticipant.create({
                data: {
                  gamePostId: id,
                  participantType: 'MEMBER',
                  userId: existingUser.userId,
                },
              });
            }
          }
        } else if (participant.name && participant.name.trim()) {
          // 이미 존재하는 게스트 참여자인지 확인
          const existingGuest = await prisma.gameParticipant.findFirst({
            where: {
              gamePostId: id,
              guestName: participant.name,
            },
          });

          if (!existingGuest) {
            // 게스트 참여자 추가
            await prisma.gameParticipant.create({
              data: {
                gamePostId: id,
                participantType: 'GUEST',
                guestName: participant.name,
              },
            });
          }
        }
      }

      // 참여자 추가 후 현재 참여자 수 확인
      const currentParticipantsCount = await prisma.gameParticipant.count({
        where: { gamePostId: id }
      });

      // 예비 참가자 자동 승격 로직 (게임 시작 전에만)
      let promotedCount = 0;
      if (post.status === 'OPEN') {
        while (currentParticipantsCount + promotedCount < maxParticipants) {
          const promotedUserId = await autoPromoteFirstWaitingParticipant(prisma, id);
          if (!promotedUserId) break; // 대기자가 없으면 종료
          promotedCount++;
        }
      }

      // 최종 참여자 수 확인 (승격된 참여자 포함)
      const finalParticipantsCount = await prisma.gameParticipant.count({
        where: { gamePostId: id }
      });

      // 참여자 수에 따라 isFull 상태 업데이트
      const newIsFull = finalParticipantsCount >= maxParticipants;
      
      // isFull 상태가 변경된 경우 업데이트
      if (newIsFull !== post.isFull) {
        await prisma.gamePost.update({
          where: { id },
          data: { isFull: newIsFull },
        });
      }

      return post;
    });

    return NextResponse.json({ data: updatedPost, message: '게시글이 성공적으로 수정되었습니다.' });
  } catch (error) {
    console.error('모집글 수정 오류:', error);
    console.error('에러 스택:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: '모집글 수정 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 모집글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteContext['params']> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  
  try {
    const { id } = await params;

    const post = await prisma.gamePost.findUnique({
      where: { 
        id,
        status: { not: 'DELETED' } // 삭제된 게시글 제외
      },
      include: { 
        author: { include: { role: true } },
        game: true
      },
    });

    if (!post) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true },
    });

    if (!userProfile || !userProfile.role) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const userRole = userProfile.role;
    const userIsAdmin = isAdmin_Server(userRole);

    // 작성자이거나 관리자인 경우에만 삭제 가능
    if (post.authorId !== user.id && !userIsAdmin) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
    }

    // 삭제 전에 참여자 정보 조회 (알림 발송용)
    const participants = await prisma.gameParticipant.findMany({
      where: { gamePostId: id },
      include: {
        user: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
    });

    // 참여자들에게 게임메이트 취소 알림 발송 (삭제 전에)
    if (participants.length > 0) {
      try {
        const participantUserIds = participants
          .filter(p => p.userId) // 게스트 제외
          .map(p => p.userId!);

        if (participantUserIds.length > 0) {
          console.log(`게임메이트 취소 알림 발송 시작: ${participantUserIds.length}명에게 발송`);
          const result = await notificationService.sendGamePostCancelledNotification(
            participantUserIds,
            {
              gamePostId: id,
              gameName: post.game?.name || '게임',
              authorName: post.author?.name || '작성자',
              title: post.title,
            }
          );
          console.log(`게임메이트 취소 알림 발송 완료:`, result);
        }
      } catch (notificationError) {
        console.error('게임메이트 취소 알림 발송 실패:', notificationError);
        // 알림 실패해도 삭제는 성공으로 처리
      }
    }

    // 게시글을 DELETED 상태로 변경 (실제 삭제 대신)
    await prisma.gamePost.update({
      where: { id },
      data: { status: 'DELETED' }
    });

    console.log(`게임포스트 삭제 완료: ${id} (${post.title})`);
    return NextResponse.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    console.error('모집글 삭제 오류:', error);
    return NextResponse.json(
      { error: '모집글을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
