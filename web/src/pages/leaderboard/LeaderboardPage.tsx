import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useActiveLeaderboard } from '../../hooks/useLeaderboard';
import { LeaderboardTable } from '../../components/leaderboard/LeaderboardTable';

type LeaderboardView = 'total' | 'average';

export const LeaderboardPage: React.FC = () => {
  const [activeView, setActiveView] = useState<LeaderboardView>('total');
  const { data, isLoading, error } = useActiveLeaderboard();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Season Leaderboard</h1>
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Season Leaderboard</h1>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-destructive">
            {error instanceof Error ? error.message : 'Failed to load leaderboard'}
          </p>
          <p className="text-muted-foreground mt-2">
            There may not be an active season, or no tournaments have been completed yet.
          </p>
          <Link
            to="/seasons"
            className="text-primary hover:text-primary/80 mt-4 inline-block"
          >
            View Seasons
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Season Leaderboard</h1>
        <p className="text-muted-foreground">No leaderboard data available</p>
      </div>
    );
  }

  // Create sorted leaderboards based on view
  const sortedLeaderboard = activeView === 'total'
    ? [...data.leaderboard].sort((a, b) => b.totalPoints - a.totalPoints)
    : [...data.leaderboard].sort((a, b) => b.averagePosition - a.averagePosition); // Higher average score is better

  // Re-assign ranks based on current sort
  const rankedLeaderboard = sortedLeaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Season Leaderboard</h1>
        <p className="text-muted-foreground">
          Rankings based on rating points earned in completed tournaments
        </p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveView('total')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeView === 'total'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Total Points
        </button>
        <button
          onClick={() => setActiveView('average')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeView === 'average'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Average Score
        </button>
      </div>

      <LeaderboardTable
        leaderboard={rankedLeaderboard}
        seasonName={data.season.name}
        view={activeView}
      />

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Season Information</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Season:</dt>
            <dd className="text-foreground">
              <Link
                to={`/seasons/${data.season.id}`}
                className="text-primary hover:text-primary/80"
              >
                {data.season.name}
              </Link>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Period:</dt>
            <dd className="text-foreground">
              {new Date(data.season.startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}{' '}
              -{' '}
              {new Date(data.season.endDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Last Updated:</dt>
            <dd className="text-foreground">
              {new Date(data.lastUpdated).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
