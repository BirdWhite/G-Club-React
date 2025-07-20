import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@/lib/auth/roles';

// 채팅 메시지(댓글) 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id: postId, commentId: messageId } = params;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { chatRoom: true },
    });

    if (!message || message.chatRoom.gamePostId !== postId) {
      return NextResponse.json({ error: '메시지를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true },
    });

    if (!userProfile || !userProfile.role) {
        return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    const userRole = userProfile.role.name as UserRole;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (message.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: '메시지를 삭제할 권한이 없습니다.' }, { status: 403 });
    }

    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('메시지 삭제 중 오류 발생:', error);
    return NextResponse.json({ error: '메시지 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
