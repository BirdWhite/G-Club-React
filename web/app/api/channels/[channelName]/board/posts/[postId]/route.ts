import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { type NextApiRequest } from 'next'

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ channelName: string; postId: string }> }
) => {
  try {
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            userId: true,
            name: true,
            image: true,
          },
        },
        board: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // 조회수 증가
    await prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ channelName: string; postId: string }> }
) => {
  try {
    const { postId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
        include: { role: true },
    });

    if (!userProfile) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    const isAuthor = post.authorId === userProfile.id;
    const isSuperAdmin = userProfile.role?.name === 'SUPER_ADMIN';
    const isAdmin = userProfile.role?.name === 'ADMIN';

    if (!isAuthor && !isAdmin && !isSuperAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { title, content } = await req.json();

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { title, content }
    });

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ channelName: string; postId: string }> }
) => {
  try {
    const { postId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: user.id },
        include: { role: true },
    });

    if (!userProfile) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    const isAuthor = post.authorId === userProfile.id;
    const isSuperAdmin = userProfile.role?.name === 'SUPER_ADMIN';
    const isAdmin = userProfile.role?.name === 'ADMIN';

    if (!isAuthor && !isAdmin && !isSuperAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 