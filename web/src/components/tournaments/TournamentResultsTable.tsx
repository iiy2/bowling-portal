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
          // Nulls last
          if (a.totalScore === null && b.totalScore === null) return 0;
          if (a.totalScore === null) return 1;
          if (b.totalScore === null) return -1;
          compareResult = (a.totalScore || 0) - (b.totalScore || 0);
          break;

        case 'rating':
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
                <th className="sticky left-0 bg-card text-left py-3 px-2 text-sm font-semibold text-foreground">
                  Position
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
                {numberOfGames > 0 && Array.from({ length: numberOfGames }, (_, i) => (
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
                    className="group w-full text-right py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-end gap-1 cursor-pointer"
                  >
                    Total
                    <SortIcon field="total" />
                  </button>
                </th>
                <th className="sticky right-0 bg-card">
                  <button
                    onClick={() => handleSort('rating')}
                    className="group w-full text-right py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-end gap-1 cursor-pointer"
                  >
                    Rating Points
                    <SortIcon field="rating" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedParticipations.map((participation, index) => {
                const hasResults = participation.finalPosition !== null || participation.totalScore !== null;
                const gameScores = participation.gameScores || [];
                const isTopFour = index < 4;
                const isCutLine = index === 4;

                return (
                  <tr
                    key={participation.id}
                    className={`border-b border-border ${!hasResults ? 'opacity-60' : ''} ${isCutLine ? 'border-t-4 border-t-primary' : ''}`}
                  >
                    <td className="py-3 px-2 sticky left-0 bg-card">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        isTopFour
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {index + 1}
                      </span>
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
