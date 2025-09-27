import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 임시 이미지를 영구 저장소로 이동하는 API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const { tempImages } = await request.json();
    
    if (!Array.isArray(tempImages) || !tempImages.length) {
      return NextResponse.json({ success: true, images: [] });
    }
    
    const userId = user.id;
    const publicDir = path.join(process.cwd(), 'public');
    const results = [];
    
    for (const tempUrl of tempImages) {
      try {
        if (!tempUrl.includes(`/uploads/temp/${userId}/`)) {
          results.push({ originalUrl: tempUrl, newUrl: tempUrl, success: true });
          continue;
        }
        
        const fileName = tempUrl.split('/').pop();
        if (!fileName) continue;

        const tempPath = path.join(publicDir, 'uploads', 'temp', userId, fileName);
        const permanentPath = path.join(publicDir, 'uploads', fileName);
        
        if (!existsSync(tempPath)) {
          results.push({ originalUrl: tempUrl, newUrl: null, success: false, error: '파일이 존재하지 않습니다.' });
          continue;
        }
        
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
