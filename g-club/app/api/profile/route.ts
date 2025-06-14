import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// 프로필 정보 가져오기
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('프로필 조회 세션:', JSON.stringify(session, null, 2));
    
    if (!session?.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // 세션에 id가 없는 경우 email을 id로 사용
    const userId = session.user.id || session.user.email;
    
    // userId가 없으면 오류 반환
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID를 찾을 수 없습니다.' }, { status: 400 });
    }
    
    if (typeof userId !== 'string') {
      return NextResponse.json({ error: '사용자 ID가 문자열이 아닙니다.' }, { status: 400 });
    }
    
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });
    
    if (!profile) {
      return NextResponse.json({ error: '프로필이 존재하지 않습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('프로필 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 프로필 생성 또는 수정
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('프로필 저장 세션:', JSON.stringify(session, null, 2));
    
    if (!session?.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // 세션에 id가 없는 경우 email을 id로 사용
    const userId = session.user.id || session.user.email;
    
    // userId가 없으면 오류 반환
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID를 찾을 수 없습니다.' }, { status: 400 });
    }
    
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const birthDate = formData.get('birthDate') as string;
    const profileImageBase64 = formData.get('profileImage') as string;
    
    if (!name || !birthDate) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }
    
    let profileImagePath = null;
    
    // 이미지가 제공된 경우 저장
    if (profileImageBase64 && profileImageBase64.includes('base64')) {
      // 디렉토리 생성
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // 기존 프로필 이미지가 있으면 삭제
      const existingProfile = await prisma.profile.findUnique({
        where: { userId: userId },
        select: { profileImage: true }
      });
      
      if (existingProfile?.profileImage && 
          existingProfile.profileImage.startsWith('/uploads/') && 
          existingProfile.profileImage !== '/images/default-profile.png') {
        try {
          const oldImagePath = path.join(process.cwd(), 'public', existingProfile.profileImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log(`이전 프로필 이미지 삭제 완료: ${oldImagePath}`);
          }
        } catch (error) {
          console.error('이전 프로필 이미지 삭제 중 오류 발생:', error);
          // 이전 이미지 삭제 실패해도 계속 진행
        }
      }
      
      // base64 데이터에서 실제 이미지 데이터 추출
      const base64Data = profileImageBase64.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 파일 저장
      const filename = `${uuidv4()}.jpg`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      // 상대 경로 저장 (public 폴더는 URL에서 생략됨)
      profileImagePath = `/uploads/${filename}`;
    }
    
    // 사용자 존재 확인
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    // 사용자가 없으면 생성
    if (!user) {
      console.log('사용자가 존재하지 않아 생성합니다:', userId);
      
      try {
        if (userId === null || userId === undefined) {
          throw new Error('userId is null or undefined');
        }
        if (typeof userId !== 'string') {
          throw new Error('userId is not a string');
        }
        user = await prisma.user.create({
          data: {
            id: userId,
            email: `${userId}@kakao.user`,
            name: `사용자${userId.length > 5 ? userId.substring(0, 5) : userId}`,
          },
        });
        console.log('사용자 생성 성공:', user);
      } catch (error) {
        console.error('사용자 생성 중 오류 발생:', error);
        return NextResponse.json({ error: '사용자 생성 중 오류가 발생했습니다.' }, { status: 500 });
      }
    }
    
    // 프로필 생성 또는 업데이트
    const profile = await prisma.profile.upsert({
      where: { userId: userId },
      update: {
        fullName: name,
        birthDate: new Date(birthDate),
        ...(profileImagePath && { profileImage: profileImagePath }),
      },
      create: {
        userId: userId,
        fullName: name,
        birthDate: new Date(birthDate),
        profileImage: profileImagePath || '/images/default-profile.png',
      },
    });
    
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('프로필 저장 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
