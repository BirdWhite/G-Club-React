import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';
import { UserRole, hasBoardPermission, hasGlobalPermission } from '@/lib/auth/roles';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Next.js 15에서 동적 라우트 파라미터 처리
type Params = Promise<{ id: string }>

// GET 요청 처리 - 게시글 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Next.js 15에서는 params를 비동기적으로 처리해야 함
    const { id } = await params;
    
    // 게시글 조회
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        board: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          }
        }
      }
    });
    
    // 게시글이 없는 경우
    if (!post) {
      return NextResponse.json({ error: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }
    
    // 비공개 게시글인 경우 권한 체크
    if (!post.published) {
      const session = await getServerSession(authOptions);
      
      // 로그인하지 않은 경우 접근 불가
      if (!session || !session.user) {
        return NextResponse.json({ error: '비공개 게시글에 접근할 권한이 없습니다.' }, { status: 403 });
      }
      
      const userRole = (session.user as any).role as UserRole;
      const isAdmin = hasGlobalPermission(userRole, 'canAccessAdminPanel');
      const isAuthor = session.user.id === post.authorId;
      
      // 관리자나 작성자가 아닌 경우 접근 불가
      if (!isAdmin && !isAuthor) {
        return NextResponse.json({ error: '비공개 게시글에 접근할 권한이 없습니다.' }, { status: 403 });
      }
    }
    
    return NextResponse.json({ post });
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH 요청 처리 - 게시글 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    // 로그인하지 않은 경우
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // 게시글 조회
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        board: true
      }
    });
    
    // 게시글이 없는 경우
    if (!post) {
      return NextResponse.json({ error: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }
    
    const userRole = (session.user as any).role as UserRole;
    const isAdmin = hasGlobalPermission(userRole, 'canAccessAdminPanel');
    const isAuthor = session.user.id === post.authorId;
    
    // 자신의 글이 아니고 관리자도 아닌 경우 수정 불가
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: '이 게시글을 수정할 권한이 없습니다.' }, { status: 403 });
    }
    
    const { title, content, published, tempImages } = await request.json();
    
    // 필수 필드 검증
    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용은 필수 항목입니다.' }, { status: 400 });
    }
    
    // 이전 게시글 내용에서 이미지 경로 추출
    const oldImagePaths = extractImagePathsFromContent(post.content);
    
    // 새 게시글 내용에서 이미지 경로 추출
    let processedContent = content;
    
    // 임시 이미지가 있는 경우 영구 저장소로 이동
    if (tempImages && Array.isArray(tempImages) && tempImages.length > 0) {
      try {
        const response = await fetch(new URL('/api/upload/finalize', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tempImages })
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // 임시 URL을 영구 URL로 교체
          if (result.images && Array.isArray(result.images)) {
            result.images.forEach((img: any) => {
              if (img.success && img.originalUrl && img.newUrl) {
                processedContent = processedContent.replace(
                  new RegExp(img.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
                  img.newUrl
                );
              }
            });
          }
        }
      } catch (error) {
        console.error('임시 이미지 처리 오류:', error);
      }
    }
    
    // 새 게시글 내용에서 이미지 경로 추출 (임시 이미지 처리 후)
    const newImagePaths = extractImagePathsFromContent(processedContent);
    
    // 게시글 수정
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        content: processedContent,
        published: published !== undefined ? published : post.published
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        board: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    
    // 사용되지 않는 이미지 삭제 (비동기 처리)
    const imagesToDelete = oldImagePaths.filter(oldPath => !newImagePaths.includes(oldPath));
    if (imagesToDelete.length > 0) {
      Promise.all(imagesToDelete.map(imagePath => deleteImageFile(imagePath)))
        .then(results => {
          console.log(`게시글 ${id} 관련 이미지 ${results.filter(Boolean).length}개 삭제 완료`);
        })
        .catch(error => {
          console.error('게시글 이미지 삭제 오류:', error);
        });
    }
    
    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE 요청 처리 - 게시글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const { id } = await params;
    
    // 게시글 존재 여부 확인
    const post = await prisma.post.findUnique({
      where: { id },
      include: { board: true }
    });
    
    if (!post) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 삭제 권한 확인 (작성자 또는 관리자/슈퍼어드민만 삭제 가능)
    if (post.authorId !== session.user.id && 
        session.user.role !== 'ADMIN' && 
        session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
    }
    
    // 게시글에 포함된 이미지 경로 추출
    const imagePaths = extractImagePathsFromContent(post.content);
    
    // 트랜잭션으로 게시글과 댓글 삭제
    await prisma.$transaction(async (tx) => {
      // 댓글 삭제
      await tx.comment.deleteMany({
        where: { postId: id }
      });
      
      // 게시글 삭제
      await tx.post.delete({
        where: { id }
      });
    });  
    // 이미지 파일 삭제 (비동기 처리)
    if (imagePaths.length > 0) {
      Promise.all(imagePaths.map(imagePath => deleteImageFile(imagePath)))
        .then(results => {
          console.log(`게시글 ${id} 관련 이미지 ${results.filter(Boolean).length}개 삭제 완료`);
        })
        .catch(error => {
          console.error('게시글 이미지 삭제 오류:', error);
        });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    return NextResponse.json({ error: '게시글 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 이미지 URL에서 파일 경로 추출 함수
function extractImagePathsFromContent(content: string): string[] {
  const regex = /src=\"(\/uploads\/[^\"]+)\"/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

// 이미지 파일 삭제 함수
async function deleteImageFile(imagePath: string): Promise<boolean> {
  try {
    const filePath = path.join(process.cwd(), 'public', imagePath);
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('이미지 삭제 오류:', error);
    return false;
  }
}
