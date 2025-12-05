import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { usePlayer, useDeletePlayer } from '../../hooks/usePlayers';
import { useAuthStore } from '../../store/useAuthStore';

export const PlayerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: player, isLoading, error } = usePlayer(id!);
  const deletePlayer = useDeletePlayer();

  const handleDelete = () => {
    if (!player) return;

    if (window.confirm(`Are you sure you want to delete ${player.firstName} ${player.lastName}?`)) {
      deletePlayer.mutate(id!, {
        onSuccess: () => {
          navigate('/players');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading player...</p>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">Player not found</p>
        <Link to="/players" className="text-primary hover:text-primary/80 mt-4 inline-block">
          Back to Players
        </Link>
      </div>
    );
  }

  const overallStats = player.statistics?.find((s) => s.seasonId === null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/players" className="text-primary hover:text-primary/80 text-sm mb-4 inline-block">
          ← Back to Players
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {player.firstName} {player.lastName}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {player.isActive ? 'Active Player' : 'Inactive Player'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <Link
                to={`/players/${id}/edit`}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Contact Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1 text-foreground">{player.email || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
              <dd className="mt-1 text-foreground">{player.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Registration Date</dt>
              <dd className="mt-1 text-foreground">
                {new Date(player.registrationDate).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Overall Statistics</h2>
          {overallStats ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Average Score</dt>
                <dd className="mt-1 text-2xl font-bold text-foreground">
                  {overallStats.averageScore.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Highest Score</dt>
                <dd className="mt-1 text-2xl font-bold text-foreground">
                  {overallStats.highestScore}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Tournaments Played</dt>
                <dd className="mt-1 text-2xl font-bold text-foreground">
                  {overallStats.totalTournamentsPlayed}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Total Rating Points</dt>
                <dd className="mt-1 text-2xl font-bold text-foreground">
                  {overallStats.totalRatingPoints.toFixed(0)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground">No statistics available yet</p>
          )}
        </div>
      </div>

      {player.statistics && player.statistics.length > 1 && (
        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Season Statistics</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {player.statistics
              .filter((s) => s.seasonId !== null)
              .map((stats) => (
                <div key={stats.id} className="rounded-md border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    {stats.season?.name || 'Unknown Season'}
                  </h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Avg:</dt>
                      <dd className="font-medium">{stats.averageScore.toFixed(1)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">High:</dt>
                      <dd className="font-medium">{stats.highestScore}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Tournaments:</dt>
                      <dd className="font-medium">{stats.totalTournamentsPlayed}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Points:</dt>
                      <dd className="font-medium">{stats.totalRatingPoints.toFixed(0)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
