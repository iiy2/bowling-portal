import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateSeason } from '../../hooks/useSeasons';
import { SeasonForm } from '../../components/seasons/SeasonForm';

export const CreateSeasonPage: React.FC = () => {
  const navigate = useNavigate();
  const createSeason = useCreateSeason();

  const handleSubmit = (data: any) => {
    createSeason.mutate(data, {
      onSuccess: () => {
        navigate('/seasons');
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create New Season</h1>
        <p className="mt-2 text-muted-foreground">
          Set up a new tournament season with rating configuration
        </p>
      </div>

      <div className="max-w-4xl">
        <div className="rounded-lg border border-border bg-card p-6">
          <SeasonForm
            onSubmit={handleSubmit}
            isLoading={createSeason.isPending}
            error={createSeason.error}
          />
        </div>
      </div>
    </div>
  );
};
