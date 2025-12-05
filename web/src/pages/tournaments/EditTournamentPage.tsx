import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTournament, useUpdateTournament } from '../../hooks/useTournaments';
import { TournamentForm } from '../../components/tournaments/TournamentForm';

export const EditTournamentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tournament, isLoading: isLoadingTournament } = useTournament(id!);
  const updateTournament = useUpdateTournament();

  const handleSubmit = (data: any) => {
    if (!id) return;

    updateTournament.mutate(
      { id, data },
      {
        onSuccess: () => {
          navigate(`/tournaments/${id}`);
        },
      },
    );
  };

  if (isLoadingTournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading tournament...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">Tournament not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Edit Tournament</h1>
        <p className="mt-2 text-muted-foreground">
          Update tournament information
        </p>
      </div>

      <div className="max-w-4xl">
        <div className="rounded-lg border border-border bg-card p-6">
          <TournamentForm
            tournament={tournament}
            onSubmit={handleSubmit}
            isLoading={updateTournament.isPending}
            error={updateTournament.error}
          />
        </div>
      </div>
    </div>
  );
};
