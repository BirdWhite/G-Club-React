'use client';

import Image from 'next/image';
import { cn, getDisplayImageUrl, isKakaoImageUrl } from '@/lib/utils/common';

interface ProfileAvatarProps {
  name?: string | null;
  image?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isGuest?: boolean;
  unoptimized?: boolean;
}

export function ProfileAvatar({
  name,
  image,
  size = 'md',
  className,
  isGuest = false,
  unoptimized = false,
}: ProfileAvatarProps) {
  // 크기별 클래스 정의
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-lg',
  };

  const displayImage = getDisplayImageUrl(image);

  // 프로필 이미지가 있는 경우
  if (displayImage) {
    return (
      <div className={cn(
        'relative rounded-full overflow-hidden bg-white p-0.5',
        sizeClasses[size],
        className
      )}>
        <Image
          src={displayImage}
          alt={name || '프로필 이미지'}
          fill
          sizes={`${size === 'sm' ? '32px' : size === 'md' ? '40px' : '48px'}`}
          className="object-cover rounded-full"
          unoptimized={unoptimized || isKakaoImageUrl(image)}
        />
      </div>
    );
  }

  // 프로필 이미지가 없는 경우 - 기본 아바타
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center border border-border',
      isGuest ? 'bg-orange-100 text-orange-800' : 'bg-background text-foreground',
      sizeClasses[size],
      className
    )}>
      <span className="font-bold">
        {name ? name.charAt(0).toUpperCase() : '?'}
      </span>
    </div>
  );
}
