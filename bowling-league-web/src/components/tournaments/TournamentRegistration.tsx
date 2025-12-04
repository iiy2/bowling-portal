import React, { useState } from 'react';
import { usePlayers } from '../../hooks/usePlayers';
import { useApplyToTournament } from '../../hooks/useTournaments';
import { useAuthStore } from '../../store/useAuthStore';

interface TournamentRegistrationProps {
  tournamentId: string;
  tournamentName: string;
  isFull?: boolean;
}

export const TournamentRegistration: React.FC<TournamentRegistrationProps> = ({
  tournamentId,
  tournamentName,
  isFull = false,
}) => {
  const { user } = useAuthStore();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const { data: playersData } = usePlayers({ userId: user?.id });
  const applyToTournament = useApplyToTournament();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) return;

    applyToTournament.mutate(
      { tournamentId, playerId: selectedPlayerId },
      {
        onSuccess: () => {
          setSelectedPlayerId('');
          alert('Application submitted successfully! Waiting for admin approval.');
        },
        onError: (error: any) => {
          alert(error.response?.data?.message || 'Failed to submit application');
        },
      }
    );
  };

  if (!user) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Register for Tournament</h2>
        <p className="text-muted-foreground">Please log in to register for this tournament.</p>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Register for Tournament</h2>
        <p className="text-destructive">This tournament is full.</p>
      </div>
    );
  }

  const myPlayers = playersData?.data || [];

  if (myPlayers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Register for Tournament</h2>
        <p className="text-muted-foreground">
          You don't have any players yet. Create a player profile first to register.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Register for {tournamentName}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="player"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Select Player
          </label>
          <select
            id="player"
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Choose a player</option>
            {myPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.firstName} {player.lastName}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!selectedPlayerId || applyToTournament.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applyToTournament.isPending ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
};
