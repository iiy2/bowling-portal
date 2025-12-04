import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tournamentService } from '../services/tournamentService';
import type {
  CreateTournamentData,
  UpdateTournamentData,
  TournamentQueryParams,
  TournamentStatus,
} from '../types/tournament';

export const useTournaments = (params?: TournamentQueryParams) => {
  return useQuery({
    queryKey: ['tournaments', params],
    queryFn: () => tournamentService.getTournaments(params),
  });
};

export const useTournament = (id: string) => {
  return useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentService.getTournament(id),
    enabled: !!id,
  });
};

export const useUpcomingTournaments = (limit?: number) => {
  return useQuery({
    queryKey: ['tournaments', 'upcoming', limit],
    queryFn: () => tournamentService.getUpcomingTournaments(limit),
  });
};

export const useCreateTournament = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTournamentData) => tournamentService.createTournament(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments', 'upcoming'] });
    },
  });
};

export const useUpdateTournament = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTournamentData }) =>
      tournamentService.updateTournament(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tournaments', 'upcoming'] });
    },
  });
};

export const useUpdateTournamentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TournamentStatus }) =>
      tournamentService.updateTournamentStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tournaments', 'upcoming'] });
    },
  });
};

export const useDeleteTournament = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tournamentService.deleteTournament(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments', 'upcoming'] });
    },
  });
};
