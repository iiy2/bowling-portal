import api from '../lib/api';
import type { LeaderboardResponse } from '../types/leaderboard';

export const leaderboardService = {
  getActiveLeaderboard: async (): Promise<LeaderboardResponse> => {
    const response = await api.get<LeaderboardResponse>('/seasons/active/leaderboard');
    return response.data;
  },

  getLeaderboard: async (seasonId: string): Promise<LeaderboardResponse> => {
    const response = await api.get<LeaderboardResponse>(`/seasons/${seasonId}/leaderboard`);
    return response.data;
  },
};
