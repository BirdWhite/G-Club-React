import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 공지사항 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 로그인하지 않은 사용자 또는 NONE 역할(검증 대기)은 공지사항 조회 불가
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    if (!user.role || user.role === 'NONE') {
      return NextResponse.json({ error: '회원 승인이 완료된 후 이용 가능합니다.' }, { status: 403 });
    }

    const { id } = await params;
    
    const notice = await prisma.notice.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            userId: true,
            name: true,
            image: true
          }
        },
        lastModifiedBy: {
          select: {
            userId: true,
            name: true,
            image: true
          }
        }
      }
    });

    if (!notice) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (notice.isDeleted) {
      return NextResponse.json(
        { error: '삭제된 공지사항입니다.' },
        { status: 404 }
      );
    }

    // 발행되지 않은 공지사항은 관리자만 조회 가능
    if (!notice.isPublished) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
      }

      const profile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
        include: { role: true }
      });

      if (!profile?.role || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role.name)) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
      }
    }
    
    // 조회수 증가는 별도 API로 처리 (POST /api/notices/[id]/view)

    return NextResponse.json(notice);
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    return NextResponse.json(
      { error: '공지사항을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 공지사항 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { title, content, summary, isPublished, isPinned, allowComments, priority } = await request.json();

    // 공지사항 존재 및 권한 확인
    const existingNotice = await prisma.notice.findUnique({
      where: { id },
      include: {
        author: {
          include: { role: true }
        }
      }
    });

    if (!existingNotice || existingNotice.isDeleted) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 사용자 프로필 확인
    const currentProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true }
    });

    if (!currentProfile) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 관리자만 수정 가능
    const isAdmin = currentProfile.role && ['ADMIN', 'SUPER_ADMIN'].includes(currentProfile.role.name);

    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 입력 검증
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: '제목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 리치텍스트 에디터 내용 확인
    const hasContent = content && 
      typeof content === 'object' && 
      'content' in content && 
      Array.isArray(content.content) && 
      content.content.some((node: { type: string; content?: Array<{ text?: string }> }) => 
        node.type === 'paragraph' && 
        node.content && 
        node.content.some((textNode: { text?: string }) => textNode.text && textNode.text.trim())
      );
    
    if (!hasContent) {
      return NextResponse.json(
        { error: '내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: '제목은 200자 이하로 작성해주세요.' },
        { status: 400 }
      );
    }

    // 리치텍스트 내용 길이 확인 (JSON 문자열로 변환하여 확인)
    const contentString = JSON.stringify(content);
    if (contentString.length > 50000) {
      return NextResponse.json(
        { error: '내용이 너무 깁니다. 간소화해주세요.' },
        { status: 400 }
      );
    }

    // 공지사항 수정
    const updatedNotice = await prisma.notice.update({
      where: { id },
      data: {
        title: title.trim(),
        content: content, // 리치텍스트 JSON 객체 그대로 저장
        summary: summary?.trim() || null,
        isPublished: isPublished || false,
        isPinned: isPinned || false,
        allowComments: allowComments !== undefined ? allowComments : existingNotice.allowComments,
        priority: priority || 0,
        publishedAt: isPublished && !existingNotice.isPublished ? new Date() : existingNotice.publishedAt,
        lastModifiedById: currentProfile.userId // 수정자 정보 저장
      },
      include: {
        author: {
          select: {
            userId: true,
            name: true,
            image: true
          }
        },
        lastModifiedBy: {
          select: {
            userId: true,
            name: true,
            image: true
          }
        }
      }
    });

    // temp 폴더 관련 로직 제거 - 이미지가 이미 정식 폴더에 업로드됨

    // 비공개에서 공개로 변경된 경우 알림 발송
    if (!existingNotice.isPublished && isPublished) {
      try {
        // 공지사항 알림을 받는 사용자들 조회
        const usersWithNoticeEnabled = await prisma.userProfile.findMany({
          where: {
            notificationSettings: {
              noticeEnabled: true
            }
          },
          select: {
            userId: true
          }
        });

        // 그룹 알림 생성
        const notification = await prisma.notification.create({
          data: {
            type: 'NOTICE_NEW',
            title: '새로운 공지사항이 있습니다',
            body: title.trim(),
            icon: '/icons/notice.png',
            actionUrl: `/notices/${id}`,
            isGroupSend: true,
            groupType: 'NOTICE_SUBSCRIBERS',
            groupFilter: {
              noticeEnabled: true
            },
            status: 'PENDING',
            priority: 'HIGH',
            data: {
              noticeId: id,
              noticeTitle: title.trim()
            }
          }
        });

        // 각 사용자에게 알림 수신 내역 생성
        const receipts = usersWithNoticeEnabled.map(user => ({
          notificationId: notification.id,
          userId: user.userId
        }));

        if (receipts.length > 0) {
          await prisma.notificationReceipt.createMany({
            data: receipts
          });
        }

        // 알림 상태를 발송 완료로 업데이트
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            sentAt: new Date()
          }
        });

        console.log(`공지사항 알림 발송 완료: ${usersWithNoticeEnabled.length}명에게 발송`);
      } catch (notificationError) {
        console.error('공지사항 알림 발송 실패:', notificationError);
        // 알림 발송 실패해도 공지사항 수정은 성공으로 처리
      }
    }

    // 사용되지 않는 이미지들 정리
    try {
      const { createServerClient } = await import('@/lib/database/supabase');
      const supabase = await createServerClient();
      
      // 현재 에디터 내용에서 사용 중인 이미지 URL들 추출
      const contentString = JSON.stringify(content);
      const imageUrls: string[] = [];
      
      // 정규식으로 이미지 URL 추출
      const imageUrlRegex = /https:\/\/[^\/]+\/storage\/v1\/object\/public\/notices\/[^"'\s]+/g;
      let match;
      while ((match = imageUrlRegex.exec(contentString)) !== null) {
        imageUrls.push(match[0]);
      }
      
      // URL에서 파일명 추출
      const usedFileNames = new Set<string>();
      imageUrls.forEach(url => {
        const fileName = url.split('/').pop();
        if (fileName) {
          usedFileNames.add(fileName);
        }
      });
      
      // 폴더의 모든 파일 목록 가져오기
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('notices')
        .list(`${id}`, {
          limit: 1000,
          offset: 0
        });

      if (!listError && existingFiles && existingFiles.length > 0) {
        // 사용되지 않는 파일들만 삭제
        const filesToDelete = existingFiles
          .filter(file => !usedFileNames.has(file.name))
          .map(file => `${id}/${file.name}`);
        
        if (filesToDelete.length > 0) {
          console.log(`공지사항 ${id}: 사용되지 않는 ${filesToDelete.length}개 이미지를 삭제합니다.`);
          
          const { error: deleteError } = await supabase.storage
            .from('notices')
            .remove(filesToDelete);

          if (deleteError) {
            console.error('사용되지 않는 이미지 삭제 오류:', deleteError);
          } else {
            console.log(`공지사항 ${id}: 사용되지 않는 ${filesToDelete.length}개 이미지 삭제 완료`);
          }
        } else {
          console.log(`공지사항 ${id}: 삭제할 사용되지 않는 이미지가 없습니다.`);
        }
      } else {
        console.log(`공지사항 ${id}: 기존 이미지가 없습니다.`);
      }
    } catch (error) {
      console.error('사용되지 않는 이미지 정리 중 오류:', error);
    }

    return NextResponse.json(updatedNotice);
  } catch (error) {
    console.error('공지사항 수정 오류:', error);
    return NextResponse.json(
      { error: '공지사항 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 공지사항 삭제 (소프트 삭제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // 공지사항 존재 및 권한 확인
    const existingNotice = await prisma.notice.findUnique({
      where: { id },
      include: {
        author: {
          include: { role: true }
        }
      }
    });

    if (!existingNotice || existingNotice.isDeleted) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 사용자 프로필 확인
    const currentProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true }
    });

    if (!currentProfile) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 관리자만 삭제 가능
    const isAdmin = currentProfile.role && ['ADMIN', 'SUPER_ADMIN'].includes(currentProfile.role.name);

    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 공지사항 소프트 삭제
    await prisma.notice.update({
      where: { id },
      data: { isDeleted: true }
    });

    // 공지사항에 연결된 이미지들 삭제
    try {
      const { createServerClient } = await import('@/lib/database/supabase');
      const supabase = await createServerClient();
      
      // 공지사항 폴더의 모든 이미지 삭제
      const { data: files, error: listError } = await supabase.storage
        .from('notices')
        .list(`notices/${id}`, {
          limit: 1000,
          offset: 0
        });

      if (!listError && files && files.length > 0) {
        const filePaths = files.map(file => `notices/${id}/${file.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from('notices')
          .remove(filePaths);

        if (deleteError) {
          console.error('공지사항 이미지 삭제 오류:', deleteError);
        } else {
          console.log(`공지사항 ${id}의 ${files.length}개 이미지가 삭제되었습니다.`);
        }
      }
    } catch (error) {
      console.error('공지사항 이미지 삭제 중 오류:', error);
    }

    return NextResponse.json({ message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    return NextResponse.json(
      { error: '공지사항 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
