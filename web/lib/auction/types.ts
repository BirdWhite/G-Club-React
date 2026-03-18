// 경매 시스템 공유 타입 정의

export interface AuctionConfigData {
  id: string;
  name: string;
  minBidIncrement: number;
  baseTimer: number;
  extensionTimer: number;
  isTierMode: boolean;
  maxTeamSize: number;
  isActive: boolean;
  currentParticipantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuctionTeamMember {
  id: string;
  name: string;
  tier: number;
  winningBid: number | null;
}

export interface AuctionTeamData {
  id: string;
  auctionId: string;
  leaderName: string;
  leaderId: string | null;
  initialPoints: number;
  currentPoints: number;
  members: AuctionTeamMember[];
  createdAt: Date;
  leader?: { userId: string; name: string; image: string | null } | null;
}

export interface AuctionParticipantData {
  id: string;
  auctionId: string;
  name: string;
  tier: number;
  gameRank: string | null;
  prefCharacters: string | null;
  bio: string | null;
  status: string;
  orderIndex: number;
  winningBid: number | null;
  teamId: string | null;
  createdAt: Date;
  team?: { leaderName: string } | null;
}

export interface AuctionBidData {
  id: string;
  auctionId: string;
  teamId: string;
  participantId: string;
  amount: number;
  createdAt: Date;
  team?: { leaderName: string } | null;
}
