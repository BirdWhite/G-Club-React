'use client';

import React from 'react';
import { GameSearchUI } from './GameSearchUI';

interface MobileGameSearchProps {
  value: string;
  onChange: (gameId: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
  disabled?: boolean;
}

export function MobileGameSearch({
  value,
  onChange,
  placeholder = '게임 선택',
  showAllOption = false,
  className = '',
  disabled = false,
}: MobileGameSearchProps) {
  return (
    <GameSearchUI
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      showAllOption={showAllOption}
      className={className}
      disabled={disabled}
      size="lg"
      variant="outline"
      showSearchIcon={true}
      showGameIcon={true}
      maxHeight="300px"
      searchPlaceholder="게임 검색..."
    />
  );
}
