'use client';

import React from 'react';
import { GameSearchUI } from './GameSearchUI';

interface DesktopGameSearchProps {
  value: string;
  onChange: (gameId: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
  disabled?: boolean;
}

export function DesktopGameSearch({
  value,
  onChange,
  placeholder = '게임을 선택하세요',
  showAllOption = false,
  className = '',
  disabled = false,
}: DesktopGameSearchProps) {
  return (
    <GameSearchUI
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      showAllOption={showAllOption}
      className={className}
      disabled={disabled}
      size="md"
      variant="default"
      showSearchIcon={true}
      showGameIcon={true}
      maxHeight="240px"
      searchPlaceholder="게임 이름으로 검색..."
    />
  );
}
