import type { Season } from './season';
import type { Player } from './player';

export const TournamentStatus = {
  UPCOMING: 'UPCOMING',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
} as const;

export type TournamentStatus = typeof TournamentStatus[keyof typeof TournamentStatus];

export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  seasonId: string;
  status: TournamentStatus;
  maxParticipants?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  season?: Season;
  participations?: TournamentParticipation[];
  applications?: TournamentApplication[];
  _count?: {
    participations: number;
  };
}

export interface TournamentParticipation {
  id: string;
  tournamentId: string;
  playerId: string;
  finalPosition?: number;
  handicap?: number;
  gameScores?: number[];
  totalScore?: number;
  ratingPointsEarned?: number;
  createdAt: string;
  updatedAt: string;
  player?: Player;
  tournament?: Tournament;
}

export interface CreateTournamentData {
  name: string;
  date: string;
  location: string;
  seasonId: string;
  status?: TournamentStatus;
  maxParticipants?: number;
  description?: string;
}

export interface UpdateTournamentData {
  name?: string;
  date?: string;
  location?: string;
  seasonId?: string;
  status?: TournamentStatus;
  maxParticipants?: number;
  description?: string;
}

export interface TournamentQueryParams {
  seasonId?: string;
  status?: TournamentStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface TournamentListResponse {
  data: Tournament[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const ApplicationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ApplicationStatus = typeof ApplicationStatus[keyof typeof ApplicationStatus];

export interface TournamentApplication {
  id: string;
  tournamentId: string;
  playerId: string;
  applicationDate: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  player?: Player;
  tournament?: Tournament;
}
