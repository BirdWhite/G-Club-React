import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/database/supabase';

// 공지사항 생성 실패 시 이미지 정리 API
export async function POST(request: NextRequest) {
  try {
    const { noticeId } = await request.json();

    if (!noticeId || typeof noticeId !== 'string') {
      return NextResponse.json(
        { error: '공지사항 ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noticeId)) {
      return NextResponse.json(
        { error: '유효하지 않은 공지사항 ID 형식입니다.' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    
    // 폴더의 모든 파일 목록 가져오기
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('notices')
      .list(`${noticeId}`, {
        limit: 1000,
        offset: 0
      });

    if (listError) {
      console.error('파일 목록 조회 오류:', listError);
      return NextResponse.json(
        { error: '파일 목록 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (existingFiles && existingFiles.length > 0) {
      // 모든 파일 삭제
      const filePaths = existingFiles.map(file => `${noticeId}/${file.name}`);
      
      const { error: deleteError } = await supabase.storage
        .from('notices')
        .remove(filePaths);

      if (deleteError) {
        console.error('이미지 정리 오류:', deleteError);
        return NextResponse.json(
          { error: '이미지 정리에 실패했습니다.' },
          { status: 500 }
        );
      }

      console.log(`공지사항 ${noticeId}: ${existingFiles.length}개 이미지 정리 완료`);
      
      return NextResponse.json({
        message: `${existingFiles.length}개 이미지가 정리되었습니다.`,
        deletedCount: existingFiles.length
      });
    } else {
      console.log(`공지사항 ${noticeId}: 정리할 이미지가 없습니다.`);
      
      return NextResponse.json({
        message: '정리할 이미지가 없습니다.',
        deletedCount: 0
      });
    }

  } catch (error) {
    console.error('이미지 정리 API 오류:', error);
    return NextResponse.json(
      { error: '이미지 정리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
