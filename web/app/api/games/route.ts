import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || '';
    
    if (searchQuery) {
      
      try {
        
        // 1. 이름으로 검색
        const nameSearchPromise = prisma.game.findMany({
          where: {
            name: { contains: searchQuery, mode: 'insensitive' }
          },
          orderBy: { name: 'asc' },
        });
        
        // 2. 별칭으로 검색
        const aliasSearchPromise = prisma.game.findMany({
          where: {
            aliases: { has: searchQuery }
          },
          orderBy: { name: 'asc' },
        });
        
        const [nameResults, aliasResults] = await Promise.all([nameSearchPromise, aliasSearchPromise]);
        
        // 중복 제거를 위해 Set 사용
        const gamesMap = new Map();
        [...nameResults, ...aliasResults].forEach(game => {
          gamesMap.set(game.id, game);
        });
        
        const games = Array.from(gamesMap.values());
        
        return NextResponse.json(games);
        
      } catch (error) {
        console.error('게임 검색 중 오류 발생 (Prisma 쿼리):', error);
        throw error;
      }
    } else {
      // 검색 쿼리가 없는 경우 일반 조회
      const games = await prisma.game.findMany({
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(games);
    }
  } catch (error) {
    console.error('게임 목록 조회 오류:', error);
    return NextResponse.json(
      { 
        error: '게임 목록을 불러오는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // 관리자 또는 슈퍼 어드민만 게임 추가 가능
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

    // 중복된 이름 체크
    const existingGame = await prisma.game.findFirst({
      where: {
        OR: [
          {
            name: {
              equals: name,
              mode: 'insensitive'
            }
          },
          // 별칭과 중복 체크
          ...(aliasesArray.length > 0
            ? [
                {
                  aliases: {
                    hasSome: aliasesArray.map(alias => alias.toLowerCase())
                  }
                }
              ]
            : [])
        ]
      }
    });

    if (existingGame) {
      return NextResponse.json(
        { error: '이미 존재하는 게임 이름 또는 별칭입니다.' },
        { status: 400 }
      );
    }

    // 게임 생성
    const game = await prisma.game.create({
      data: {
        name,
        description,
        iconUrl,
        aliases: aliasesArray.map(alias => alias.toLowerCase())
      }
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error('게임 생성 오류:', error);
    return NextResponse.json(
      { error: '게임을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  // 관리자 또는 슈퍼 어드민만 게임 수정 가능
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json(
      { error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: '게임 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const { name, description, iconUrl } = await request.json();

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json(
        { error: '게임 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    // 게임 존재 여부 확인
    const existingGame = await prisma.game.findUnique({
      where: { id }
    });

    if (!existingGame) {
      return NextResponse.json(
        { error: '게임을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 중복된 이름 체크 (자기 자신 제외)
    const duplicateGame = await prisma.game.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        NOT: {
          id: id
        }
      }
    });

    if (duplicateGame) {
      return NextResponse.json(
        { error: '이미 존재하는 게임 이름입니다.' },
        { status: 400 }
      );
    }

    // 게임 업데이트
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        name,
        description,
        iconUrl,
      },
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
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  // 관리자 또는 슈퍼 어드민만 게임 삭제 가능
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json(
      { error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: '게임 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 게임 존재 여부 확인
    const existingGame = await prisma.game.findUnique({
      where: { id },
      include: {
        posts: true,
      },
    });

    if (!existingGame) {
      return NextResponse.json(
        { error: '게임을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 연관된 게시물이 있는지 확인
    if (existingGame.posts && existingGame.posts.length > 0) {
      return NextResponse.json(
        { 
          error: '이 게임과 연관된 게시물이 있어 삭제할 수 없습니다. 먼저 연관된 게시물을 삭제해주세요.' 
        },
        { status: 400 }
      );
    }

    // 게임 삭제
    await prisma.game.delete({
      where: { id }
    });

    return NextResponse.json(
      { success: true, message: '게임이 성공적으로 삭제되었습니다.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('게임 삭제 오류:', error);
    return NextResponse.json(
      { error: '게임을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
