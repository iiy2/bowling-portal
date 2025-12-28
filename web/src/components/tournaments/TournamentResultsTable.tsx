import React, { useMemo } from 'react';
import { calculateNumberOfGames } from '../../lib/utils';
import type { TournamentParticipation } from '../../types/tournament';

interface TournamentResultsTableProps {
  participations: TournamentParticipation[];
}

export const TournamentResultsTable: React.FC<TournamentResultsTableProps> = ({
  participations,
}) => {
  // Sort by final position (nulls last)
  const sortedParticipations = [...participations].sort((a, b) => {
    if (a.finalPosition === null && b.finalPosition === null) return 0;
    if (a.finalPosition === null) return 1;
    if (b.finalPosition === null) return -1;
    return (a.finalPosition || 0) - (b.finalPosition || 0);
  });

  // Calculate number of games based on number of players
  const numberOfGames = useMemo(() =>
    calculateNumberOfGames(participations.length),
    [participations.length]
  );

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
                <th className="text-left py-3 px-2 text-sm font-semibold text-foreground sticky left-0 bg-card">
                  Position
                </th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">Player</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">HC</th>
                {numberOfGames > 0 && Array.from({ length: numberOfGames }, (_, i) => (
                  <th key={i} className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                    G{i + 1}
                  </th>
                ))}
                <th className="text-right py-3 px-2 text-sm font-semibold text-foreground">Total</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-foreground sticky right-0 bg-card">
                  Rating Points
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
                    {numberOfGames > 0 && Array.from({ length: numberOfGames }, (_, gameIndex) => (
                      <td key={gameIndex} className="py-3 px-2 text-center text-sm text-foreground">
                        {gameScores[gameIndex] || '-'}
                      </td>
                    ))}
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

      {participations.some(p => p.finalPosition === null && p.totalScore === null) && (
        <p className="mt-4 text-xs text-muted-foreground">
          Players without results are shown with reduced opacity
        </p>
      )}
    </div>
  );
};
