import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '../../types/leaderboard';

interface LeaderboardTableProps {
  leaderboard: LeaderboardEntry[];
  seasonName: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  leaderboard,
  seasonName,
}) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  if (leaderboard.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">No leaderboard data available for this season yet.</p>
      </div>
    );
  }

  const toggleExpand = (playerId: string) => {
    setExpandedPlayerId(expandedPlayerId === playerId ? null : playerId);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        {seasonName} Leaderboard
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">
                Rank
              </th>
              <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">
                Player
              </th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                Total Points
              </th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                Tournaments
              </th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                Avg Points
              </th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => {
              const isExpanded = expandedPlayerId === entry.playerId;
              const isTop3 = entry.rank <= 3;

              return (
                <React.Fragment key={entry.playerId}>
                  <tr className={`border-b border-border ${!entry.isActive ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                          isTop3
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-medium text-foreground">
                        {entry.playerName}
                        {!entry.isActive && (
                          <span className="ml-2 text-xs text-destructive font-medium">
                            (Inactive)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-lg font-bold text-primary">
                        {entry.totalPoints}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-foreground">
                      {entry.tournamentsPlayed}
                    </td>
                    <td className="py-3 px-2 text-center text-foreground">
                      {entry.averagePoints.toFixed(1)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => toggleExpand(entry.playerId)}
                        className="text-primary hover:text-primary/80 font-medium text-sm"
                      >
                        {isExpanded ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-muted/30">
                      <td colSpan={6} className="py-4 px-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-foreground mb-3">
                            Tournament History
                          </h4>
                          <div className="grid gap-2">
                            {entry.tournaments.map((tournament) => (
                              <div
                                key={tournament.tournamentId}
                                className="flex items-center justify-between rounded-md bg-card border border-border px-3 py-2"
                              >
                                <div className="flex-1">
                                  <Link
                                    to={`/tournaments/${tournament.tournamentId}`}
                                    className="text-primary hover:text-primary/80 font-medium text-sm"
                                  >
                                    {tournament.tournamentName}
                                  </Link>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(tournament.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Position</p>
                                    <p className="font-semibold text-foreground">
                                      {tournament.position ? `${tournament.position}${tournament.position === 1 ? 'st' : tournament.position === 2 ? 'nd' : tournament.position === 3 ? 'rd' : 'th'}` : '-'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Points</p>
                                    <p className="font-bold text-primary">
                                      +{tournament.points}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>Total players: {leaderboard.length}</p>
        <p className="mt-1">Click "Show" to view a player's tournament history</p>
      </div>
    </div>
  );
};
