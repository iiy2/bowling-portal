import React, { useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import type { TournamentParticipation } from '../../types/tournament';

interface TournamentResultsEntryProps {
  tournamentId: string;
  participations: TournamentParticipation[];
  onResultsUpdated: () => void;
}

export const TournamentResultsEntry: React.FC<TournamentResultsEntryProps> = ({
  tournamentId,
  participations,
  onResultsUpdated,
}) => {
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const saveTimeoutRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  // Calculate number of games based on number of players
  // 8 or fewer: 6 games, 9-12: 7 games, 13+: 8 games (max)
  const numberOfGames = useMemo(() => {
    const playerCount = participations.length;
    if (playerCount <= 8) return 6;
    if (playerCount <= 12) return 7;
    return 8;
  }, [participations.length]);

  const saveField = async (
    participationId: string,
    participation: TournamentParticipation,
    field: string,
    value: any
  ) => {
    setSavingCell(`${participationId}-${field}`);

    try {
      const token = localStorage.getItem('accessToken');

      // Prepare the data to send
      let dataToSend: any = {
        finalPosition: participation.finalPosition,
        handicap: participation.handicap,
        ratingPointsEarned: participation.ratingPointsEarned,
      };

      // Only include gameScores if they exist
      if (participation.gameScores && participation.gameScores.length > 0) {
        dataToSend.gameScores = participation.gameScores;
      }

      // Update the specific field
      if (field === 'handicap' || field === 'finalPosition' || field === 'ratingPointsEarned') {
        dataToSend[field] = value ? parseFloat(value) : undefined;
      } else if (field.startsWith('game-')) {
        const gameIndex = parseInt(field.split('-')[1]);
        const gameScores = [...(participation.gameScores || Array(numberOfGames).fill(0))];
        gameScores[gameIndex] = value ? parseInt(value) : 0;
        dataToSend.gameScores = gameScores;

        // Validate minimum 6 games
        // const validScores = gameScores.filter(score => score > 0);
        // if (validScores.length > 0 && validScores.length < 6) {
        //   toast.error('Minimum 6 games required for qualification');
        //   setSavingCell(null);
        //   return;
        // }
      }

      const response = await fetch(
        `http://localhost:3000/tournaments/${tournamentId}/participants/${participationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dataToSend),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update');
      }

      onResultsUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSavingCell(null);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    participationId: string,
    participation: TournamentParticipation,
    field: string
  ) => {
    let value = e.target.value;

    // Validate game scores are between 0-300
    if (field.startsWith('game-')) {
      const numValue = parseInt(value);
      if (numValue < 0) {
        e.target.value = '0';
        value = '0';
      } else if (numValue > 300) {
        e.target.value = '300';
        value = '300';
      }
    }

    // Debounce the save - wait 500ms after the last change
    const cellKey = `${participationId}-${field}`;
    if (saveTimeoutRef.current[cellKey]) {
      clearTimeout(saveTimeoutRef.current[cellKey]);
    }

    saveTimeoutRef.current[cellKey] = setTimeout(() => {
      saveField(participationId, participation, field, value);
      delete saveTimeoutRef.current[cellKey];
    }, 500);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Enter Results</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Number of games: {numberOfGames} ({participations.length} players: {participations.length <= 8 ? '≤8 = 6 games' : participations.length <= 12 ? '9-12 = 7 games' : '13+ = 8 games'})
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Click any cell to edit. Changes save automatically.
        </p>
      </div>

      {participations.length === 0 ? (
        <p className="text-muted-foreground">No participants yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-semibold text-foreground sticky left-0 bg-card">
                  Player
                </th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">HC</th>
                {Array.from({ length: numberOfGames }, (_, i) => (
                  <th key={i} className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                    G{i + 1}
                  </th>
                ))}
                <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">Total</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">Pos</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">Pts</th>
              </tr>
            </thead>
            <tbody>
              {participations.map((participation) => {
                const displayScores = participation.gameScores || [];

                return (
                  <tr key={participation.id} className="border-b border-border">
                    <td className="py-3 px-2 sticky left-0 bg-card">
                      <span className="font-medium text-foreground text-sm">
                        {participation.player?.firstName} {participation.player?.lastName}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-sm text-muted-foreground">
                        {participation.handicap ?? '-'}
                      </span>
                    </td>
                    {Array.from({ length: numberOfGames }, (_, gameIndex) => (
                      <td key={gameIndex} className="py-3 px-2">
                        <input
                          type="number"
                          min="0"
                          max="300"
                          defaultValue={displayScores[gameIndex] || ''}
                          onChange={(e) => handleChange(e, participation.id, participation, `game-${gameIndex}`)}
                          disabled={savingCell === `${participation.id}-game-${gameIndex}`}
                          className="w-14 rounded border-0 bg-transparent px-1 py-1 text-xs text-center text-foreground focus:bg-muted focus:outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="py-3 px-2 text-center">
                      <span className="font-semibold text-foreground text-sm">
                        {participation.totalScore || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="1"
                        defaultValue={participation.finalPosition || ''}
                        onChange={(e) => handleChange(e, participation.id, participation, 'finalPosition')}
                        disabled={savingCell === `${participation.id}-finalPosition`}
                        className="w-14 rounded border-0 bg-transparent px-1 py-1 text-xs text-center text-foreground focus:bg-muted focus:outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="1"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        defaultValue={participation.ratingPointsEarned || ''}
                        onChange={(e) => handleChange(e, participation.id, participation, 'ratingPointsEarned')}
                        disabled={savingCell === `${participation.id}-ratingPointsEarned`}
                        className="w-14 rounded border-0 bg-transparent px-1 py-1 text-xs text-center text-foreground focus:bg-muted focus:outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
