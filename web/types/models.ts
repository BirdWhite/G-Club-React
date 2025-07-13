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
  CHANNEL = 'CHANNEL',    // 채널 채팅방
  GAME = 'GAME'           // 게임 채팅방
}

export enum GamePostStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
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
  
  // 관계 필드
  comments: Comment[];
  posts: Post[];
  gameParticipations: GameParticipant[];
  gamePosts: GamePost[];
  subscriptions: ChannelSubscription[];
  chatMessages: ChatMessage[];
  chatRooms: ChatParticipant[];
}

// 사용자 타입 (기존 User와의 호환성을 위해 유지)
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  profile?: UserProfile; // UserProfile과의 연결을 위한 옵셔널 필드
}

// 채널 관련 모델
export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  isPrivate: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  
  // 관계 필드
  board?: Board;
  chatRoom?: ChatRoom;
  subscribers: ChannelSubscription[];
}

export interface Board {
  id: string;
  channel: Channel;
  channelId: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  posts: Post[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelSubscription {
  id: string;
  channel: Channel;
  channelId: string;
  user: UserProfile;
  userId: string;
  subscribedAt: Date;
  updatedAt: Date;
}

// 게시물 관련 모델
export interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  boardId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // 관계 필드
  comments: Comment[];
  author: UserProfile;
  board: Board;
  
  // 추가 필드
  viewCount: number;
  likeCount: number;
  isNotice: boolean;
  isSecret: boolean;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // 관계 필드
  author: UserProfile;
  post: Post;
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
  channelId?: string;
  channel?: Channel;
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
  description?: string;
  iconUrl?: string;
  aliases: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GamePost {
  id: string;
  title: string;
  content: string;
  maxPlayers: number;
  startTime: Date;
  status: GamePostStatus;
  gameId: string;
  authorId: string;
  chatRoomId?: string;
  
  // 관계 필드
  game: Game;
  author: UserProfile;
  participants: GameParticipant[];
  chatRoom?: ChatRoom;
  
  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
  
  // 가상 필드 (클라이언트 측에서 사용)
  isOwner?: boolean;
  isParticipating?: boolean;
  _count?: {
    participants: number;
    comments: number;
  };
}

export interface GameParticipant {
  id: string;
  gamePostId: string;
  userId: string;
  isLeader: boolean;
  isReserve: boolean;
  
  // 관계 필드
  gamePost: GamePost;
  user: UserProfile;
  
  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
}

// 게임 메이트 포스트 폼 데이터
export interface GamePostFormData {
  title: string;
  content: string;
  gameId: string;
  maxPlayers: number;
  startTime: string | Date;
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
  sender?: User;
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

