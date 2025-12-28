import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { TournamentParticipation } from '../../types/tournament';
import { useRemoveParticipant } from '../../hooks/useTournaments';

interface TournamentParticipantsListProps {
  tournamentId: string;
  participations: TournamentParticipation[];
  isAdmin: boolean;
  onParticipantRemoved: () => void;
}

export const TournamentParticipantsList: React.FC<TournamentParticipantsListProps> = ({
  tournamentId,
  participations,
  isAdmin,
  onParticipantRemoved,
}) => {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const removeParticipant = useRemoveParticipant();

  const handleRemove = async (participationId: string, playerName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${playerName} from this tournament?`)) {
      return;
    }

    setRemovingId(participationId);

    try {
      await removeParticipant.mutateAsync({ tournamentId, participationId });
      toast.success(`${playerName} removed from tournament`);
      onParticipantRemoved();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove participant');
    } finally {
      setRemovingId(null);
    }
  };

  if (participations.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Registered Players</h2>
        <p className="text-muted-foreground">No players registered yet.</p>
      </div>
    );
  }

  // Sort by registration date (earliest first)
  const sortedParticipations = [...participations].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          Registered Players ({participations.length})
        </h2>
      </div>

      <div className="space-y-2">
        {sortedParticipations.map((participation, index) => {
          const playerName = `${participation.player?.firstName} ${participation.player?.lastName}`;
          const isRemoving = removingId === participation.id;

          return (
            <div
              key={participation.id}
              className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{playerName}</p>
                  {participation.player?.user?.email && (
                    <p className="text-xs text-muted-foreground">
                      {participation.player.user.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {participation.handicap !== null && participation.handicap !== undefined && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Handicap</p>
                    <p className="text-sm font-semibold text-foreground">{participation.handicap}</p>
                  </div>
                )}

                {isAdmin && (
                  <button
                    onClick={() => handleRemove(participation.id, playerName)}
                    disabled={isRemoving || removeParticipant.isPending}
                    className="rounded-md bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRemoving ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
