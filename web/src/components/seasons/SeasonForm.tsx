import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Season, SeasonFormData } from '../../types/season';

interface SeasonFormProps {
  season?: Season;
  onSubmit: (data: SeasonFormData) => void;
  isLoading: boolean;
  error?: Error | null;
}

export const SeasonForm: React.FC<SeasonFormProps> = ({
  season,
  onSubmit,
  isLoading,
  error,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
  });

  const [pointsDistribution, setPointsDistribution] = useState<Record<string, number>>({
    '1': 100,
    '2': 80,
    '3': 60,
    '4': 50,
    '5': 40,
    '6': 35,
    '7': 30,
    '8': 25,
  });

  useEffect(() => {
    if (season) {
      setFormData({
        name: season.name,
        startDate: season.startDate.split('T')[0],
        endDate: season.endDate.split('T')[0],
        isActive: season.isActive,
      });
      if (season.ratingConfigurations && season.ratingConfigurations.length > 0) {
        setPointsDistribution(season.ratingConfigurations[0].pointsDistribution);
      }
    }
  }, [season]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert date strings to ISO-8601 DateTime format
    const startDateTime = formData.startDate ? new Date(formData.startDate + 'T00:00:00.000Z').toISOString() : '';
    const endDateTime = formData.endDate ? new Date(formData.endDate + 'T23:59:59.999Z').toISOString() : '';

    onSubmit({
      ...formData,
      startDate: startDateTime,
      endDate: endDateTime,
      pointsDistribution,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePointsChange = (position: string, points: number) => {
    setPointsDistribution((prev) => ({
      ...prev,
      [position]: points,
    }));
  };

  const addPosition = () => {
    const positions = Object.keys(pointsDistribution).map(Number).sort((a, b) => a - b);
    const nextPosition = positions.length > 0 ? Math.max(...positions) + 1 : 1;
    setPointsDistribution((prev) => ({
      ...prev,
      [nextPosition.toString()]: 20,
    }));
  };

  const removePosition = (position: string) => {
    const newDistribution = { ...pointsDistribution };
    delete newDistribution[position];
    setPointsDistribution(newDistribution);
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
            Season Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Spring 2025"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-foreground">
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              required
              value={formData.startDate}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-foreground">
              End Date *
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              required
              value={formData.endDate}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-foreground">
            Set as active season (deactivates other seasons)
          </label>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground">Rating Points Distribution</h3>
          <button
            type="button"
            onClick={addPosition}
            className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Add Position
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure how many points each placement receives
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(pointsDistribution)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([position, points]) => (
              <div key={position} className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground min-w-[60px]">
                  {position === '1' ? '1st' : position === '2' ? '2nd' : position === '3' ? '3rd' : `${position}th`} Place:
                </label>
                <input
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) =>
                    handlePointsChange(position, parseInt(e.target.value) || 0)
                  }
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {Object.keys(pointsDistribution).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePosition(position)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : season ? 'Update Season' : 'Create Season'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/seasons')}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
