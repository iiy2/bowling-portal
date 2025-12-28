import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Tournament, type TournamentFormData, TournamentStatus } from '../../types/tournament';
import { useSeasons } from '../../hooks/useSeasons';

interface TournamentFormProps {
  tournament?: Tournament;
  onSubmit: (data: TournamentFormData) => void;
  isLoading: boolean;
  error?: Error | null;
}

export const TournamentForm: React.FC<TournamentFormProps> = ({
  tournament,
  onSubmit,
  isLoading,
  error,
}) => {
  const navigate = useNavigate();
  const { data: seasons } = useSeasons();

  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    location: string;
    seasonId: string;
    status: TournamentStatus;
    maxParticipants: string;
    description: string;
  }>({
    name: '',
    date: '',
    location: '',
    seasonId: '',
    status: TournamentStatus.UPCOMING,
    maxParticipants: '',
    description: '',
  });

  useEffect(() => {
    if (tournament) {
      // Convert date to datetime-local format
      const date = new Date(tournament.date);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        name: tournament.name,
        date: localDate,
        location: tournament.location,
        seasonId: tournament.seasonId,
        status: tournament.status,
        maxParticipants: tournament.maxParticipants?.toString() || '',
        description: tournament.description || '',
      });
    }
  }, [tournament]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: TournamentFormData = {
      name: formData.name,
      date: new Date(formData.date).toISOString(),
      location: formData.location,
      seasonId: formData.seasonId,
      status: formData.status,
      maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
      description: formData.description || undefined,
    };

    onSubmit(submitData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Tournament Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Spring Championship 2025"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-foreground">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              id="date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="seasonId" className="block text-sm font-medium text-foreground">
              Season *
            </label>
            <select
              id="seasonId"
              name="seasonId"
              required
              value={formData.seasonId}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select a season</option>
              {seasons?.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.isActive && '(Active)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-foreground">
            Location *
          </label>
          <input
            type="text"
            id="location"
            name="location"
            required
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Downtown Bowling Center"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-foreground">
              Status *
            </label>
            <select
              id="status"
              name="status"
              required
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={TournamentStatus.UPCOMING}>Upcoming</option>
              <option value={TournamentStatus.ONGOING}>Ongoing</option>
              <option value={TournamentStatus.COMPLETED}>Completed</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="maxParticipants"
              className="block text-sm font-medium text-foreground"
            >
              Max Participants
            </label>
            <input
              type="number"
              id="maxParticipants"
              name="maxParticipants"
              min="1"
              value={formData.maxParticipants}
              onChange={handleChange}
              placeholder="Optional"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            placeholder="Optional tournament description..."
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : tournament ? 'Update Tournament' : 'Create Tournament'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/tournaments')}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
