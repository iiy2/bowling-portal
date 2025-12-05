import api from '../lib/api';
import type {
  CreateSeasonData,
  UpdateSeasonData,
  UpdateRatingConfigData,
  Season,
  RatingConfiguration,
} from '../types/season';

export const seasonService = {
  async getSeasons(): Promise<Season[]> {
    const response = await api.get<Season[]>('/seasons');
    return response.data;
  },

  async getSeason(id: string): Promise<Season> {
    const response = await api.get<Season>(`/seasons/${id}`);
    return response.data;
  },

  async getActiveSeason(): Promise<Season> {
    const response = await api.get<Season>('/seasons/active');
    return response.data;
  },

  async createSeason(data: CreateSeasonData): Promise<Season> {
    const response = await api.post<Season>('/seasons', data);
    return response.data;
  },

  async updateSeason(id: string, data: UpdateSeasonData): Promise<Season> {
    const response = await api.patch<Season>(`/seasons/${id}`, data);
    return response.data;
  },

  async deleteSeason(id: string): Promise<void> {
    await api.delete(`/seasons/${id}`);
  },

  async getRatingConfig(seasonId: string): Promise<RatingConfiguration> {
    const response = await api.get<RatingConfiguration>(
      `/seasons/${seasonId}/rating-config`
    );
    return response.data;
  },

  async updateRatingConfig(
    seasonId: string,
    data: UpdateRatingConfigData
  ): Promise<RatingConfiguration> {
    const response = await api.patch<RatingConfiguration>(
      `/seasons/${seasonId}/rating-config`,
      data
    );
    return response.data;
  },
};
