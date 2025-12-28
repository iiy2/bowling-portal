import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/queryClient';
import { useThemeStore } from './store/useThemeStore';
import { useAuthStore } from './store/useAuthStore';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PlayersPage } from './pages/players/PlayersPage';
import { CreatePlayerPage } from './pages/players/CreatePlayerPage';
import { EditPlayerPage } from './pages/players/EditPlayerPage';
import { PlayerDetailPage } from './pages/players/PlayerDetailPage';
import { SeasonsPage } from './pages/seasons/SeasonsPage';
import { CreateSeasonPage } from './pages/seasons/CreateSeasonPage';
import { EditSeasonPage } from './pages/seasons/EditSeasonPage';
import { SeasonDetailPage } from './pages/seasons/SeasonDetailPage';
import { TournamentsPage } from './pages/tournaments/TournamentsPage';
import { CreateTournamentPage } from './pages/tournaments/CreateTournamentPage';
import { EditTournamentPage } from './pages/tournaments/EditTournamentPage';
import { TournamentDetailPage } from './pages/tournaments/TournamentDetailPage';
import { LeaderboardPage } from './pages/leaderboard/LeaderboardPage';

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  // Initialize theme on mount
  useEffect(() => {
    setTheme(theme);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-card)',
            color: 'var(--color-foreground)',
            border: '1px solid var(--color-border)',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-primary)',
              secondary: 'var(--color-primary-foreground)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-destructive)',
              secondary: 'var(--color-destructive-foreground)',
            },
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />

            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route
              path="/tournaments/new"
              element={
                <ProtectedRoute requireAdmin>
                  <CreateTournamentPage />
                </ProtectedRoute>
              }
            />
            <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
            <Route
              path="/tournaments/:id/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <EditTournamentPage />
                </ProtectedRoute>
              }
            />

            <Route path="/seasons" element={<SeasonsPage />} />
            <Route
              path="/seasons/new"
              element={
                <ProtectedRoute requireAdmin>
                  <CreateSeasonPage />
                </ProtectedRoute>
              }
            />
            <Route path="/seasons/:id" element={<SeasonDetailPage />} />
            <Route
              path="/seasons/:id/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <EditSeasonPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/players"
              element={
                <ProtectedRoute>
                  <PlayersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/players/new"
              element={
                <ProtectedRoute requireAdmin>
                  <CreatePlayerPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/players/:id"
              element={
                <ProtectedRoute>
                  <PlayerDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/players/:id/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <EditPlayerPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <div className="container mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="mt-4 text-muted-foreground">Admin features coming soon...</p>
                  </div>
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
