import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// 이미지 업로드 처리 API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // 폼 데이터 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadType = formData.get('uploadType') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: '파일이 제공되지 않았습니다.' }, { status: 400 });
    }
    
    // 파일 유형 검증
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: '지원되지 않는 파일 형식입니다. JPEG, PNG, GIF, WebP 형식만 업로드 가능합니다.' }, { status: 400 });
    }
    
    // 파일 크기 제한 (2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기가 너무 큽니다. 2MB 이하의 파일만 업로드 가능합니다.' }, { status: 400 });
    }
    
    // 파일 저장 경로 설정
    let uploadsDir;
    let fileUrl;
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const isGif = file.type === 'image/gif';
    const extension = isGif ? 'gif' : 'webp';
    const fileName = `${uuidv4()}.${extension}`;
    
    let finalBuffer: Buffer = buffer;
    if (!isGif) {
      // 이미지 최적화 (sharp)
      let sharpImage = sharp(buffer);
      const metadata = await sharpImage.metadata();
      const maxWidth = 1200;
      const quality = 80;
      if (metadata.width && metadata.width > maxWidth) {
        sharpImage = sharpImage.resize(maxWidth);
      }
      finalBuffer = await sharpImage.webp({ quality }).toBuffer();
      console.log(`이미지 최적화 완료: ${buffer.length} bytes -> ${finalBuffer.length} bytes`);
    }

    // 'gameIcon' 타입일 경우 Supabase 스토리지에 업로드
    if (uploadType === 'gameIcon') {
      // 관리자 권한 확인
      const { data: userProfile } = await supabase
        .from('UserProfile')
        .select(`
          role:Role(name)
        `)
        .eq('userId', user.id)
        .single();

      if (!userProfile?.role || !['ADMIN', 'SUPER_ADMIN'].includes((userProfile.role as unknown as { name: string }).name)) {
        return NextResponse.json({ 
          error: '게임 아이콘 업로드는 관리자만 가능합니다.' 
        }, { status: 403 });
      }

      const { error } = await supabase.storage
        .from('game-icons')
        .upload(fileName, finalBuffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error('Supabase 스토리지에 업로드 실패했습니다.');
      }

      const { data: { publicUrl } } = supabase.storage.from('game-icons').getPublicUrl(fileName);
      fileUrl = publicUrl;
    } else {
      // 그 외의 경우 기존 로직대로 로컬에 저장
      uploadsDir = join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      const filePath = join(uploadsDir, fileName);
      await writeFile(filePath, finalBuffer);
      fileUrl = filePath.replace(join(process.cwd(), 'public'), '').replace(/\\/g, '/');
    }

    return NextResponse.json({ url: fileUrl }, { status: 201 });

  } catch (error) {
    console.error('이미지 처리 중 오류 발생:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '이미지 처리 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
