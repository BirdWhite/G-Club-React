import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';

// Next.js 15에서 동적 라우트 파라미터 처리
type Params = { id: string };

export async function PUT(
  request: Request,
  { params }: { params: Params }
) {
  // params를 비동기적으로 처리
  const { id: gameId } = await Promise.resolve(params);
  const session = await getServerSession(authOptions);
  
  // 관리자 또는 슈퍼 어드민만 게임 수정 가능
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json(
      { error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    );
  }

  try {
    const { name, description, iconUrl, aliases = [] } = await request.json();

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json(
        { error: '게임 이름은 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 별칭이 문자열로 오면 배열로 변환 (쉼표로 구분)
    const aliasesArray = Array.isArray(aliases) 
      ? aliases 
      : typeof aliases === 'string' 
        ? aliases.split(',').map(alias => alias.trim()).filter(Boolean)
        : [];

    // 게임 존재 여부 확인
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      return NextResponse.json(
        { error: '게임을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 중복된 이름 또는 별칭 체크 (자기 자신 제외)
    const duplicateGame = await prisma.game.findFirst({
      where: {
        OR: [
          {
            name: {
              equals: name,
              mode: 'insensitive'
            }
          },
          // 별칭 중복 체크
          ...(aliasesArray.length > 0 ? [
            {
              aliases: {
                hasSome: aliasesArray.map(alias => alias.toLowerCase())
              }
            }
          ] : [])
        ],
        NOT: {
          id: gameId
        }
      }
    });

    if (duplicateGame) {
      return NextResponse.json(
        { error: '이미 존재하는 게임 이름 또는 별칭입니다.' },
        { status: 400 }
      );
    }

    // 게임 업데이트
    const updateData: any = {
      name,
      description,
      iconUrl,
    };

    // 별칭이 제공된 경우에만 업데이트
    if (aliasesArray.length > 0) {
      updateData.aliases = {
        set: aliasesArray
      };
    }

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: updateData,
    });

    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('게임 수정 오류:', error);
    return NextResponse.json(
      { error: '게임을 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  // params를 비동기적으로 처리
  const { id: gameId } = await Promise.resolve(params);
  const session = await getServerSession(authOptions);
  
  // 관리자 또는 슈퍼 어드민만 게임 삭제 가능
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json(
      { error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    );
  }

  try {
    const gameId = params.id;

    // 게임이 존재하는지 확인
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      return NextResponse.json(
        { error: '게임을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 게임 삭제
    await prisma.game.delete({
      where: { id: gameId },
    });

    return NextResponse.json({ message: '게임이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('게임 삭제 오류:', error);
    
    // 외래 키 제약 조건 위반 등의 오류 처리
    if ((error as any).code === 'P2003') {
      return NextResponse.json(
        { error: '이 게임을 사용하는 게시물이 있어 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: '게임 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
