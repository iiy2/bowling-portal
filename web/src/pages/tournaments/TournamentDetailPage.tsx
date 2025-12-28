import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  useTournament,
  useDeleteTournament,
  useUpdateTournamentStatus,
} from '../../hooks/useTournaments';
import { useAuthStore } from '../../store/useAuthStore';
import { TournamentStatus } from '../../types/tournament';
import { TournamentRegistration } from '../../components/tournaments/TournamentRegistration';
import { TournamentApplications } from '../../components/tournaments/TournamentApplications';
import { TournamentResultsEntry } from '../../components/tournaments/TournamentResultsEntry';
import { TournamentResultsTable } from '../../components/tournaments/TournamentResultsTable';
import { getTournamentStatusBadgeColor, formatOrdinal } from '../../lib/utils';

export const TournamentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [isRatingPointsOpen, setIsRatingPointsOpen] = useState(false);

  const { data: tournament, isLoading, error, refetch } = useTournament(id!);
  const deleteTournament = useDeleteTournament();
  const updateStatus = useUpdateTournamentStatus();

  const handleDelete = () => {
    if (!tournament) return;

    if (
      window.confirm(`Are you sure you want to delete tournament "${tournament.name}"?`)
    ) {
      deleteTournament.mutate(id!, {
        onSuccess: () => {
          navigate('/tournaments');
        },
      });
    }
  };

  const handleStatusChange = (status: TournamentStatus) => {
    if (!tournament) return;

    updateStatus.mutate({ id: id!, status });
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading tournament...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">Tournament not found</p>
        <Link
          to="/tournaments"
          className="text-primary hover:text-primary/80 mt-4 inline-block"
        >
          Back to Tournaments
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/tournaments"
          className="text-primary hover:text-primary/80 text-sm mb-4 inline-block"
        >
          ← Back to Tournaments
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{tournament.name}</h1>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getTournamentStatusBadgeColor(tournament.status)}`}
              >
                {tournament.status}
              </span>
            </div>
            <p className="mt-2 text-muted-foreground">
              {formatDate(tournament.date)} at {formatTime(tournament.date)}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <Link
                to={`/tournaments/${id}/edit`}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleteTournament.isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {isAdmin && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Status Management
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange(TournamentStatus.UPCOMING)}
                disabled={
                  tournament.status === TournamentStatus.UPCOMING ||
                  updateStatus.isPending
                }
                className="flex-1 rounded-md bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              >
                Set as Upcoming
              </button>
              <button
                onClick={() => handleStatusChange(TournamentStatus.ONGOING)}
                disabled={
                  tournament.status === TournamentStatus.ONGOING ||
                  updateStatus.isPending
                }
                className="flex-1 rounded-md bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-800 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
              >
                Set as Ongoing
              </button>
              <button
                onClick={() => handleStatusChange(TournamentStatus.COMPLETED)}
                disabled={
                  tournament.status === TournamentStatus.COMPLETED ||
                  updateStatus.isPending
                }
                className="flex-1 rounded-md bg-green-100 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              >
                Set as Completed
              </button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Tournament Information
          </h2>
          <dl className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm font-medium text-muted-foreground">Location</dt>
              <dd className="col-span-2 text-foreground">{tournament.location}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm font-medium text-muted-foreground">Season</dt>
              <dd className="col-span-2">
                {tournament.season ? (
                  <Link
                    to={`/seasons/${tournament.season.id}`}
                    className="text-primary hover:text-primary/80"
                  >
                    {tournament.season.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm font-medium text-muted-foreground">
                Max Participants
              </dt>
              <dd className="col-span-2 text-foreground">
                {tournament.maxParticipants || 'Unlimited'}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm font-medium text-muted-foreground">
                Current Participants
              </dt>
              <dd className="col-span-2 text-2xl font-bold text-foreground">
                {tournament._count?.participations || 0}
              </dd>
            </div>
            {tournament.description && (
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
                <dt className="text-sm font-medium text-muted-foreground">
                  Description
                </dt>
                <dd className="col-span-2 text-foreground">{tournament.description}</dd>
              </div>
            )}
            {tournament.season?.ratingConfigurations &&
              tournament.season.ratingConfigurations.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Rating Points
                  </dt>
                  <dd className="col-span-2">
                    <button
                      onClick={() => setIsRatingPointsOpen(!isRatingPointsOpen)}
                      className="w-full flex items-center justify-between text-left hover:bg-muted/30 transition-colors rounded px-2 py-1 -ml-2"
                    >
                      <span className="text-sm text-foreground">
                        Points distribution for this tournament
                      </span>
                      <span className="text-lg text-muted-foreground">
                        {isRatingPointsOpen ? '−' : '+'}
                      </span>
                    </button>
                    {isRatingPointsOpen && (
                      <div className="mt-3 space-y-2">
                        {Object.entries(
                          tournament.season.ratingConfigurations[0].pointsDistribution,
                        )
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([position, points]) => (
                            <div
                              key={position}
                              className="flex justify-between items-center rounded-md bg-muted/50 px-3 py-2"
                            >
                              <span className="text-sm font-medium text-foreground">
                                {formatOrdinal(position)} Place
                              </span>
                              <span className="text-sm font-bold text-primary">{points} pts</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </dd>
                </div>
              )}
          </dl>
        </div>

        {tournament.status === TournamentStatus.UPCOMING && (
          <TournamentRegistration
            tournamentId={id!}
            tournamentName={tournament.name}
            tournament={tournament}
            isFull={
              tournament.maxParticipants
                ? (tournament._count?.participations || 0) >= tournament.maxParticipants
                : false
            }
          />
        )}

        {isAdmin && tournament.status === TournamentStatus.UPCOMING && (
          <TournamentApplications tournamentId={id!} />
        )}

        {isAdmin && tournament.status === TournamentStatus.ONGOING && tournament.participations && (
          <TournamentResultsEntry
            tournamentId={id!}
            participations={tournament.participations}
            onResultsUpdated={() => refetch()}
          />
        )}

        {tournament.status === TournamentStatus.COMPLETED && tournament.participations && tournament.participations.length > 0 && (
          <TournamentResultsTable participations={tournament.participations} />
        )}

        {tournament.status === TournamentStatus.ONGOING && !isAdmin && tournament.participations && tournament.participations.length > 0 && (
          <TournamentResultsTable participations={tournament.participations} />
        )}
      </div>
    </div>
  );
};
