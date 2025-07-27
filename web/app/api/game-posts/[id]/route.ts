import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/auth/utils';

type RouteContext = {
  params: {
    id: string;
  };
};

// 모집글 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteContext['params']> }
) {
  try {
    const { id } = await params;

    const post = await prisma.gamePost.findUnique({
      where: { id },
      include: {
        game: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        waitingList: {
          include: {
            user: {
              select: {
                id: true,
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
      return NextResponse.json(
        { error: '모집글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('모집글 상세 조회 오류:', error);
    return NextResponse.json(
      { error: '모집글을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 모집글 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<RouteContext['params']> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { title, content, maxParticipants, startTime } = await request.json();

    if (!title || !content || maxParticipants === undefined || !startTime) {
      return NextResponse.json({ error: '모든 필수 항목을 입력해주세요.' }, { status: 400 });
    }
    if (maxParticipants < 2 || maxParticipants > 100) {
      return NextResponse.json({ error: '인원수는 2명 이상 100명 이하로 설정해주세요.' }, { status: 400 });
    }

    const existingPost = await prisma.gamePost.findUnique({ 
      where: { id },
      include: {
        participants: true,
      }
    });

    if (!existingPost) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (existingPost.authorId !== user.id) {
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
    }
    
    // 현재 참여자 수가 새로운 최대 인원 수보다 많으면 수정 불가
    if (existingPost.participants.length > maxParticipants) {
      return NextResponse.json({ error: `현재 참여자 수(${existingPost.participants.length}명)보다 적게 인원을 설정할 수 없습니다.` }, { status: 400 });
    }

    const updatedPost = await prisma.gamePost.update({
      where: { id },
      data: {
        title,
        content,
        maxParticipants,
        startTime: new Date(startTime),
      },
    });

    return NextResponse.json({ data: updatedPost, message: '게시글이 성공적으로 수정되었습니다.' });
  } catch (error) {
    console.error('모집글 수정 오류:', error);
    return NextResponse.json(
      { error: '모집글 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 모집글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteContext['params']> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  
  try {
    const { id } = await params;

    const post = await prisma.gamePost.findUnique({
      where: { id },
      include: { author: { include: { role: true } } },
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
    const userIsAdmin = isAdmin(userRole);

    if (post.authorId !== user.id && !userIsAdmin) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
    }

    await prisma.gamePost.delete({ where: { id } });

    return NextResponse.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    console.error('모집글 삭제 오류:', error);
    return NextResponse.json(
      { error: '모집글을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
