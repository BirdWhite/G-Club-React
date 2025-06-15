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
    
    // 파일 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기가 너무 큽니다. 5MB 이하의 파일만 업로드 가능합니다.' }, { status: 400 });
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
    
    // 파일명 생성 (UUID + 원본 확장자)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const originalName = file.name;
    const extension = originalName.split('.').pop() || '';
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = join(uploadsDir, fileName);
    
    // 이미지 최적화 처리
    try {
      // 이미지 파일 형식 확인
      const imageFormat = file.type.split('/')[1];
      // Buffer 타입 명시적으로 정의
      let optimizedBuffer: Buffer = buffer;
      
      // 이미지 최적화 설정
      const maxWidth = 1200; // 최대 너비
      const quality = 80;    // 품질 (0-100)
      
      // sharp를 이용한 이미지 최적화
      const sharpImage = sharp(buffer);
      const metadata = await sharpImage.metadata();
      
      // 이미지가 최대 너비보다 클 경우에만 리사이즈
      if (metadata.width && metadata.width > maxWidth) {
        sharpImage.resize(maxWidth);
      }
      
      // 파일 형식에 따라 다른 최적화 적용
      if (imageFormat === 'jpeg' || imageFormat === 'jpg') {
        optimizedBuffer = await sharpImage.jpeg({ quality }).toBuffer() as Buffer;
      } else if (imageFormat === 'png') {
        optimizedBuffer = await sharpImage.png({ quality }).toBuffer() as Buffer;
      } else if (imageFormat === 'webp') {
        optimizedBuffer = await sharpImage.webp({ quality }).toBuffer() as Buffer;
      } else if (imageFormat === 'gif') {
        // GIF는 그대로 유지 (애니메이션 보존)
        optimizedBuffer = buffer;
      } else {
        // 지원하지 않는 형식은 원본 그대로 유지
        optimizedBuffer = buffer;
      }
      
      // 최적화된 이미지 저장
      await writeFile(filePath, optimizedBuffer);
      
      // 이미지 최적화 결과 로그
      const originalSize = buffer.length;
      const optimizedSize = optimizedBuffer.length;
      const savedPercentage = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
      
      console.log(`이미지 최적화: ${originalSize} -> ${optimizedSize} 바이트 (${savedPercentage}% 절감)`);
    } catch (optimizeError) {
      console.error('이미지 최적화 중 오류:', optimizeError);
      // 최적화 실패 시 원본 이미지 저장
      await writeFile(filePath, buffer);
    }
    
    // 메타데이터와 함께 URL 반환
    fileUrl = `/uploads/${isTemporary ? 'temp/' + session.user.id + '/' : ''}${fileName}`;
    return NextResponse.json({
      url: fileUrl,
      isTemporary,
      fileName,
      postId: postId || undefined
    }, { status: 201 });
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    return NextResponse.json({ error: '파일 업로드 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
