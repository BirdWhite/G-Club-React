'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProfileAvatarProps {
  name?: string | null;
  image?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isGuest?: boolean;
  unoptimized?: boolean;
}

export default function ProfileAvatar({
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

  // 프로필 이미지가 있는 경우
  if (image) {
    return (
      <div className={cn(
        'relative rounded-full overflow-hidden bg-white p-0.5',
        sizeClasses[size],
        className
      )}>
        <Image
          src={image}
          alt={name || '프로필 이미지'}
          fill
          sizes={`${size === 'sm' ? '32px' : size === 'md' ? '40px' : '48px'}`}
          className="object-cover rounded-full"
          unoptimized={unoptimized}
        />
      </div>
    );
  }

  // 프로필 이미지가 없는 경우 - 기본 아바타
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center bg-background border border-border',
      sizeClasses[size],
      className
    )}>
      <span className="font-bold text-foreground">
        {name ? name.charAt(0).toUpperCase() : '?'}
      </span>
    </div>
  );
}
