import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { hasPermission_Server } from '@/lib/auth/serverAuth';

// GET 요청 처리 - 특정 채널의 게시물 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelName: string }> }
) {
  const { channelName } = await params;
  try {
    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const skip = (page - 1) * limit;
    
    const channel = await prisma.channel.findUnique({
      where: { slug: channelName },
      include: { 
        board: {
          select: { id: true, name: true, description: true }
        } 
      },
    });
    
    if (!channel || !channel.board) {
      return NextResponse.json(
        { error: '존재하지 않거나 게시판이 없는 채널입니다.' },
        { status: 404 }
      );
    }
    
    const boardId = channel.board.id;
    
    const posts = await prisma.post.findMany({
      where: { 
        boardId: boardId,
        published: true
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    
    const totalPosts = await prisma.post.count({
      where: { 
        boardId: boardId,
        published: true
      }
    });
    
    return NextResponse.json({
      posts,
      boardInfo: channel.board, // 게시판 정보를 응답에 추가
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      },
    });
  } catch (error) {
    console.error('채널 게시물 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST 요청 처리 - 새 게시글 작성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelName: string }> }
) {
  const { channelName } = await params;
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const { title, content, published = true } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용은 필수 항목입니다.' }, { status: 400 });
    }

    const channel = await prisma.channel.findUnique({
      where: { slug: channelName },
      include: { board: true },
    });

    if (!channel || !channel.board) {
      return NextResponse.json({ error: '존재하지 않거나 게시판이 없는 채널입니다.' }, { status: 404 });
    }

    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
        include: { role: true },
    });

    if (!userProfile || !userProfile.role) {
        return NextResponse.json({ error: '사용자 프로필 또는 역할을 찾을 수 없습니다.' }, { status: 404 });
    }

    const hasWritePermission = await hasPermission_Server(userProfile.role.id, 'POST_CREATE');

    if (!hasWritePermission) {
      return NextResponse.json({ error: '이 게시판에 글을 작성할 권한이 없습니다.' }, { status: 403 });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published,
        board: {
          connect: { id: channel.board.id }
        },
        author: {
          connect: { userId: user.id }
        }
      }
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 