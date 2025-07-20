import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@/lib/auth/roles';

// 모집글 상세 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
          orderBy: [
            { isLeader: 'desc' },
            { isReserve: 'asc' },
            { joinedAt: 'asc' },
          ],
        },
        _count: {
          select: {
            participants: {
              where: { isReserve: false }
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
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id } = params;
    const { title, content, maxParticipants, gameDateTime, participants = [] } = await request.json();

    if (!title || !content || maxParticipants === undefined || !gameDateTime) {
      return NextResponse.json({ error: '모든 필수 항목을 입력해주세요.' }, { status: 400 });
    }
    if (maxParticipants < 2 || maxParticipants > 100) {
      return NextResponse.json({ error: '인원수는 2명 이상 100명 이하로 설정해주세요.' }, { status: 400 });
    }

    const existingPost = await prisma.gamePost.findUnique({ where: { id } });

    if (!existingPost) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (existingPost.authorId !== user.id) {
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
    }

    const result = await prisma.$transaction(async (prisma) => {
        const updatedPost = await prisma.gamePost.update({
          where: { id },
          data: {
            title,
            content,
            maxParticipants,
            gameDateTime: new Date(gameDateTime),
          },
        });
        
        // 2. 기존 참여자 삭제 (방장 제외)
        await prisma.gameParticipant.deleteMany({
          where: {
            gamePostId: id,
            isLeader: false
          }
        });

        // 3. 새 참여자 추가 (유효한 참여자만 필터링)
        if (participants && participants.length > 0) {
          const validParticipants = participants.filter((p: any) => p && p.userId);
          if (validParticipants.length > 0) {
            await prisma.gameParticipant.createMany({
              data: validParticipants.map((p: any) => ({
                gamePostId: id,
                userId: p.userId,
                isLeader: false,
                isReserve: Boolean(p.isReserve),
              })),
              skipDuplicates: true // 중복된 참여자는 무시
            });
          }
        }

        // 4. 최종 업데이트된 모집글 정보 가져오기
        const finalPost = await prisma.gamePost.findUnique({
          where: { id },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  }
                }
              }
            }
          }
        });

        if (!finalPost) {
          throw new Error('업데이트된 게시글을 찾을 수 없습니다.');
        }

        return finalPost;
    });

    return NextResponse.json({ data: result, message: '게시글이 성공적으로 수정되었습니다.' });
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
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  
  try {
    const { id } = params;

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

    const userRole = userProfile.role.name as UserRole;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (post.authorId !== user.id && !isAdmin) {
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
