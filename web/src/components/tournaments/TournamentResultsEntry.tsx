import React, { useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { calculateNumberOfGames } from '../../lib/utils';
import type { TournamentParticipation, TournamentParticipationUpdateData } from '../../types/tournament';

interface TournamentResultsEntryProps {
  tournamentId: string;
  participations: TournamentParticipation[];
  onResultsUpdated: () => void;
}

type SortField = 'player' | 'handicap' | 'total' | 'position' | 'points' | `game-${number}`;
type SortDirection = 'asc' | 'desc';

export const TournamentResultsEntry: React.FC<TournamentResultsEntryProps> = ({
  tournamentId,
  participations,
  onResultsUpdated,
}) => {
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const saveTimeoutRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  // Determine default sort based on whether results exist
  const hasResults = participations.some(p => p.totalScore !== null);
  const defaultSortField: SortField = hasResults ? 'total' : 'player';
  const defaultSortDirection: SortDirection = hasResults ? 'desc' : 'asc';

  const [sortField, setSortField] = useState<SortField>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Calculate number of games based on number of players
  const numberOfGames = useMemo(() =>
    calculateNumberOfGames(participations.length),
    [participations.length]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending for new field
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort participations based on current sort field and direction
  const sortedParticipations = useMemo(() => {
    const sorted = [...participations].sort((a, b) => {
      let compareResult = 0;

      switch (sortField) {
        case 'player':
          const nameA = `${a.player?.firstName || ''} ${a.player?.lastName || ''}`.trim();
          const nameB = `${b.player?.firstName || ''} ${b.player?.lastName || ''}`.trim();
          compareResult = nameA.localeCompare(nameB);
          break;

        case 'handicap':
          const hcA = a.handicap ?? 0;
          const hcB = b.handicap ?? 0;
          compareResult = hcA - hcB;
          break;

        case 'total':
          // Nulls last
          if (a.totalScore === null && b.totalScore === null) return 0;
          if (a.totalScore === null) return 1;
          if (b.totalScore === null) return -1;
          compareResult = (a.totalScore || 0) - (b.totalScore || 0);
          break;

        case 'position':
          // Nulls last
          if (a.finalPosition === null && b.finalPosition === null) return 0;
          if (a.finalPosition === null) return 1;
          if (b.finalPosition === null) return -1;
          compareResult = (a.finalPosition || 0) - (b.finalPosition || 0);
          break;

        case 'points':
          // Nulls last
          if (a.ratingPointsEarned === null && b.ratingPointsEarned === null) return 0;
          if (a.ratingPointsEarned === null) return 1;
          if (b.ratingPointsEarned === null) return -1;
          compareResult = (a.ratingPointsEarned || 0) - (b.ratingPointsEarned || 0);
          break;

        default:
          // Handle game-specific sorting
          if (sortField.startsWith('game-')) {
            const gameIndex = parseInt(sortField.split('-')[1]);
            const scoreA = (a.gameScores?.[gameIndex] ?? 0);
            const scoreB = (b.gameScores?.[gameIndex] ?? 0);
            compareResult = scoreA - scoreB;
          }
      }

      return sortDirection === 'asc' ? compareResult : -compareResult;
    });

    return sorted;
  }, [participations, sortField, sortDirection]);

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) {
      return <span className="text-muted-foreground group-hover:text-foreground transition-colors text-base">⇅</span>;
    }
    return (
      <span className="text-primary font-bold text-base">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const saveField = async (
    participationId: string,
    participation: TournamentParticipation,
    field: string,
    value: string | number
  ) => {
    setSavingCell(`${participationId}-${field}`);

    try {
      // Prepare the data to send
      let dataToSend: TournamentParticipationUpdateData = {
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
        dataToSend[field] = value ? parseFloat(String(value)) : undefined;
      } else if (field.startsWith('game-')) {
        const gameIndex = parseInt(field.split('-')[1]);
        const gameScores = [...(participation.gameScores || Array(numberOfGames).fill(0))];
        gameScores[gameIndex] = value ? parseInt(String(value)) : 0;
        dataToSend.gameScores = gameScores;

        // Validate minimum 6 games
        // const validScores = gameScores.filter(score => score > 0);
        // if (validScores.length > 0 && validScores.length < 6) {
        //   toast.error('Minimum 6 games required for qualification');
        //   setSavingCell(null);
        //   return;
        // }
      }

      await api.patch(
        `/tournaments/${tournamentId}/participants/${participationId}`,
        dataToSend
      );

      onResultsUpdated();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      toast.error(errorMessage);
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
          Click any cell to edit. Changes save automatically. Click column headers to sort.
        </p>
      </div>

      {participations.length === 0 ? (
        <p className="text-muted-foreground">No participants yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-card text-left py-3 px-2 text-sm font-semibold text-foreground">
                  Pos
                </th>
                <th>
                  <button
                    onClick={() => handleSort('player')}
                    className="group w-full text-left py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Player
                    <SortIcon field="player" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort('handicap')}
                    className="group w-full text-left py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    HC
                    <SortIcon field="handicap" />
                  </button>
                </th>
                {Array.from({ length: numberOfGames }, (_, i) => (
                  <th key={i}>
                    <button
                      onClick={() => handleSort(`game-${i}` as SortField)}
                      className="group w-full text-center py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      G{i + 1}
                      <SortIcon field={`game-${i}` as SortField} />
                    </button>
                  </th>
                ))}
                <th>
                  <button
                    onClick={() => handleSort('total')}
                    className="group w-full text-center py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Total
                    <SortIcon field="total" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort('points')}
                    className="group w-full text-left py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Pts
                    <SortIcon field="points" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedParticipations.map((participation, index) => {
                const displayScores = participation.gameScores || [];

                return (
                  <tr key={participation.id} className="border-b border-border">
                    <td className="py-3 px-2 sticky left-0 bg-card">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-medium text-foreground text-sm">
                        {participation.player?.firstName} {participation.player?.lastName}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-sm text-muted-foreground">
                        {participation.handicap ?? '-'}
                      </span>
                    </td>
                    {Array.from({ length: numberOfGames }, (_, gameIndex) => {
                      const score = displayScores[gameIndex] || 0;
                      const isHighScore = score >= 200;
                      return (
                        <td key={gameIndex} className="py-3 px-2">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            defaultValue={displayScores[gameIndex] || ''}
                            onChange={(e) => handleChange(e, participation.id, participation, `game-${gameIndex}`)}
                            disabled={savingCell === `${participation.id}-game-${gameIndex}`}
                            className={`w-14 rounded border-0 px-1 py-1 text-xs text-center focus:outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              isHighScore
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 font-bold focus:bg-green-200 dark:focus:bg-green-900/50'
                                : 'bg-transparent text-foreground focus:bg-muted'
                            }`}
                            placeholder="0"
                          />
                        </td>
                      );
                    })}
                    <td className="py-3 px-2 text-center">
                      <span className="font-semibold text-foreground text-sm">
                        {participation.totalScore || '-'}
                      </span>
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
