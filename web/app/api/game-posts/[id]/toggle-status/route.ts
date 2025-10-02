import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';
import { GamePostStatus } from '@/types/models';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    
    const post = await prisma.gamePost.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        maxParticipants: true,
        isFull: true,
        _count: {
          select: {
            participants: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: '모집글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (post.authorId !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 순환식 상태 변경: OPEN -> IN_PROGRESS -> COMPLETED -> OPEN
    let newStatus: GamePostStatus;
    let newIsFull: boolean;
    let message: string;
    
    switch (post.status) {
      case 'OPEN':
        newStatus = GamePostStatus.IN_PROGRESS;
        newIsFull = post.isFull; // isFull 상태 유지
        message = '게임이 시작되었습니다.';
        break;
      case 'IN_PROGRESS':
        newStatus = GamePostStatus.COMPLETED;
        newIsFull = post.isFull; // isFull 상태 유지
        message = '게임이 완료되었습니다.';
        break;
      case 'COMPLETED':
        // 현재 활성 참여자 수가 최대 인원과 같으면 isFull=true, 아니면 isFull=false
        if (post._count.participants >= post.maxParticipants) {
          newStatus = GamePostStatus.OPEN;
          newIsFull = true;
          message = '모집이 재개되었습니다. (인원이 가득 찼습니다)';
        } else {
          newStatus = GamePostStatus.OPEN;
          newIsFull = false;
          message = '모집이 재개되었습니다.';
        }
        break;
      default:
        newStatus = GamePostStatus.IN_PROGRESS;
        newIsFull = post.isFull; // isFull 상태 유지
        message = '게임이 시작되었습니다.';
    }
    
    const updatedPost = await prisma.gamePost.update({
      where: { id },
      data: {
        status: newStatus,
        isFull: newIsFull,
      },
    });

    return NextResponse.json({
      success: true,
      status: updatedPost.status,
      message: message
    });
    
  } catch (error) {
    console.error('모집 상태 변경 오류:', error);
    return NextResponse.json(
      { error: '모집 상태 변경에 실패했습니다.' },
      { status: 500 }
    );
  }
}
