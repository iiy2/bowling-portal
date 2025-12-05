import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTournaments } from '../../hooks/useTournaments';
import { useSeasons } from '../../hooks/useSeasons';
import { useAuthStore } from '../../store/useAuthStore';
import { TournamentStatus, type TournamentQueryParams } from '../../types/tournament';

export const TournamentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [filters, setFilters] = useState<TournamentQueryParams>({
    page: 1,
    limit: 12,
  });

  const { data: tournamentsData, isLoading } = useTournaments(filters);
  const { data: seasons } = useSeasons();

  const getStatusBadgeColor = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.UPCOMING:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case TournamentStatus.ONGOING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case TournamentStatus.COMPLETED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFilterChange = (key: keyof TournamentQueryParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tournaments</h1>
          <p className="mt-2 text-muted-foreground">
            Browse and manage bowling tournaments
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/tournaments/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add Tournament
          </Link>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Season
            </label>
            <select
              value={filters.seasonId || ''}
              onChange={(e) => handleFilterChange('seasonId', e.target.value || undefined)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Seasons</option>
              {seasons?.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) =>
                handleFilterChange('status', e.target.value || undefined)
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value={TournamentStatus.UPCOMING}>Upcoming</option>
              <option value={TournamentStatus.ONGOING}>Ongoing</option>
              <option value={TournamentStatus.COMPLETED}>Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.fromDate || ''}
              onChange={(e) => handleFilterChange('fromDate', e.target.value || undefined)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.toDate || ''}
              onChange={(e) => handleFilterChange('toDate', e.target.value || undefined)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading tournaments...</p>
        </div>
      ) : !tournamentsData?.data.length ? (
        <div className="text-center py-12 rounded-lg border border-border bg-card">
          <p className="text-muted-foreground">No tournaments found</p>
          {isAdmin && (
            <Link
              to="/tournaments/new"
              className="mt-4 inline-block text-primary hover:text-primary/80"
            >
              Create your first tournament
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournamentsData.data.map((tournament) => (
              <Link
                key={tournament.id}
                to={`/tournaments/${tournament.id}`}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    {tournament.name}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(tournament.status)}`}
                  >
                    {tournament.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <span className="font-medium mr-2">📅</span>
                    <span>{formatDate(tournament.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">🕐</span>
                    <span>{formatTime(tournament.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">📍</span>
                    <span>{tournament.location}</span>
                  </div>
                  {tournament.season && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">🏆</span>
                      <span>{tournament.season.name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-semibold text-foreground">
                      {tournament._count?.participations || 0}
                      {tournament.maxParticipants && ` / ${tournament.maxParticipants}`}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {tournamentsData.meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(filters.page! - 1)}
                disabled={filters.page === 1}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {tournamentsData.meta.page} of {tournamentsData.meta.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(filters.page! + 1)}
                disabled={filters.page === tournamentsData.meta.totalPages}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
