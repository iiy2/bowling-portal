import React from 'react';
import { Link } from 'react-router-dom';
import { useActiveLeaderboard } from '../../hooks/useLeaderboard';
import { LeaderboardTable } from '../../components/leaderboard/LeaderboardTable';

export const LeaderboardPage: React.FC = () => {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Season Leaderboard</h1>
        <p className="text-muted-foreground">
          Rankings based on rating points earned in completed tournaments
        </p>
      </div>

      <LeaderboardTable
        leaderboard={data.leaderboard}
        seasonName={data.season.name}
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
