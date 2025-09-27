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
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED'
}

// ========== Models ==========

// 권한 모델
export interface Permission {
  id: string;
  type: PermissionType;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// 역할 모델
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

// 사용자 프로필 모델
export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  image?: string;
  bio?: string;
  favoriteGames: UserFavoriteGame[];
  gamePosts: GamePost[];
  gameParticipants: GameParticipant[];
  waitingParticipants: WaitingParticipant[];
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

// 사용자 역할 모델
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  user: UserProfile;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

// 게임 모델
export interface Game {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  aliases: string[];
  gamePosts: GamePost[];
  favoritedBy: UserFavoriteGame[];
  createdAt: Date;
  updatedAt: Date;
}

// 사용자 즐겨찾기 게임 모델
export interface UserFavoriteGame {
  id: string;
  userId: string;
  gameId: string;
  user: UserProfile;
  game: Game;
  createdAt: Date;
  updatedAt: Date;
}

// 게임메이트 게시물 모델
export interface GamePost {
  id: string;
  authorId: string;
  title: string;
  content: JsonValue;
  gameId?: string;
  customGameName?: string;
  startTime: Date;
  maxParticipants: number;
  status: GamePostStatus;
  author: UserProfile;
  game?: Game;
  participants: GameParticipant[];
  waitingList: WaitingParticipant[];
  _count: {
    participants: number;
    waitingList: number;
  };
  // 상세 페이지에서 사용하는 추가 속성들
  isOwner?: boolean;
  isParticipating?: boolean;
  isWaiting?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 게임 참여자 모델
export interface GameParticipant {
  id: string;
  userId?: string;
  gamePostId: string;
  participantType: 'HOST' | 'MEMBER' | 'GUEST';
  guestName?: string;
  user?: UserProfile;
  gamePost: GamePost;
  joinedAt: Date;
}

// 대기 참여자 모델
export interface WaitingParticipant {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  userId: string;
  gamePostId: string;
  availableTime?: string;
  user: UserProfile;
  gamePost: GamePost;
  requestedAt: Date;
}

// 채팅방 모델
export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  gamePostId?: string;
  gamePost?: GamePost;
  messages: ChatMessage[];
  participants: ChatParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

// 채팅 참여자 모델
export interface ChatParticipant {
  id: string;
  userId: string;
  chatRoomId: string;
  user: UserProfile;
  chatRoom: ChatRoom;
  joinedAt: Date;
}

// 채팅 메시지 모델
export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  chatRoomId: string;
  user: UserProfile;
  chatRoom: ChatRoom;
  createdAt: Date;
  updatedAt: Date;
}

// 푸시 구독 모델
export interface PushSubscription {
  id: string;
  userId: string;
  user: UserProfile;
  endpoint: string;
  p256dh: string;
  auth: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 알림 모델
export interface Notification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
  type: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  senderId?: string;
  sender?: UserProfile;
  gamePostId?: string;
  gamePost?: GamePost;
  receipts: NotificationReceipt[];
  createdAt: Date;
  updatedAt: Date;
}

// 알림 수신 모델
export interface NotificationReceipt {
  id: string;
  notificationId: string;
  userId: string;
  notification: Notification;
  user: UserProfile;
  isRead: boolean;
  readAt?: Date;
  isClicked: boolean;
  clickedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 알림 설정 모델
export interface NotificationSetting {
  id: string;
  userId: string;
  user: UserProfile;
  doNotDisturb: DoNotDisturbSettings;
  newGamePost: CategorySettings;
  participatingGame: CategorySettings;
  myGamePost: CategorySettings;
  waitingList: CategorySettings;
  newGamePostSettings: JsonValue;
  participatingGameSettings: JsonValue;
  myGamePostSettings: JsonValue;
  waitingListSettings: JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

// 방해 금지 설정
export interface DoNotDisturbSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: string[];
}

// 카테고리 설정
export interface CategorySettings {
  enabled: boolean;
}

// 게임 필터 설정
export interface GameFilterSettings {
  enabled: boolean;
  mode: 'INCLUDE' | 'EXCLUDE';
  gameIds: string[];
}

// 시간 필터 설정
export interface TimeFilterSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: string[];
}
