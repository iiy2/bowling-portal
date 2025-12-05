import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usePlayers } from '../../hooks/usePlayers';
import { useApplyToTournament } from '../../hooks/useTournaments';
import { useAuthStore } from '../../store/useAuthStore';
import type { Tournament } from '../../types/tournament';

interface TournamentRegistrationProps {
  tournamentId: string;
  tournamentName: string;
  tournament: Tournament;
  isFull?: boolean;
}

export const TournamentRegistration: React.FC<TournamentRegistrationProps> = ({
  tournamentId,
  tournamentName,
  tournament,
  isFull = false,
}) => {
  const { user } = useAuthStore();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const { data: playersData } = usePlayers({});
  const applyToTournament = useApplyToTournament();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) return;

    const isAdminUser = user?.role === 'ADMIN';

    applyToTournament.mutate(
      { tournamentId, playerId: selectedPlayerId },
      {
        onSuccess: () => {
          setSelectedPlayerId('');
          if (isAdminUser) {
            toast.success('Player added to tournament successfully!');
          } else {
            toast.success('Application submitted! Waiting for admin approval.');
          }
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || 'Failed to submit application');
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

  const isAdmin = user?.role === 'ADMIN';

  // Get IDs of players who are already participating or have pending applications
  const participatingPlayerIds = new Set(
    (tournament.participations || []).map((p) => p.playerId)
  );
  const pendingApplicationPlayerIds = new Set(
    (tournament.applications || []).map((a) => a.playerId)
  );
  const excludedPlayerIds = new Set([
    ...participatingPlayerIds,
    ...pendingApplicationPlayerIds,
  ]);

  // Admin can see all active players (excluding those already in tournament), regular users see only their own
  const availablePlayers = isAdmin
    ? (playersData?.data || []).filter(
        (player) => player.isActive && !excludedPlayerIds.has(player.id)
      )
    : (playersData?.data || []).filter(
        (player) =>
          (player.userId === user?.id || player.user?.id === user?.id) &&
          !excludedPlayerIds.has(player.id)
      );

  // Auto-select the first player when data loads (only for non-admins with single player)
  useEffect(() => {
    if (!isAdmin && availablePlayers.length === 1 && !selectedPlayerId) {
      setSelectedPlayerId(availablePlayers[0].id);
    }
  }, [availablePlayers, selectedPlayerId, isAdmin]);

  if (!playersData) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          {isAdmin ? 'Add Player to Tournament' : 'Apply for Tournament'}
        </h2>
        <p className="text-muted-foreground">Loading player data...</p>
      </div>
    );
  }

  if (availablePlayers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          {isAdmin ? 'Add Player to Tournament' : 'Apply for Tournament'}
        </h2>
        <p className="text-muted-foreground">
          {isAdmin
            ? 'No active players available.'
            : 'No player profile found. Please contact support.'}
        </p>
      </div>
    );
  }

  const selectedPlayer = availablePlayers.find((p) => p.id === selectedPlayerId) || availablePlayers[0];

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        {isAdmin ? `Add Player to ${tournamentName}` : `Apply for ${tournamentName}`}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="player" className="block text-sm font-medium text-foreground mb-1">
            {isAdmin ? 'Select Player' : 'Player'}
          </label>
          {!isAdmin && availablePlayers.length === 1 ? (
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-foreground">
              {selectedPlayer.firstName} {selectedPlayer.lastName}
            </div>
          ) : (
            <select
              id="player"
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Choose a player</option>
              {availablePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.firstName} {player.lastName}
                  {player.userId && !isAdmin ? '' : player.userId ? ` (User: ${player.user?.email || 'Unknown'})` : ' (Unassigned)'}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="submit"
          disabled={!selectedPlayerId || applyToTournament.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applyToTournament.isPending ? 'Submitting...' : isAdmin ? 'Add Player' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
};
