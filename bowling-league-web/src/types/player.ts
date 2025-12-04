export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  statistics?: PlayerStatistics[];
}

export interface PlayerStatistics {
  id: string;
  seasonId: string | null;
  averageScore: number;
  highestScore: number;
  totalTournamentsPlayed: number;
  totalRatingPoints: number;
  season?: {
    id: string;
    name: string;
  };
}

export interface PlayerListResponse {
  data: Player[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreatePlayerData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdatePlayerData extends Partial<CreatePlayerData> {}

export interface PlayerQueryParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
