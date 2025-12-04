import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playerService } from '../services/playerService';
import type {
  PlayerQueryParams,
  CreatePlayerData,
  UpdatePlayerData,
} from '../types/player';

export const usePlayers = (params?: PlayerQueryParams) => {
  return useQuery({
    queryKey: ['players', params],
    queryFn: () => playerService.getPlayers(params),
  });
};

export const usePlayer = (id: string) => {
  return useQuery({
    queryKey: ['player', id],
    queryFn: () => playerService.getPlayer(id),
    enabled: !!id,
  });
};

export const useCreatePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlayerData) => playerService.createPlayer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
};

export const useUpdatePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlayerData }) =>
      playerService.updatePlayer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['player', variables.id] });
    },
  });
};

export const useDeletePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => playerService.deletePlayer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
};

export const usePlayerSuggestions = (query: string) => {
  return useQuery({
    queryKey: ['player-suggestions', query],
    queryFn: () => playerService.getSuggestions(query),
    enabled: query.length > 0,
  });
};
