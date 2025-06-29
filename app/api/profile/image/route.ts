import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(req: Request) {
  try {
    // 인증 확인 (getServerSession 사용)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: '이미지 URL이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // URL에서 파일명 추출
    const fileName = imageUrl.split('/').pop();
    if (!fileName) {
      return NextResponse.json(
        { error: '잘못된 이미지 URL 형식입니다.' },
        { status: 400 }
      );
    }

    // public/uploads 디렉토리 경로
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsDir, fileName);

    try {
      // 파일 존재 여부 확인 후 삭제
      await fs.access(filePath);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // 파일이 존재하지 않는 경우는 성공으로 처리
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          console.log('파일이 이미 존재하지 않습니다.');
        } else {
          throw error; // 다른 오류는 다시 던지기
        }
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('이미지 삭제 중 오류 발생:', error);
      return NextResponse.json(
        { error: '이미지 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('이미지 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '이미지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
