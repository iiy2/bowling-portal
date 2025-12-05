import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSeason, useUpdateSeason } from '../../hooks/useSeasons';
import { SeasonForm } from '../../components/seasons/SeasonForm';

export const EditSeasonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: season, isLoading: isLoadingSeason } = useSeason(id!);
  const updateSeason = useUpdateSeason();

  const handleSubmit = (data: any) => {
    if (!id) return;

    updateSeason.mutate(
      { id, data },
      {
        onSuccess: () => {
          navigate('/seasons');
        },
      }
    );
  };

  if (isLoadingSeason) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading season...</p>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">Season not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Edit Season</h1>
        <p className="mt-2 text-muted-foreground">
          Update season information and rating configuration
        </p>
      </div>

      <div className="max-w-4xl">
        <div className="rounded-lg border border-border bg-card p-6">
          <SeasonForm
            season={season}
            onSubmit={handleSubmit}
            isLoading={updateSeason.isPending}
            error={updateSeason.error}
          />
        </div>
      </div>
    </div>
  );
};
