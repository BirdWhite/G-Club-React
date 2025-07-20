import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

// 게임 참여/취소 (토글 방식)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  
  const userId = user.id;

  try {
    const { id: postId } = params;

    const post = await prisma.gamePost.findUnique({
      where: { id: postId },
      include: {
        participants: true,
        _count: {
          select: {
            participants: {
              where: { isReserve: false }
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (post.authorId === userId) {
      return NextResponse.json({ error: '자신이 생성한 모집글에는 참여할 수 없습니다.' }, { status: 400 });
    }

    const existingParticipation = post.participants.find(p => p.userId === userId);

    // 참여 취소
    if (existingParticipation) {
      await prisma.gameParticipant.delete({
        where: { id: existingParticipation.id },
      });

      // 대기자가 있었고, 자리가 났다면 첫번째 대기자를 참여자로 변경
      const currentParticipants = post._count.participants;
      if (currentParticipants < post.maxParticipants) {
          const firstReserve = await prisma.gameParticipant.findFirst({
              where: { gamePostId: postId, isReserve: true },
              orderBy: { joinedAt: 'asc' },
          });

          if (firstReserve) {
              await prisma.gameParticipant.update({
                  where: { id: firstReserve.id },
                  data: { isReserve: false },
              });
              // TODO: 알림 전송
          }
      }

      return NextResponse.json({ message: '참여가 취소되었습니다.' });
    } 
    // 참여 신청
    else {
      if (post.status !== 'OPEN') {
        return NextResponse.json({ error: '모집이 마감된 글입니다.' }, { status: 400 });
      }

      const currentParticipants = post._count.participants;
      const isReserve = currentParticipants >= post.maxParticipants;

      await prisma.gameParticipant.create({
        data: {
          gamePostId: postId,
          userId: userId,
          isLeader: false,
          isReserve: isReserve,
        },
      });

      if(isReserve) {
          return NextResponse.json({ message: '대기자로 등록되었습니다.', isReserve: true });
      } else {
          return NextResponse.json({ message: '참여가 완료되었습니다.', isReserve: false });
      }
    }
  } catch (error) {
    console.error('참여 처리 오류:', error);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
