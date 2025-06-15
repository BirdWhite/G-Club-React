import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 임시 이미지를 영구 저장소로 이동하는 API
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 요청 데이터 파싱
    const { tempImages, postId } = await request.json();
    
    if (!Array.isArray(tempImages) || !tempImages.length) {
      return NextResponse.json({ success: true, images: [] });
    }
    
    const userId = session.user.id;
    const publicDir = path.join(process.cwd(), 'public');
    const results = [];
    
    // 각 임시 이미지에 대해 처리
    for (const tempUrl of tempImages) {
      try {
        // 임시 경로에서 파일명 추출
        if (!tempUrl.includes(`/uploads/temp/${userId}/`)) {
          // 이미 영구 저장소에 있거나 다른 사용자의 이미지인 경우 스킵
          results.push({ originalUrl: tempUrl, newUrl: tempUrl, success: true });
          continue;
        }
        
        const fileName = tempUrl.split('/').pop();
        const tempPath = path.join(publicDir, 'uploads', 'temp', userId, fileName);
        const permanentPath = path.join(publicDir, 'uploads', fileName);
        
        // 파일이 존재하는지 확인
        if (!existsSync(tempPath)) {
          results.push({ originalUrl: tempUrl, newUrl: null, success: false, error: '파일이 존재하지 않습니다.' });
          continue;
        }
        
        // 파일 이동
        await fs.copyFile(tempPath, permanentPath);
        await fs.unlink(tempPath);
        
        const newUrl = `/uploads/${fileName}`;
        results.push({ originalUrl: tempUrl, newUrl, success: true });
      } catch (error) {
        console.error('이미지 이동 오류:', error);
        results.push({ originalUrl: tempUrl, newUrl: null, success: false, error: '이미지 이동 중 오류가 발생했습니다.' });
      }
    }
    
    return NextResponse.json({ success: true, images: results });
  } catch (error) {
    console.error('이미지 이동 오류:', error);
    return NextResponse.json({ error: '이미지 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
