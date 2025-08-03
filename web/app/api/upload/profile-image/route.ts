import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인 (getUser() 사용)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('사용자 인증 오류:', userError);
      return NextResponse.json(
        { 
          error: '인증되지 않은 사용자입니다.',
          code: 'UNAUTHORIZED',
          details: userError?.message
        },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    // 파일 유효성 검사
    if (!file) {
      console.error('파일이 제공되지 않았습니다.');
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (예: 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('파일 크기 초과:', {
        fileName: file.name,
        size: file.size,
        maxSize
      });
      return NextResponse.json(
        { error: '파일 크기는 5MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 파일 형식 검증
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '지원되지 않는 파일 형식입니다. JPEG, PNG, GIF, WebP 형식만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 사용자 ID를 기반으로 파일명 생성 (항상 .webp 확장자 사용)
    const fileName = `${user.id}.webp`;
    console.log('사용자 ID:', user.id, '파일명:', fileName);

    // 파일을 WebP로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const webpBuffer = await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Supabase 스토리지에 파일 업로드
    console.log('웹푸시 버퍼 생성 완료. 크기:', webpBuffer.length, 'bytes');
    
    // 1. 기존 파일 삭제 시도 (있을 경우)
    const { error: deleteError } = await supabase.storage
      .from('profile-images')
      .remove([fileName]);
    
    if (deleteError) {
      console.log('기존 파일이 없거나 삭제할 수 없습니다:', deleteError.message);
    }

    // 2. 새 파일 업로드
    console.log('새 파일 업로드 시작...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(fileName, webpBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/webp'
      });

    if (uploadError) {
      console.error('이미지 업로드 오류:', {
        message: uploadError.message,
        name: uploadError.name,
        details: uploadError,
        stack: uploadError.stack
      });
      return NextResponse.json(
        { 
          error: '이미지 업로드에 실패했습니다.',
          details: uploadError.message 
        },
        { status: 500 }
      );
    }
    
    console.log('이미지 업로드 성공:', uploadData);

    // 업로드된 파일의 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    console.log('이미지 업로드 성공, 프로필 업데이트 시작:', {
      fileName,
      publicUrl,
      userId: user.id
    });

    // Prisma를 사용하여 UserProfile 업데이트 또는 생성
    try {
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {
          image: publicUrl,
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          image: publicUrl,
          name: user.user_metadata?.full_name || '',
          birthDate: new Date() // 기본값으로 현재 날짜 사용 (필수 필드인 경우)
        }
      });
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      return NextResponse.json(
        { 
          success: false,
          error: '이미지는 업로드되었지만 프로필 업데이트에 실패했습니다.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    console.log('프로필 이미지 업데이트 완료:', publicUrl);
    
    return NextResponse.json({ 
      success: true, 
      imageUrl: publicUrl,
      message: '프로필 이미지가 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('이미지 업로드 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 사용자 ID를 기반으로 파일명 생성 (RLS 정책과 일치하도록)
    const fileName = `${user.id}.webp`;
    console.log('삭제할 파일명:', fileName);

    // 이미지 삭제
    const { error: deleteError } = await supabase.storage
      .from('profile-images')
      .remove([fileName]);
      
    console.log('삭제 결과:', { deleteError });

    if (deleteError) {
      console.error('이미지 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '이미지 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '이미지가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('이미지 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
