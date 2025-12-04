import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSeason, useDeleteSeason } from '../../hooks/useSeasons';
import { useAuthStore } from '../../store/useAuthStore';

export const SeasonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: season, isLoading, error } = useSeason(id!);
  const deleteSeason = useDeleteSeason();

  const handleDelete = () => {
    if (!season) return;

    if (window.confirm(`Are you sure you want to delete season "${season.name}"?`)) {
      deleteSeason.mutate(id!, {
        onSuccess: () => {
          navigate('/seasons');
        },
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading season...</p>
      </div>
    );
  }

  if (error || !season) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">Season not found</p>
        <Link to="/seasons" className="text-primary hover:text-primary/80 mt-4 inline-block">
          Back to Seasons
        </Link>
      </div>
    );
  }

  const ratingConfig = season.ratingConfigurations?.[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/seasons" className="text-primary hover:text-primary/80 text-sm mb-4 inline-block">
          ← Back to Seasons
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{season.name}</h1>
              {season.isActive && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Active Season
                </span>
              )}
            </div>
            <p className="mt-2 text-muted-foreground">
              {formatDate(season.startDate)} - {formatDate(season.endDate)}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <Link
                to={`/seasons/${id}/edit`}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleteSeason.isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Season Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Duration</dt>
              <dd className="mt-1 text-foreground">
                {(() => {
                  const start = new Date(season.startDate);
                  const end = new Date(season.endDate);
                  const months =
                    (end.getFullYear() - start.getFullYear()) * 12 +
                    (end.getMonth() - start.getMonth());
                  return `${months} months`;
                })()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Total Tournaments</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">
                {season._count?.tournaments || 0}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="mt-1 text-foreground">
                {season.isActive ? 'Active' : 'Inactive'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Rating Configuration</h2>
          {ratingConfig ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">Points per placement:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ratingConfig.pointsDistribution)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([position, points]) => (
                    <div
                      key={position}
                      className="flex justify-between items-center rounded-md bg-muted/50 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {position === '1' ? '1st' : position === '2' ? '2nd' : position === '3' ? '3rd' : `${position}th`}
                      </span>
                      <span className="text-sm font-bold text-primary">{points} pts</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No rating configuration set</p>
          )}
        </div>
      </div>

      {season.tournaments && season.tournaments.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Tournaments</h2>
          <div className="space-y-3">
            {season.tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                to={`/tournaments/${tournament.id}`}
                className="block rounded-md border border-border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tournament.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {tournament._count?.participations || 0} players
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{tournament.status}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
