import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 채팅 메시지(댓글) 목록 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params;

    const post = await prisma.gamePost.findUnique({
      where: { id: postId },
      include: { chatRoom: true },
    });

    if (!post) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!post.chatRoom) {
      return NextResponse.json([]); // 채팅방이 없으면 빈 배열 반환
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatRoomId: post.chatRoom.id },
      include: {
        user: { // UserProfile을 'user'로 alias
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('채팅 메시지 조회 오류:', error);
    return NextResponse.json({ error: '메시지를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 채팅 메시지(댓글) 작성
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id: postId } = params;
    const { content } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: '메시지 내용을 입력해주세요.' }, { status: 400 });
    }

    const post = await prisma.gamePost.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 트랜잭션으로 채팅방 생성 및 메시지 작성 처리
    const newMessage = await prisma.$transaction(async (tx) => {
      let chatRoom = await tx.chatRoom.findUnique({
        where: { gamePostId: postId },
      });

      // 채팅방이 없으면 새로 생성
      if (!chatRoom) {
        chatRoom = await tx.chatRoom.create({
          data: {
            name: `${post.title} 채팅방`,
            type: 'GAME',
            gamePostId: postId,
          },
        });
      }

      // 메시지 생성
      const message = await tx.chatMessage.create({
        data: {
          content,
          chatRoomId: chatRoom.id,
          userId: user.id, // Supabase user의 id를 UserProfile id로 사용
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
      return message;
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('채팅 메시지 작성 오류:', error);
    return NextResponse.json({ error: '메시지 작성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
