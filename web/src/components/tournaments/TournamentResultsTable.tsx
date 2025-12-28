import React, { useMemo, useState } from 'react';
import { calculateNumberOfGames } from '../../lib/utils';
import type { TournamentParticipation } from '../../types/tournament';

type SortField = 'position' | 'player' | 'handicap' | 'total' | 'rating' | `game-${number}`;
type SortDirection = 'asc' | 'desc';

interface TournamentResultsTableProps {
  participations: TournamentParticipation[];
}

export const TournamentResultsTable: React.FC<TournamentResultsTableProps> = ({
  participations,
}) => {
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
        case 'position':
          // Nulls last
          if (a.finalPosition === null && b.finalPosition === null) return 0;
          if (a.finalPosition === null) return 1;
          if (b.finalPosition === null) return -1;
          compareResult = (a.finalPosition || 0) - (b.finalPosition || 0);
          break;

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
          const totalA = a.totalScore ?? 0;
          const totalB = b.totalScore ?? 0;
          compareResult = totalA - totalB;
          break;

        case 'rating':
          const ratingA = a.ratingPointsEarned ?? 0;
          const ratingB = b.ratingPointsEarned ?? 0;
          compareResult = ratingA - ratingB;
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
      return <span className="text-muted-foreground opacity-0 group-hover:opacity-50">↕</span>;
    }
    return (
      <span className="text-primary">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Tournament Results</h2>

      {participations.length === 0 ? (
        <p className="text-muted-foreground">No participants yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-card">
                  <button
                    onClick={() => handleSort('position')}
                    className="group w-full text-left py-3 px-2 text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    Position
                    <SortIcon field="position" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort('player')}
                    className="group w-full text-left py-3 px-2 text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    Player
                    <SortIcon field="player" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort('handicap')}
                    className="group w-full text-left py-3 px-2 text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    HC
                    <SortIcon field="handicap" />
                  </button>
                </th>
                {numberOfGames > 0 && Array.from({ length: numberOfGames }, (_, i) => (
                  <th key={i}>
                    <button
                      onClick={() => handleSort(`game-${i}` as SortField)}
                      className="group w-full text-center py-3 px-2 text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                      G{i + 1}
                      <SortIcon field={`game-${i}` as SortField} />
                    </button>
                  </th>
                ))}
                <th>
                  <button
                    onClick={() => handleSort('total')}
                    className="group w-full text-right py-3 px-2 text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center justify-end gap-1"
                  >
                    Total
                    <SortIcon field="total" />
                  </button>
                </th>
                <th className="sticky right-0 bg-card">
                  <button
                    onClick={() => handleSort('rating')}
                    className="group w-full text-right py-3 px-2 text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center justify-end gap-1"
                  >
                    Rating Points
                    <SortIcon field="rating" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedParticipations.map((participation) => {
                const hasResults = participation.finalPosition !== null || participation.totalScore !== null;
                const gameScores = participation.gameScores || [];

                return (
                  <tr
                    key={participation.id}
                    className={`border-b border-border ${!hasResults ? 'opacity-60' : ''}`}
                  >
                    <td className="py-3 px-2 sticky left-0 bg-card">
                      {participation.finalPosition ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {participation.finalPosition}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-medium text-foreground">
                        {participation.player?.firstName} {participation.player?.lastName}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-foreground">
                      {participation.handicap ?? '-'}
                    </td>
                    {numberOfGames > 0 && Array.from({ length: numberOfGames }, (_, gameIndex) => {
                      const score = gameScores[gameIndex] || 0;
                      const isHighScore = score >= 200;
                      return (
                        <td key={gameIndex} className="py-3 px-2 text-center text-sm">
                          <span className={isHighScore ? 'font-bold text-green-700 dark:text-green-400' : 'text-foreground'}>
                            {gameScores[gameIndex] || '-'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-3 px-2 text-right">
                      <span className="font-semibold text-foreground">
                        {participation.totalScore || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right sticky right-0 bg-card">
                      {participation.ratingPointsEarned ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          +{participation.ratingPointsEarned}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 space-y-1">
        <p className="text-xs text-muted-foreground">
          Click column headers to sort results
        </p>
        {participations.some(p => p.finalPosition === null && p.totalScore === null) && (
          <p className="text-xs text-muted-foreground">
            Players without results are shown with reduced opacity
          </p>
        )}
      </div>
    </div>
  );
};
