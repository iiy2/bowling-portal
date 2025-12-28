export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  isActive: boolean;
  totalPoints: number;
  tournamentsPlayed: number;
  averagePoints: number;
  tournaments: Array<{
    tournamentId: string;
    tournamentName: string;
    date: string;
    position: number | null;
    points: number;
  }>;
}

export interface LeaderboardResponse {
  season: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  leaderboard: LeaderboardEntry[];
  totalPlayers: number;
  lastUpdated: string;
}
