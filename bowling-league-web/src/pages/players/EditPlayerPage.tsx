import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlayer, useUpdatePlayer } from '../../hooks/usePlayers';
import { PlayerForm } from '../../components/players/PlayerForm';

export const EditPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: player, isLoading: isLoadingPlayer } = usePlayer(id!);
  const updatePlayer = useUpdatePlayer();

  const handleSubmit = (data: any) => {
    if (!id) return;

    updatePlayer.mutate(
      { id, data },
      {
        onSuccess: () => {
          navigate('/players');
        },
      }
    );
  };

  if (isLoadingPlayer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading player...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">Player not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Edit Player</h1>
        <p className="mt-2 text-muted-foreground">
          Update player information
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-lg border border-border bg-card p-6">
          <PlayerForm
            player={player}
            onSubmit={handleSubmit}
            isLoading={updatePlayer.isPending}
            error={updatePlayer.error}
          />
        </div>
      </div>
    </div>
  );
};
