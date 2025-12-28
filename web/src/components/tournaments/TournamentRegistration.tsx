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
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const isAdmin = user?.role === 'ADMIN';

  // Fetch all players for admin (no isActive filter), regular users get default filtering
  const { data: playersData } = usePlayers(isAdmin ? { limit: 1000 } : {});
  const applyToTournament = useApplyToTournament();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isAdmin) {
      // Admin: handle multiple players
      if (selectedPlayerIds.length === 0) return;

      let successCount = 0;
      let failCount = 0;

      // Submit applications sequentially
      const submitApplications = async () => {
        for (const playerId of selectedPlayerIds) {
          try {
            await applyToTournament.mutateAsync({ tournamentId, playerId });
            successCount++;
          } catch (error: any) {
            failCount++;
          }
        }

        // Show summary notification
        if (successCount > 0 && failCount === 0) {
          toast.success(`Successfully added ${successCount} player${successCount > 1 ? 's' : ''} to tournament!`);
        } else if (successCount > 0 && failCount > 0) {
          toast.success(`Added ${successCount} player${successCount > 1 ? 's' : ''}, ${failCount} failed`);
        } else {
          toast.error('Failed to add players');
        }

        // Reset selection
        setSelectedPlayerIds([]);
      };

      submitApplications();
    } else {
      // Regular user: handle single player
      if (!selectedPlayerId) return;

      applyToTournament.mutate(
        { tournamentId, playerId: selectedPlayerId },
        {
          onSuccess: () => {
            setSelectedPlayerId('');
            toast.success('Application submitted! Waiting for admin approval.');
          },
          onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to submit application');
          },
        }
      );
    }
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

  // Admin can see all players (excluding those already in tournament), regular users see only their own
  const availablePlayers = isAdmin
    ? (playersData?.data || []).filter(
        (player) => !excludedPlayerIds.has(player.id)
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
          <label className="block text-sm font-medium text-foreground mb-2">
            {isAdmin ? 'Select Players' : 'Player'}
          </label>
          {!isAdmin && availablePlayers.length === 1 ? (
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-foreground">
              {selectedPlayer.firstName} {selectedPlayer.lastName}
            </div>
          ) : isAdmin ? (
            <div className="rounded-md border border-input bg-background max-h-80 overflow-y-auto">
              {availablePlayers.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <label
                    key={player.id}
                    className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border last:border-b-0 ${!player.isActive ? 'opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlayerIds([...selectedPlayerIds, player.id]);
                        } else {
                          setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== player.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    <span className="flex-1 text-sm text-foreground">
                      {player.firstName} {player.lastName}
                      {!player.isActive && (
                        <span className="ml-2 text-xs text-destructive font-medium">
                          (Inactive)
                        </span>
                      )}
                      {player.userId && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({player.user?.email || 'Unknown'})
                        </span>
                      )}
                      {!player.userId && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Unassigned)
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
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
                </option>
              ))}
            </select>
          )}
          {isAdmin && selectedPlayerIds.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedPlayerIds.length} player{selectedPlayerIds.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={(isAdmin ? selectedPlayerIds.length === 0 : !selectedPlayerId) || applyToTournament.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applyToTournament.isPending ? 'Submitting...' : isAdmin ? `Add Player${selectedPlayerIds.length > 1 ? 's' : ''}` : 'Submit Application'}
        </button>
      </form>
    </div>
  );
};
