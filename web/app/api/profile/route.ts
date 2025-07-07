import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// 프로필 업데이트 공통 함수
async function handleProfileUpdate(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    const userId = session.user.id || session.user.email;
    
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID를 찾을 수 없습니다.' }, { status: 400 });
    }
    
    if (typeof userId !== 'string') {
      return NextResponse.json({ error: '사용자 ID가 문자열이 아닙니다.' }, { status: 400 });
    }
    
    const formData = await req.formData();
    const fullName = formData.get('fullName') as string;
    const birthDate = formData.get('birthDate') as string;
    const image = formData.get('image') as File | null;
    
    if (!fullName || !birthDate) {
      return NextResponse.json(
        { error: '이름과 생년월일은 필수 항목입니다.' },
        { status: 400 }
      );
    }
    
    let imageUrl = '';
    
    // 이미지 업로드 처리
    if (image && image.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      
      // 업로드 디렉토리가 없으면 생성
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // 파일명 생성 (고유한 이름으로)
      const fileExt = image.name.split('.').pop() || 'jpg';
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // 파일 저장
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.promises.writeFile(filePath, buffer);
      
      imageUrl = `/uploads/${fileName}`;
    }
    
    // 프로필 업데이트 (프로필 테이블과 유저 테이블 모두 업데이트)
    const [updatedProfile] = await prisma.$transaction([
      prisma.profile.upsert({
        where: { userId },
        update: {
          fullName,
          birthDate: new Date(birthDate),
          ...(imageUrl && { profileImage: imageUrl })
        },
        create: {
          userId,
          fullName,
          birthDate: new Date(birthDate),
          profileImage: imageUrl || ''
        }
      }),
      // 유저 테이블의 image 필드도 함께 업데이트
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(imageUrl && { image: imageUrl })
        }
      })
    ]);
    
    return NextResponse.json({ 
      success: true, 
      profile: {
        ...updatedProfile,
        image: updatedProfile.profileImage
      } 
    });
    
  } catch (error) {
    console.error('프로필 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      { error: '프로필 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 프로필 정보 가져오기
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
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
    
    // 사용자 정보와 프로필 정보를 함께 가져오기
    const userWithProfile = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    });
    
    if (!userWithProfile) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 프로필이 없는 경우 기본 프로필 생성
    if (!userWithProfile.profile) {
      // 기본 프로필 생성
      const newProfile = await prisma.profile.create({
        data: {
          userId: userId,
          fullName: userWithProfile.name || `사용자_${userId.substring(0, 6)}`,
          birthDate: new Date('2000-01-01'), // 기본 생년월일
          profileImage: ''
        }
      });
      userWithProfile.profile = newProfile;
    }
    
    // 프로필 이미지 URL에 타임스탬프 추가하여 캐시 무효화
    const profileData = {
      ...userWithProfile.profile,
      fullName: userWithProfile.profile.fullName || userWithProfile.name, // 사용자 이름 우선 사용
      profileImage: userWithProfile.profile.profileImage 
        ? `${userWithProfile.profile.profileImage}?t=${Date.now()}` 
        : null
    };
    
    return NextResponse.json({ 
      profile: profileData,
      user: {
        id: userWithProfile.id,
        name: userWithProfile.name,
        image: userWithProfile.image
      }
    });
  } catch (error) {
    console.error('프로필 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 프로필 업데이트 (PUT)
export async function PUT(req: NextRequest) {
  return handleProfileUpdate(req);
}

// 프로필 생성 또는 수정 (POST)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // 세션에 id가 없는 경우 email을 id로 사용
    const userId = session.user.id || session.user.email;
    
    // userId가 없으면 오류 반환
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID를 찾을 수 없습니다.' }, { status: 400 });
    }
    
    const requestBody = await req.json();
    const { name, birthDate, profileImage: profileImageBase64 } = requestBody;
    
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
            // 이전 프로필 이미지 삭제 완료
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
    
    if (userId === null || userId === undefined) {
      throw new Error('userId is null or undefined');
    }
    if (typeof userId !== 'string') {
      throw new Error('userId is not a string');
    }
    
    // 사용자 존재 확인 (let으로 변경)
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
      },
    });
    
    // 사용자가 없으면 생성
    if (!user) {
      console.log('사용자 없음 - 새로 생성');
      
      try {
        user = await prisma.user.create({
          data: {
            id: userId,
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

    // fullname(name)이 있으면 user.name도 같이 업데이트
    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name }
      });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('프로필 저장 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
