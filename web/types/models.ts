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
  
  // 이용약관 동의 관련
  termsAgreed: boolean;
  termsAgreedAt?: Date;
  privacyAgreed: boolean;
  privacyAgreedAt?: Date;
  
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
  content: string; // JsonValue에서 string으로 변경
  gameId?: string;
  customGameName?: string;
  startTime: Date;
  maxParticipants: number;
  status: GamePostStatus;
  isFull: boolean;
  viewCount: number;
  author: UserProfile;
  game?: Game;
  participants: GameParticipant[];
  waitingList: WaitingParticipant[];
  comments?: Comment[];
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
  status: 'ACTIVE' | 'LEFT_EARLY' | 'COMPLETED';
  guestName?: string;
  user?: UserProfile;
  gamePost: GamePost;
  joinedAt: Date;
  leftAt?: Date;
}

// 대기 참여자 모델
export interface WaitingParticipant {
  id: string;
  status: 'WAITING' | 'TIME_WAITING' | 'INVITED' | 'CANCELED';
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

// 알림 설정 모델 - 개별 컬럼 버전
export interface NotificationSetting {
  id: string;
  userId: string;
  user: UserProfile;
  
  // 방해 금지 시간 설정
  doNotDisturbEnabled: boolean;
  doNotDisturbStart: string | null;
  doNotDisturbEnd: string | null;
  doNotDisturbDays: string[];
  
  // 신규 게임메이트 글 알림 설정
  newGamePostEnabled: boolean;
  newGamePostMode: 'all' | 'favorites' | 'custom';
  customGameIds: string[];
  
  // 참여중인 모임 알림 설정
  participatingGameEnabled: boolean;
  participatingGameFullMeeting: boolean;
  participatingGameMemberJoin: boolean;
  participatingGameMemberLeave: boolean;
  participatingGameTimeChange: boolean;
  participatingGameCancelled: boolean;
  
  // 참여중인 모임 - 모임 전 알람 설정
  participatingGameBeforeMeetingEnabled: boolean;
  participatingGameBeforeMeetingMinutes: number;
  participatingGameBeforeMeetingOnlyFull: boolean;
  
  // 참여중인 모임 - 모임 시작 알람 설정
  participatingGameMeetingStartEnabled: boolean;
  participatingGameMeetingStartOnlyFull: boolean;
  
  // 내가 작성한 모임 알림 설정
  myGamePostEnabled: boolean;
  myGamePostFullMeeting: boolean;
  myGamePostMemberJoin: boolean;
  myGamePostMemberLeave: boolean;
  
  // 내가 작성한 모임 - 모임 전 알람 설정
  myGamePostBeforeMeetingEnabled: boolean;
  myGamePostBeforeMeetingMinutes: number;
  myGamePostBeforeMeetingOnlyFull: boolean;
  
  // 내가 작성한 모임 - 모임 시작 알람 설정
  myGamePostMeetingStartEnabled: boolean;
  myGamePostMeetingStartOnlyFull: boolean;
  
  // 예비 참여 알림 설정
  waitingListEnabled: boolean;
  
  // 공지사항 알림 설정
  noticeEnabled: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// ========== 공통 타입 정의 ==========

// 기본 활성화 설정
export interface BaseEnabledSettings {
  enabled: boolean;
}

// 모임 전/시작 알림 공통 설정
export interface MeetingNotificationSettings {
  enabled: boolean;
  minutes: number;
  onlyFullMeeting: boolean;
}

export interface MeetingStartSettings {
  enabled: boolean;
  onlyFullMeeting: boolean;
}

// ========== 알림 설정 인터페이스들 ==========

// 방해 금지 설정
export interface DoNotDisturbSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: string[];
}

// 신규 게임메이트 글 알림 설정
export interface NewGamePostSettings {
  enabled: boolean;
  mode: 'all' | 'favorites' | 'custom';
  customGameIds: string[];
}

// 참여중인 모임 알림 설정
export interface ParticipatingGameSettings {
  enabled: boolean;
  fullMeeting: boolean;
  memberJoin: boolean;
  memberLeave: boolean;
  timeChange: boolean;
  gameCancelled: boolean;
  beforeMeeting: MeetingNotificationSettings;
  meetingStart: MeetingStartSettings;
}

// 내가 작성한 모임 알림 설정
export interface MyGamePostSettings {
  enabled: boolean;
  fullMeeting: boolean;
  memberJoin: boolean;
  memberLeave: boolean;
  beforeMeeting: MeetingNotificationSettings;
  meetingStart: MeetingStartSettings;
}

// 예비 참여 알림 설정 (단순화)
export type WaitingListSettings = BaseEnabledSettings;

// 통합 댓글 모델 (게임메이트 포스트와 공지사항 모두 사용)
export interface Comment {
  id: string;
  gamePostId?: string;
  gamePost?: GamePost;
  noticeId?: string;
  notice?: Notice;
  authorId: string;
  author: UserProfile;
  content: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notice {
  id: string;
  title: string;
  content: any; // JsonValue 타입
  summary?: string;
  authorId: string;
  author: UserProfile;
  lastModifiedById?: string;
  lastModifiedBy?: UserProfile;
  isPublished: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  allowComments: boolean;
  viewCount: number;
  priority: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comments?: Comment[];
}

