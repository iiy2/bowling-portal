import api from '../lib/api';
import type {
  Player,
  PlayerListResponse,
  CreatePlayerData,
  UpdatePlayerData,
  PlayerQueryParams,
} from '../types/player';

export const playerService = {
  async getPlayers(params?: PlayerQueryParams): Promise<PlayerListResponse> {
    const response = await api.get<PlayerListResponse>('/players', { params });
    return response.data;
  },

  async getPlayer(id: string): Promise<Player> {
    const response = await api.get<Player>(`/players/${id}`);
    return response.data;
  },

  async createPlayer(data: CreatePlayerData): Promise<Player> {
    const response = await api.post<Player>('/players', data);
    return response.data;
  },

  async updatePlayer(id: string, data: UpdatePlayerData): Promise<Player> {
    const response = await api.patch<Player>(`/players/${id}`, data);
    return response.data;
  },

  async deletePlayer(id: string): Promise<void> {
    await api.delete(`/players/${id}`);
  },

  async getSuggestions(query: string): Promise<Player[]> {
    const response = await api.get<Player[]>('/players/suggestions', {
      params: { q: query },
    });
    return response.data;
  },
};
