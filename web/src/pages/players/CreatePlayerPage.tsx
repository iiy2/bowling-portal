import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatePlayer } from '../../hooks/usePlayers';
import { PlayerForm } from '../../components/players/PlayerForm';

export const CreatePlayerPage: React.FC = () => {
  const navigate = useNavigate();
  const createPlayer = useCreatePlayer();

  const handleSubmit = (data: any) => {
    createPlayer.mutate(data, {
      onSuccess: () => {
        navigate('/players');
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Add New Player</h1>
        <p className="mt-2 text-muted-foreground">
          Create a new player profile
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-lg border border-border bg-card p-6">
          <PlayerForm
            onSubmit={handleSubmit}
            isLoading={createPlayer.isPending}
            error={createPlayer.error}
          />
        </div>
      </div>
    </div>
  );
};
