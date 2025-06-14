import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// 이미지 처리 함수
async function saveImage(base64Image: string, userId: string): Promise<string> {
  try {
    // Base64 데이터에서 실제 이미지 데이터 추출
    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 파일 이름 생성 (고유한 이름을 위해 타임스탬프 추가)
    const fileName = `profile-${userId}-${Date.now()}.jpg`;
    const filePath = join(process.cwd(), 'public', 'uploads', fileName);
    
    // 디렉토리가 없으면 생성
    await writeFile(filePath, buffer);
    
    // 저장된 이미지의 상대 경로 반환
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error('이미지 저장 중 오류 발생:', error);
    throw new Error('이미지 저장에 실패했습니다.');
  }
}

// 프로필 등록 API
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // FormData 파싱
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const age = formData.get('age') as string;
    const profileImage = formData.get('profileImage') as string;
    
    if (!name || !age) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }
    
    // 생년월일 계산 (현재 나이로부터)
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - parseInt(age);
    const birthDate = new Date(birthYear, 0, 1); // 1월 1일로 설정
    
    // 이미지 처리
    let imagePath = '/images/default-profile.png';
    if (profileImage && profileImage !== '') {
      imagePath = await saveImage(profileImage, session.user.id);
    }
    
    // 프로필 생성 또는 업데이트
    const profile = await prisma.profile.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        fullName: name,
        birthDate,
        profileImage: imagePath,
      },
      create: {
        userId: session.user.id,
        fullName: name,
        birthDate,
        profileImage: imagePath,
      },
    });
    
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('프로필 저장 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 프로필 조회 API
export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    const profile = await prisma.profile.findUnique({
      where: {
        userId: session.user.id,
      },
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
