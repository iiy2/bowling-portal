import React from 'react';
import { Link } from 'react-router-dom';
import { useSeasons, useDeleteSeason } from '../../hooks/useSeasons';
import { useAuthStore } from '../../store/useAuthStore';

export const SeasonsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: seasons, isLoading, error } = useSeasons();
  const deleteSeason = useDeleteSeason();

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete season "${name}"?`)) {
      deleteSeason.mutate(id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Seasons</h1>
        {isAdmin && (
          <Link
            to="/seasons/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add Season
          </Link>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading seasons...</p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">
            Error loading seasons. Please try again.
          </p>
        </div>
      )}

      {seasons && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {seasons.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No seasons found</p>
              {isAdmin && (
                <Link
                  to="/seasons/new"
                  className="mt-4 inline-block text-primary hover:text-primary/80"
                >
                  Create your first season
                </Link>
              )}
            </div>
          ) : (
            seasons.map((season) => (
              <div
                key={season.id}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link
                      to={`/seasons/${season.id}`}
                      className="text-xl font-semibold text-foreground hover:text-primary"
                    >
                      {season.name}
                    </Link>
                    {season.isActive && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Start Date</dt>
                    <dd className="font-medium text-foreground">
                      {formatDate(season.startDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">End Date</dt>
                    <dd className="font-medium text-foreground">
                      {formatDate(season.endDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tournaments</dt>
                    <dd className="font-medium text-foreground">
                      {season._count?.tournaments || 0}
                    </dd>
                  </div>
                  {season.ratingConfigurations && season.ratingConfigurations.length > 0 && (
                    <div>
                      <dt className="text-muted-foreground">Rating Config</dt>
                      <dd className="font-medium text-foreground">
                        {Object.keys(season.ratingConfigurations[0].pointsDistribution).length}{' '}
                        positions
                      </dd>
                    </div>
                  )}
                </dl>

                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-border flex gap-2">
                    <Link
                      to={`/seasons/${season.id}/edit`}
                      className="flex-1 text-center rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(season.id, season.name)}
                      disabled={deleteSeason.isPending}
                      className="flex-1 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
