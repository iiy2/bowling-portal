export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ratingConfigurations?: RatingConfiguration[];
  _count?: {
    tournaments: number;
  };
  tournaments?: Tournament[];
}

export interface RatingConfiguration {
  id: string;
  seasonId: string;
  pointsDistribution: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  status: string;
  _count?: {
    participations: number;
  };
}

export interface CreateSeasonData {
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  pointsDistribution?: Record<string, number>;
}

export interface UpdateSeasonData extends Partial<CreateSeasonData> {}

export interface UpdateRatingConfigData {
  pointsDistribution: Record<string, number>;
}
