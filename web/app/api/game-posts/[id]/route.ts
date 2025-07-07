import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';

// 모집글 상세 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // 모집글 조회
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
            { isLeader: 'desc' }, // 방장 먼저
            { isReserve: 'asc' }, // 대기자 후
            { joinedAt: 'asc' }, // 먼저 참여한 순
          ],
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            participants: {
              where: { isReserve: false } // 대기자 제외한 참가자 수
            }
          }
        }
      },
    });

    // 댓글의 author를 user로 매핑
    if (post) {
      const mappedComments = post.comments.map(comment => {
        const { author, ...rest } = comment;
        return {
          ...rest,
          user: author
        };
      });
      
      // @ts-ignore - 타입 무시 (Prisma 타입과의 호환성을 위해)
      post.comments = mappedComments;
    }

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
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const { id } = params;
    const { title, content, maxPlayers, startTime, participants = [] } = await request.json();

    // 필수 필드 검증
    if (!title || !content || maxPlayers === undefined || !startTime) {
      return NextResponse.json(
        { error: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 최대 인원수 검증 (2~100명)
    if (maxPlayers < 2 || maxPlayers > 100) {
      return NextResponse.json(
        { error: '인원수는 2명 이상 100명 이하로 설정해주세요.' },
        { status: 400 }
      );
    }

    // 모집글 존재 여부 및 작성자 확인
    const existingPost = await prisma.gamePost.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: '모집글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (existingPost.authorId !== session.user.id) {
      return NextResponse.json(
        { error: '수정 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 트랜잭션으로 모집글 수정과 참여자 업데이트를 함께 처리
    const result = await prisma.$transaction(async (prisma) => {
      try {
        // 1. 모집글 기본 정보 업데이트
        const updatedPost = await prisma.gamePost.update({
          where: { id },
          data: {
            title,
            content,
            maxPlayers,
            startTime: new Date(startTime),
          },
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
      } catch (error) {
        console.error('트랜잭션 내부 오류:', error);
        throw error; // 트랜잭션 롤백을 위해 오류 다시 던지기
      }
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
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    // 모집글 조회
    const existingPost = await prisma.gamePost.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId: session.user.id, isLeader: true },
        },
      },
    });

    // 존재하지 않는 모집글 또는 권한 확인
    if (!existingPost) {
      return NextResponse.json(
        { error: '모집글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 방장 또는 관리자만 삭제 가능
    const isLeader = existingPost.participants.length > 0;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    
    if (!isLeader && !isAdmin) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 모집글 삭제 (관계된 댓글과 참여자도 자동 삭제됨)
    await prisma.gamePost.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('모집글 삭제 오류:', error);
    return NextResponse.json(
      { error: '모집글을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
