import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';



export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // 인증 확인
    if (userError || !user) {
      return NextResponse.json(
        { 
          error: '인증되지 않은 사용자입니다.',
          details: userError?.message 
        }, 
        { status: 401 }
      );
    }
    
    // 사용자 ID 확인
    const userId = user.id;
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: '사용자 ID를 찾을 수 없습니다.',
          details: 'user.id가 비어있습니다.'
        }, 
        { status: 400 }
      );
    }

    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      });

      // 프로필이 없는 경우
      if (!profile) {
        return NextResponse.json({ 
          hasProfile: false,
          message: '프로필이 존재하지 않습니다.'
        });
      }
      
      // 프로필이 있는 경우
      return NextResponse.json({
        hasProfile: true,
        profile: {
          ...profile,
          role: profile.role ? {
            id: profile.role.id,
            name: profile.role.name,
            permissions: profile.role.permissions.map(p => p.name)
          } : null
        },
        message: '프로필을 성공적으로 불러왔습니다.'
      });
      
    } catch (error) {
      return NextResponse.json(
        { 
          error: '프로필 조회 중 오류가 발생했습니다.',
          details: error instanceof Error ? error.message : String(error),
          code: 'PRISMA_ERROR'
        },
        { status: 500 }
      );
    }

      // 프로필이 있는 경우


  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: '프로필 확인 중 오류가 발생했습니다.',
        details: errorMessage,
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
