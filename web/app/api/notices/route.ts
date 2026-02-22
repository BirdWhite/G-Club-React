import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/database/supabase';
import prisma from '@/lib/database/prisma';

// 공지사항 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 로그인하지 않았거나 roleId가 null/NONE(검증 대기)은 공지사항 조회 불가
    const user = await getCurrentUser();
    if (!user || !user.role || user.role === 'NONE') {
      return NextResponse.json({
        success: true,
        notices: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true';

    const skip = (page - 1) * limit;

    // 권한 확인 (관리자만 미발행 공지사항 조회 가능)
    const whereClause: Record<string, unknown> = {
      isDeleted: false,
    };

    if (!includeUnpublished) {
      whereClause.isPublished = true;
    } else {
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

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where: whereClause,
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
        },
        orderBy: [
          { isPinned: 'desc' },
          { priority: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.notice.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      notices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('공지사항 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '공지사항을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 공지사항 작성
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true }
    });

    if (!profile?.role || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role.name)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { title, content, summary, isPublished, isPinned, allowComments, priority } = await request.json();

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

    // localStorage에서 생성된 ID 사용 (있다면)
    const tempNoticeId = request.headers.get('x-temp-notice-id');
    
    // ID 검증 (tempNoticeId가 있는 경우)
    if (tempNoticeId) {
      // UUID 형식 검증
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tempNoticeId)) {
        return NextResponse.json(
          { error: '유효하지 않은 ID 형식입니다.' },
          { status: 400 }
        );
      }

      // 중복 확인
      const existingNotice = await prisma.notice.findUnique({
        where: { id: tempNoticeId },
        select: { id: true }
      });

      if (existingNotice) {
        return NextResponse.json(
          { error: '이미 존재하는 ID입니다.' },
          { status: 409 }
        );
      }
    }
    
    // 공지사항 생성
    const notice = await prisma.notice.create({
      data: {
        id: tempNoticeId || undefined, // tempNoticeId가 있으면 사용, 없으면 자동 생성
        title: title.trim(),
        content: content, // 리치텍스트 JSON 객체 그대로 저장
        summary: summary?.trim() || null,
        authorId: profile.userId,
        isPublished: isPublished || false,
        isPinned: isPinned || false,
        allowComments: allowComments !== undefined ? allowComments : true,
        priority: priority || 0,
        publishedAt: isPublished ? new Date() : null
      },
      include: {
        author: {
          select: {
            userId: true,
            name: true,
            image: true
          }
        }
      }
    });

    // temp 폴더 관련 로직 제거 - 이미지가 이미 정식 폴더에 업로드됨

    // 공지사항이 공개된 경우 알림 발송
    if (isPublished) {
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
            actionUrl: `/notices/${notice.id}`,
            isGroupSend: true,
            groupType: 'NOTICE_SUBSCRIBERS',
            groupFilter: {
              noticeEnabled: true
            },
            status: 'PENDING',
            priority: 'HIGH',
            data: {
              noticeId: notice.id,
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
        // 알림 발송 실패해도 공지사항 생성은 성공으로 처리
      }
    }

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error('공지사항 작성 오류:', error);
    return NextResponse.json(
      { error: '공지사항 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
