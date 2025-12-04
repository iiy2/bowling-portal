import api from '../lib/api';
import type {
  Tournament,
  CreateTournamentData,
  UpdateTournamentData,
  TournamentQueryParams,
  TournamentListResponse,
  TournamentStatus,
  TournamentApplication,
  TournamentParticipation,
} from '../types/tournament';

export const tournamentService = {
  getTournaments: async (params?: TournamentQueryParams): Promise<TournamentListResponse> => {
    const response = await api.get<TournamentListResponse>('/tournaments', { params });
    return response.data;
  },

  getTournament: async (id: string): Promise<Tournament> => {
    const response = await api.get<Tournament>(`/tournaments/${id}`);
    return response.data;
  },

  getUpcomingTournaments: async (limit?: number): Promise<Tournament[]> => {
    const response = await api.get<Tournament[]>('/tournaments/upcoming', {
      params: { limit },
    });
    return response.data;
  },

  createTournament: async (data: CreateTournamentData): Promise<Tournament> => {
    const response = await api.post<Tournament>('/tournaments', data);
    return response.data;
  },

  updateTournament: async (id: string, data: UpdateTournamentData): Promise<Tournament> => {
    const response = await api.patch<Tournament>(`/tournaments/${id}`, data);
    return response.data;
  },

  updateTournamentStatus: async (
    id: string,
    status: TournamentStatus,
  ): Promise<Tournament> => {
    const response = await api.patch<Tournament>(`/tournaments/${id}/status`, { status });
    return response.data;
  },

  deleteTournament: async (id: string): Promise<void> => {
    await api.delete(`/tournaments/${id}`);
  },

  // Tournament Applications
  applyToTournament: async (tournamentId: string, playerId: string): Promise<TournamentApplication> => {
    const response = await api.post<TournamentApplication>(`/tournaments/${tournamentId}/applications`, { playerId });
    return response.data;
  },

  getApplications: async (tournamentId: string): Promise<TournamentApplication[]> => {
    const response = await api.get<TournamentApplication[]>(`/tournaments/${tournamentId}/applications`);
    return response.data;
  },

  approveApplication: async (tournamentId: string, applicationId: string): Promise<{ application: TournamentApplication; participation: TournamentParticipation }> => {
    const response = await api.patch(`/tournaments/${tournamentId}/applications/${applicationId}/approve`);
    return response.data;
  },

  rejectApplication: async (tournamentId: string, applicationId: string): Promise<TournamentApplication> => {
    const response = await api.patch<TournamentApplication>(`/tournaments/${tournamentId}/applications/${applicationId}/reject`);
    return response.data;
  },

  getParticipants: async (tournamentId: string): Promise<TournamentParticipation[]> => {
    const response = await api.get<TournamentParticipation[]>(`/tournaments/${tournamentId}/participants`);
    return response.data;
  },
};
