import { useQuery } from '@tanstack/react-query';
import { leaderboardService } from '../services/leaderboardService';

export const useActiveLeaderboard = () => {
  return useQuery({
    queryKey: ['leaderboard', 'active'],
    queryFn: () => leaderboardService.getActiveLeaderboard(),
  });
};

export const useLeaderboard = (seasonId: string) => {
  return useQuery({
    queryKey: ['leaderboard', seasonId],
    queryFn: () => leaderboardService.getLeaderboard(seasonId),
    enabled: !!seasonId,
  });
};
