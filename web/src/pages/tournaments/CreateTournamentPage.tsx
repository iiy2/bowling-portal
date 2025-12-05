import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTournament } from '../../hooks/useTournaments';
import { TournamentForm } from '../../components/tournaments/TournamentForm';

export const CreateTournamentPage: React.FC = () => {
  const navigate = useNavigate();
  const createTournament = useCreateTournament();

  const handleSubmit = (data: any) => {
    createTournament.mutate(data, {
      onSuccess: (tournament) => {
        navigate(`/tournaments/${tournament.id}`);
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create New Tournament</h1>
        <p className="mt-2 text-muted-foreground">
          Set up a new bowling tournament
        </p>
      </div>

      <div className="max-w-4xl">
        <div className="rounded-lg border border-border bg-card p-6">
          <TournamentForm
            onSubmit={handleSubmit}
            isLoading={createTournament.isPending}
            error={createTournament.error}
          />
        </div>
      </div>
    </div>
  );
};
