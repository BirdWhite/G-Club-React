import { JsonValue } from "@prisma/client/runtime/library";

// ========== Enums ==========

export enum PermissionType {
  // 게시물 관련
  POST_CREATE = 'POST_CREATE',
  POST_READ = 'POST_READ',
  POST_UPDATE = 'POST_UPDATE',
  POST_DELETE = 'POST_DELETE',
  POST_MANAGE_ALL = 'POST_MANAGE_ALL',
  
  // 사용자 관련
  USER_VIEW = 'USER_VIEW',
  USER_MANAGE = 'USER_MANAGE',
  USER_ROLE_MANAGE = 'USER_ROLE_MANAGE',
  
  // 채팅 관련
  CHAT_CREATE = 'CHAT_CREATE',
  CHAT_DELETE = 'CHAT_DELETE',
  CHAT_MANAGE = 'CHAT_MANAGE',
  
  // 게임 관련
  GAME_CREATE = 'GAME_CREATE',
  GAME_UPDATE = 'GAME_UPDATE',
  GAME_DELETE = 'GAME_DELETE',
  GAME_MANAGE = 'GAME_MANAGE',
  
  // 관리자
  ADMIN_PANEL_ACCESS = 'ADMIN_PANEL_ACCESS',
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS'
}

export enum ChatRoomType {
  GAME = 'GAME'           // 게임 채팅방
}

export enum GamePostStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

// ========== Models ==========

// 권한 모델
export interface Permission {
  id: string;
  name: string;
  description?: string;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}

// 역할 모델
export interface Role {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  permissions: Permission[];
  userProfiles: UserProfile[];
  createdAt: Date;
  updatedAt: Date;
}

// 사용자 프로필 모델
export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  birthDate: Date;
  image?: string;
  roleId?: string;
  role?: Role;
  createdAt: Date;
  updatedAt: Date;
  isGuest?: boolean; // 게스트 참여자 여부
  
  // 관계 필드
  gameParticipations: GameParticipant[];
  gamePosts: GamePost[];
  chatMessages: ChatMessage[];
  chatRooms: ChatParticipant[];
}




// 채팅 관련 모델
export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  name: string;
  description?: string;
  isActive: boolean;
  maxMembers?: number;
  
  // 관계 필드
  gamePostId?: string;
  gamePost?: GamePost;
  
  // 메시지 및 참여자
  messages: ChatMessage[];
  participants: ChatParticipant[];
  
  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatParticipant {
  id: string;
  chatRoom: ChatRoom;
  chatRoomId: string;
  user: UserProfile;
  userId: string;
  joinedAt: Date;
  lastReadAt: Date;
  isMuted: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  chatRoom: ChatRoom;
  chatRoomId: string;
  user: UserProfile;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// 게임 관련 모델
export interface Game {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  aliases: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GamePost {
  id: string;
  title: string;
  content: JsonValue;
  gameId: string; // Add gameId field
  maxParticipants: number;
  startTime: Date | string;
  status: GamePostStatus;
  game: {
    id: string; // Add id field to game object
    name: string;
    iconUrl?: string | null;
  } | null;
  author: {
    id: string;
    userId: string;
    name: string;
    image?: string | null;
  };
  createdAt: Date | string;
  updatedAt: Date | string;

  // 관계 필드
  participants: GameParticipant[];
  waitingList?: WaitingParticipant[];
  
  // 가상 필드 (클라이언트 측에서 사용)
  isOwner?: boolean;
  isParticipating?: boolean;
  isWaiting?: boolean;
  _count?: {
    participants: number;
    waitingList: number;
  };
}

export interface GameParticipant {
  id: string;
  gamePostId: string;
  participantType: 'MEMBER' | 'GUEST';
  userId?: string;
  user?: {
    id: string;
    userId: string;
    name: string;
    image?: string | null;
  };
  guestName?: string;
  joinedAt: Date | string;
}

export interface WaitingParticipant {
  id: string;
  gamePostId: string;
  userId: string;
  requestedAt: Date | string;
  availableTime?: string | null;
  user: {
    id: string;
    name: string;
    image?: string | null;
  };
}

// 게임 메이트 포스트 폼 데이터
export interface GamePostFormData {
  title: string;
  content: string;
  gameId: string;
  maxPlayers: number;
  startTime: string;
}

// 게임 필터링 옵션
export interface GameFilterOptions {
  searchQuery?: string;
  gameId?: string;
  status?: GamePostStatus | string;
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
  createdAt: Date;
  link?: string;
  sender?: UserProfile;
}

// API 응답 공통 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 페이지네이션 타입
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

