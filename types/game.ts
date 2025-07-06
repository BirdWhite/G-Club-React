export interface User {
  id: string;
  name: string | null;
  image: string | null;
  email?: string;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface Participant {
  id: string;
  user: User;
  isLeader: boolean;
  isReserve: boolean;
  createdAt: string;
}

export interface Game {
  id: string;
  title: string;
  name: string;
  iconUrl?: string | null;
  image?: string;
  platform?: string;
}

export interface GamePost {
  id: string;
  title: string;
  content: string;
  game: Game;
  author: User;
  participants: Participant[];
  comments: Comment[];
  maxPlayers: number;
  currentParticipants: number;
  startTime: string;
  location: string;
  platform: string;
  contact: string;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
  isParticipating?: boolean;
  isRecruiting?: boolean;
  status: 'OPEN' | 'FULL' | 'COMPLETED';
  meetingPlace?: string;
  _count?: {
    participants: number;
    comments: number;
  };
}
