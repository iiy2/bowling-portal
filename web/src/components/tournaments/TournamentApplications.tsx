import React from 'react';
import {
  useTournamentApplications,
  useApproveApplication,
  useRejectApplication,
} from '../../hooks/useTournaments';
import { ApplicationStatus } from '../../types/tournament';

interface TournamentApplicationsProps {
  tournamentId: string;
}

export const TournamentApplications: React.FC<TournamentApplicationsProps> = ({
  tournamentId,
}) => {
  const { data: applications, isLoading } = useTournamentApplications(tournamentId);
  const approveApplication = useApproveApplication();
  const rejectApplication = useRejectApplication();

  const handleApprove = (applicationId: string) => {
    if (window.confirm('Approve this application?')) {
      approveApplication.mutate(
        { tournamentId, applicationId },
        {
          onSuccess: () => {
            alert('Application approved successfully!');
          },
          onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to approve application');
          },
        }
      );
    }
  };

  const handleReject = (applicationId: string) => {
    if (window.confirm('Reject this application?')) {
      rejectApplication.mutate(
        { tournamentId, applicationId },
        {
          onSuccess: () => {
            alert('Application rejected.');
          },
          onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to reject application');
          },
        }
      );
    }
  };

  const getStatusBadgeColor = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case ApplicationStatus.APPROVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case ApplicationStatus.REJECTED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Applications</h2>
        <p className="text-muted-foreground">Loading applications...</p>
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Applications</h2>
        <p className="text-muted-foreground">No applications yet.</p>
      </div>
    );
  }

  const pendingApplications = applications.filter(
    (app) => app.status === ApplicationStatus.PENDING
  );
  const processedApplications = applications.filter(
    (app) => app.status !== ApplicationStatus.PENDING
  );

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Applications</h2>

      {pendingApplications.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Pending ({pendingApplications.length})
          </h3>
          <div className="space-y-3">
            {pendingApplications.map((application) => (
              <div
                key={application.id}
                className="flex items-center justify-between rounded-md border border-border p-4"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {application.player?.firstName} {application.player?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Applied on{' '}
                    {new Date(application.applicationDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(application.id)}
                    disabled={
                      approveApplication.isPending || rejectApplication.isPending
                    }
                    className="rounded-md bg-green-100 px-3 py-1 text-sm font-semibold text-green-800 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(application.id)}
                    disabled={
                      approveApplication.isPending || rejectApplication.isPending
                    }
                    className="rounded-md bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {processedApplications.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Processed ({processedApplications.length})
          </h3>
          <div className="space-y-2">
            {processedApplications.map((application) => (
              <div
                key={application.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {application.player?.firstName} {application.player?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Applied on{' '}
                    {new Date(application.applicationDate).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(application.status)}`}
                >
                  {application.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
