import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// 공지사항 이미지 업로드 처리 API
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
    const isTemporary = formData.get('isTemporary') === 'true';
    const noticeId = formData.get('noticeId') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: '파일이 제공되지 않았습니다.' }, { status: 400 });
    }

    if (!noticeId) {
      return NextResponse.json({ error: '공지사항 ID가 제공되지 않았습니다.' }, { status: 400 });
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noticeId)) {
      return NextResponse.json({ error: '유효하지 않은 공지사항 ID 형식입니다.' }, { status: 400 });
    }
    
    // 파일 유형 검증
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: '지원되지 않는 파일 형식입니다. JPEG, PNG, GIF, WebP 형식만 업로드 가능합니다.' }, { status: 400 });
    }
    
    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기가 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.' }, { status: 400 });
    }
    
    // 파일 처리
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const isGif = file.type === 'image/gif';
    const isWebP = file.type === 'image/webp';
    const extension = isGif ? 'gif' : 'webp';
    const fileName = `${uuidv4()}.${extension}`;
    
    let finalBuffer: Buffer = buffer;
    if (!isGif && !isWebP) {
      // GIF와 WebP가 아닌 경우에만 변환 (JPEG, PNG 등)
      let sharpImage = sharp(buffer);
      
      // 메타데이터 확인
      const metadata = await sharpImage.metadata();
      
      // 이미지 크기 조정 (최대 1920px)
      if (metadata.width && metadata.width > 1920) {
        sharpImage = sharpImage.resize(1920, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }
      
      // WebP로 변환 및 최적화
      finalBuffer = await sharpImage
        .webp({ 
          quality: 85,
          effort: 6
        })
        .toBuffer();
    } else if (isWebP) {
      // WebP 파일인 경우 크기만 조정 (재변환 없이)
      const sharpImage = sharp(buffer);
      const metadata = await sharpImage.metadata();
      
      // 이미지 크기 조정 (최대 1920px)
      if (metadata.width && metadata.width > 1920) {
        finalBuffer = await sharpImage
          .resize(1920, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .webp({ quality: 85 }) // WebP 품질만 조정
          .toBuffer();
      }
    }
    
    // Supabase Storage에 업로드
    const bucketName = 'notices';
    const filePath = `${noticeId}/${fileName}`; // notices/ 접두사 제거
    
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, finalBuffer, {
        contentType: isGif ? 'image/gif' : 'image/webp',
        upsert: false
      });

    if (error) {
      console.error('Supabase Storage 업로드 오류:', error);
      return NextResponse.json({ error: '파일 업로드에 실패했습니다.' }, { status: 500 });
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      isTemporary,
      fileName
    });

  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 임시 이미지를 실제 공지사항 폴더로 이동
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { tempImagePaths, noticeId } = await request.json();

    if (!tempImagePaths || !Array.isArray(tempImagePaths) || !noticeId) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const bucketName = 'notices';
    const movedPaths: string[] = [];

    for (const tempPath of tempImagePaths) {
      if (tempPath.startsWith('temp/')) {
        const fileName = tempPath.replace('temp/', '');
        const newPath = `notices/${noticeId}/${fileName}`;
        
        // 파일 복사
        const { error: copyError } = await supabase.storage
          .from(bucketName)
          .copy(tempPath, newPath);

        if (copyError) {
          console.error('파일 복사 오류:', copyError);
          continue;
        }

        // 원본 임시 파일 삭제
        await supabase.storage
          .from(bucketName)
          .remove([tempPath]);

        movedPaths.push(newPath);
      }
    }

    return NextResponse.json({
      success: true,
      movedPaths
    });

  } catch (error) {
    console.error('파일 이동 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 이미지 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { imagePaths } = await request.json();

    if (!imagePaths || !Array.isArray(imagePaths)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const bucketName = 'notices';
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove(imagePaths);

    if (error) {
      console.error('파일 삭제 오류:', error);
      return NextResponse.json({ error: '파일 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '파일이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('파일 삭제 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
