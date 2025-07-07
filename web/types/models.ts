// 사용자 관련 타입
export interface User {
  id: string;
  name: string | null;
  image: string | null;
  role: 'NONE' | 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  createdAt?: string;
  updatedAt?: string;
}

// 댓글 관련 타입
export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user: User;
  postId: string;
}

// 참가자 관련 타입
export interface GameParticipant {
  id: string;
  user: User;
  isLeader: boolean;
  isReserve: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 게임 관련 타입
export interface Game {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  aliases: string[]; // 게임 별칭 목록
  createdAt: string;
  updatedAt: string;
}

// 게임 메이트 포스트 관련 타입
export interface GamePostFormData {
  title: string;
  gameId: string;
  maxPlayers: number;
  startTime: string;
  content: string;
}

export interface GamePost extends Omit<GamePostFormData, 'gameId'> {
  id: string;
  game: Game;
  author: User;
  participants: GameParticipant[];
  comments: Comment[];
  currentPlayers: number;
  status: 'OPEN' | 'FULL' | 'COMPLETED'; // 하위 호환성을 위해 유지
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
  isParticipating?: boolean;
  _count?: {
    participants: number;
    comments: number;
  };
}

// 게임 필터링 옵션 타입
export interface GameFilterOptions {
  searchQuery?: string;
  gameId?: string;
  status?: string;
  sortBy?: 'latest' | 'deadline';
  page?: number;
  limit?: number;
}

// 알림 관련 타입
export interface Notification {
  id: string;
  type: 'COMMENT' | 'PARTICIPATION' | 'SYSTEM';
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  sender?: User;
}

// API 응답 공통 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 게시판 관련 타입
export interface Board {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

// 페이지네이션 타입
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
