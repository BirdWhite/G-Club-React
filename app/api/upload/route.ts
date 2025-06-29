import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';
import sharp from 'sharp';

// 이미지 업로드 처리 API
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 폼 데이터 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const isTemporary = formData.get('isTemporary') === 'true';
    const postId = formData.get('postId') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: '파일이 제공되지 않았습니다.' }, { status: 400 });
    }
    
    // 파일 유형 검증
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: '지원되지 않는 파일 형식입니다.' }, { status: 400 });
    }
    
    // 파일 크기 제한 (2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기가 너무 큽니다. 2MB 이하의 파일만 업로드 가능합니다.' }, { status: 400 });
    }
    
    // 파일 저장 경로 설정
    let uploadsDir;
    let fileUrl;
    
    if (isTemporary) {
      // 임시 업로드 경로 (사용자별 폴더)
      uploadsDir = join(process.cwd(), 'public', 'uploads', 'temp', session.user.id);
    } else {
      // 영구 업로드 경로
      uploadsDir = join(process.cwd(), 'public', 'uploads');
    }
    
    // 디렉토리가 없으면 생성
    await mkdir(uploadsDir, { recursive: true });
    
    // 파일명 생성 (GIF는 원본 확장자, 나머지는 .webp 확장자)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const originalName = file.name;
    const isGif = file.type === 'image/gif';
    const extension = isGif ? 'gif' : 'webp';
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = join(uploadsDir, fileName);
    
    try {
      // GIF 파일인 경우 원본 그대로 저장
      if (isGif) {
        await writeFile(filePath, buffer);
        console.log(`GIF 파일 원본 유지: ${originalName} (${(buffer.length / 1024).toFixed(2)}KB)`);
      } 
      // 그 외 이미지 파일은 WebP로 변환
      else {
        // sharp를 이용한 이미지 처리
        let sharpImage = sharp(buffer);
        const metadata = await sharpImage.metadata();
        
        // 이미지 최적화 설정
        const maxWidth = 1200; // 최대 너비
        const quality = 80;    // 품질 (0-100)
        
        // 이미지가 최대 너비보다 클 경우 리사이즈
        if (metadata.width && metadata.width > maxWidth) {
          sharpImage = sharpImage.resize(maxWidth);
        }
        
        // WebP 변환 옵션
        const webpOptions = {
          quality,
          alphaQuality: quality,
          lossless: false,
          nearLossless: false,
          smartSubsample: true,
          effort: 4
        };
        
        // WebP로 변환
        const optimizedBuffer = await sharpImage
          .webp(webpOptions)
          .toBuffer({ resolveWithObject: false });
        
        // 파일 저장 (WebP 형식으로 저장)
        await writeFile(filePath, optimizedBuffer);
        
        // 원본 파일 크기와 WebP 변환 후 크기 로깅 (디버깅용)
        console.log(`이미지 WebP 변환 완료: ${originalName} (${(buffer.length / 1024).toFixed(2)}KB -> ${(optimizedBuffer.length / 1024).toFixed(2)}KB)`);
        
        // 이미지 최적화 결과 로그
        const originalSize = buffer.length;
        const optimizedSize = optimizedBuffer.length;
        const savedPercentage = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
        
        console.log(`이미지 최적화 완료: ${originalSize} bytes -> ${optimizedSize} bytes (${savedPercentage}% 감소)`);
      }
      
      // 파일 URL 생성 (도메인 제외한 경로)
      fileUrl = filePath.replace(join(process.cwd(), 'public'), '').replace(/\\/g, '/');
    } catch (optimizeError) {
      console.error('이미지 최적화 중 오류:', optimizeError);
      // 최적화 실패 시 원본 이미지 저장
      await writeFile(filePath, buffer);
    }
    
    // 메타데이터와 함께 URL 반환
    return NextResponse.json({
      url: fileUrl,
      isTemporary,
      fileName,
      postId: postId || undefined
    }, { status: 201 });
  } catch (error) {
    console.error('이미지 처리 중 오류 발생:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '이미지 처리 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
