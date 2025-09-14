'use client';

import Image from 'next/image';
import Link from 'next/link';

interface DesktopProfilePageProps {
  targetProfile: any;
  isOwnProfile: boolean;
}

export default function DesktopProfilePage({ targetProfile, isOwnProfile }: DesktopProfilePageProps) {
  // 사용자 ID 표시
  const formatUserId = (userId?: string) => {
    if (!userId) return 'ID: 알 수 없음';
    return `ID: ${userId}`;
  };

  const displayName = targetProfile.name || '사용자';
  const createdAt = targetProfile.createdAt ? new Date(targetProfile.createdAt) : new Date();
  
  // 날짜 포맷팅
  const formattedDate = createdAt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // 생년월일 포맷팅
  const formattedBirthDate = targetProfile?.birthDate 
    ? new Date(targetProfile.birthDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC' // 시간대 문제 방지
      })
    : '...';

  const getRoleLabel = (roleName?: string) => {
    if (!roleName) return '일반 사용자';
    
    const roles: Record<string, string> = {
      USER: '일반 사용자',
      ADMIN: '관리자',
      SUPER_ADMIN: '최고 관리자',
      NONE: '역할 없음'
    };
    return roles[roleName] || roleName;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="profile-card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 프로필 이미지 */}
          <div className="w-32 h-32 md:w-40 md:h-40 relative rounded-full overflow-hidden border-4 border-blue-100 bg-white">
            {targetProfile.image ? (
              <Image
                src={targetProfile.image}
                alt={displayName}
                fill
                className="object-cover"
                priority
                unoptimized={targetProfile.image.includes('127.0.0.1') || targetProfile.image.includes('pnu-ultimate.kro.kr')}
              />
            ) : (
              <div className="w-full h-full bg-white flex items-center justify-center text-gray-500">
                <span className="text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* 프로필 정보 */}
          <div className="flex-1">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-cyber-gray">{targetProfile.name || '사용자'}</h1>
              <p className="text-cyber-darkgray text-sm mb-4">{formatUserId(targetProfile.userId)}</p>
              {isOwnProfile && (
                <Link 
                  href="/profile/edit"
                  className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm md:text-base w-fit"
                >
                  프로필 수정
                </Link>
              )}
            </div>
            
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-cyber-darkgray">이메일</h3>
                <p className="mt-1 text-cyber-gray">
                  {targetProfile.email || '이메일 없음'}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-cyber-darkgray">생년월일</h3>
                <p className="mt-1 text-cyber-gray">
                  {formattedBirthDate}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-cyber-darkgray">가입일</h3>
                <p className="mt-1 text-cyber-gray">
                  {formattedDate}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-cyber-darkgray">권한</h3>
                <p className="mt-1 text-cyber-gray">
                  {getRoleLabel(targetProfile.role?.name)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
