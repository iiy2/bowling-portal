import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonService } from '../services/seasonService';
import type {
  CreateSeasonData,
  UpdateSeasonData,
  UpdateRatingConfigData,
} from '../types/season';

export const useSeasons = () => {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: () => seasonService.getSeasons(),
  });
};

export const useSeason = (id: string) => {
  return useQuery({
    queryKey: ['season', id],
    queryFn: () => seasonService.getSeason(id),
    enabled: !!id,
  });
};

export const useActiveSeason = () => {
  return useQuery({
    queryKey: ['seasons', 'active'],
    queryFn: () => seasonService.getActiveSeason(),
    retry: false,
  });
};

export const useCreateSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSeasonData) => seasonService.createSeason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });
};

export const useUpdateSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSeasonData }) =>
      seasonService.updateSeason(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['seasons', 'active'] });
    },
  });
};

export const useDeleteSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => seasonService.deleteSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['seasons', 'active'] });
    },
  });
};

export const useRatingConfig = (seasonId: string) => {
  return useQuery({
    queryKey: ['rating-config', seasonId],
    queryFn: () => seasonService.getRatingConfig(seasonId),
    enabled: !!seasonId,
  });
};

export const useUpdateRatingConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seasonId,
      data,
    }: {
      seasonId: string;
      data: UpdateRatingConfigData;
    }) => seasonService.updateRatingConfig(seasonId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['rating-config', variables.seasonId],
      });
      queryClient.invalidateQueries({ queryKey: ['season', variables.seasonId] });
    },
  });
};
