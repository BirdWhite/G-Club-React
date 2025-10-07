import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';

// UUID 형식 검증 함수
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(request: NextRequest) {
  try {
    const { noticeId } = await request.json();

    // 1. UUID 형식 검증
    if (!noticeId || typeof noticeId !== 'string') {
      return NextResponse.json({
        isValid: false,
        exists: false,
        error: 'ID가 제공되지 않았습니다.'
      }, { status: 400 });
    }

    if (!isValidUUID(noticeId)) {
      return NextResponse.json({
        isValid: false,
        exists: false,
        error: '유효하지 않은 UUID 형식입니다.'
      }, { status: 400 });
    }

    // 2. DB에서 중복 확인
    const existingNotice = await prisma.notice.findUnique({
      where: { id: noticeId },
      select: { id: true }
    });

    return NextResponse.json({
      isValid: true,
      exists: !!existingNotice,
      message: existingNotice ? '이미 존재하는 ID입니다.' : '사용 가능한 ID입니다.'
    });

  } catch (error) {
    console.error('ID 검증 오류:', error);
    return NextResponse.json({
      isValid: false,
      exists: false,
      error: 'ID 검증 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
