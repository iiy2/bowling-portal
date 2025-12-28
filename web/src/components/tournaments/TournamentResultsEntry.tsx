import React, { useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { calculateNumberOfGames } from '../../lib/utils';
import type { TournamentParticipation, TournamentParticipationUpdateData } from '../../types/tournament';

interface TournamentResultsEntryProps {
  tournamentId: string;
  participations: TournamentParticipation[];
  qualificationCompleted?: boolean;
  onResultsUpdated: () => void;
}

type SortField = 'player' | 'handicap' | 'total' | 'totalWithHandicap' | 'position' | 'points' | 'average' | 'gapTo4th' | `game-${number}`;
type SortDirection = 'asc' | 'desc';

export const TournamentResultsEntry: React.FC<TournamentResultsEntryProps> = ({
  tournamentId,
  participations,
  qualificationCompleted = false,
  onResultsUpdated,
}) => {
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const saveTimeoutRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const [isFinalsMode, setIsFinalsMode] = useState(qualificationCompleted);

  // Initialize finals scores from participation data
  const [finalsScores, setFinalsScores] = useState<{ [playerId: string]: number[] }>(() => {
    const scores: { [playerId: string]: number[] } = {};
    participations.forEach(p => {
      const playerId = p.player?.id || p.id;
      if (p.finalsScores && p.finalsScores.length > 0) {
        scores[playerId] = p.finalsScores;
      }
    });
    return scores;
  });

  // Determine default sort based on whether results exist
  const hasResults = participations.some(p => p.totalScore !== null);
  const defaultSortField: SortField = hasResults ? 'total' : 'player';
  const defaultSortDirection: SortDirection = hasResults ? 'desc' : 'asc';

  const [sortField, setSortField] = useState<SortField>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Calculate number of games based on number of players
  const numberOfGames = useMemo(() =>
    calculateNumberOfGames(participations.length),
    [participations.length]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending for new field
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Calculate 4th place score for gap calculation
  const fourthPlaceScore = useMemo(() => {
    const scores = participations
      .map(p => (p.totalScore || 0) + ((p.handicap || 0) * numberOfGames))
      .filter(score => score > 0)
      .sort((a, b) => b - a);
    return scores[3] || 0; // 4th place (index 3)
  }, [participations, numberOfGames]);

  // Sort participations based on current sort field and direction
  const sortedParticipations = useMemo(() => {
    const sorted = [...participations].sort((a, b) => {
      let compareResult = 0;

      switch (sortField) {
        case 'player':
          const nameA = `${a.player?.firstName || ''} ${a.player?.lastName || ''}`.trim();
          const nameB = `${b.player?.firstName || ''} ${b.player?.lastName || ''}`.trim();
          compareResult = nameA.localeCompare(nameB);
          break;

        case 'handicap':
          const hcA = a.handicap ?? 0;
          const hcB = b.handicap ?? 0;
          compareResult = hcA - hcB;
          break;

        case 'total':
          // Nulls last
          if (a.totalScore === null && b.totalScore === null) return 0;
          if (a.totalScore === null) return 1;
          if (b.totalScore === null) return -1;
          compareResult = (a.totalScore || 0) - (b.totalScore || 0);
          break;

        case 'position':
          // Nulls last
          if (a.finalPosition === null && b.finalPosition === null) return 0;
          if (a.finalPosition === null) return 1;
          if (b.finalPosition === null) return -1;
          compareResult = (a.finalPosition || 0) - (b.finalPosition || 0);
          break;

        case 'points':
          // Nulls last
          if (a.ratingPointsEarned === null && b.ratingPointsEarned === null) return 0;
          if (a.ratingPointsEarned === null) return 1;
          if (b.ratingPointsEarned === null) return -1;
          compareResult = (a.ratingPointsEarned || 0) - (b.ratingPointsEarned || 0);
          break;

        case 'average':
          // Calculate averages
          const scoresA = a.gameScores?.filter(score => score > 0) || [];
          const scoresB = b.gameScores?.filter(score => score > 0) || [];
          const avgA = scoresA.length > 0 ? scoresA.reduce((sum, score) => sum + score, 0) / scoresA.length : 0;
          const avgB = scoresB.length > 0 ? scoresB.reduce((sum, score) => sum + score, 0) / scoresB.length : 0;
          compareResult = avgA - avgB;
          break;

        case 'totalWithHandicap':
          // Nulls last
          if (a.totalScore === null && b.totalScore === null) return 0;
          if (a.totalScore === null) return 1;
          if (b.totalScore === null) return -1;
          const totalA = (a.totalScore || 0) + ((a.handicap || 0) * numberOfGames);
          const totalB = (b.totalScore || 0) + ((b.handicap || 0) * numberOfGames);
          compareResult = totalA - totalB;
          break;

        case 'gapTo4th':
          // Calculate gap to 4th place for each player
          const scoreA = (a.totalScore || 0) + ((a.handicap || 0) * numberOfGames);
          const scoreB = (b.totalScore || 0) + ((b.handicap || 0) * numberOfGames);
          const gapA = fourthPlaceScore - scoreA;
          const gapB = fourthPlaceScore - scoreB;
          compareResult = gapA - gapB;
          break;

        default:
          // Handle game-specific sorting
          if (sortField.startsWith('game-')) {
            const gameIndex = parseInt(sortField.split('-')[1]);
            const scoreA = (a.gameScores?.[gameIndex] ?? 0);
            const scoreB = (b.gameScores?.[gameIndex] ?? 0);
            compareResult = scoreA - scoreB;
          }
      }

      return sortDirection === 'asc' ? compareResult : -compareResult;
    });

    return sorted;
  }, [participations, sortField, sortDirection, fourthPlaceScore, numberOfGames]);

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) {
      return <span className="text-muted-foreground group-hover:text-foreground transition-colors text-base">⇅</span>;
    }
    return (
      <span className="text-primary font-bold text-base">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const saveField = async (
    participationId: string,
    participation: TournamentParticipation,
    field: string,
    value: string | number
  ) => {
    setSavingCell(`${participationId}-${field}`);

    try {
      // Prepare the data to send
      let dataToSend: TournamentParticipationUpdateData = {
        finalPosition: participation.finalPosition,
        handicap: participation.handicap,
        ratingPointsEarned: participation.ratingPointsEarned,
      };

      // Only include gameScores if they exist
      if (participation.gameScores && participation.gameScores.length > 0) {
        dataToSend.gameScores = participation.gameScores;
      }

      // Update the specific field
      if (field === 'handicap' || field === 'finalPosition' || field === 'ratingPointsEarned') {
        dataToSend[field] = value ? parseFloat(String(value)) : undefined;
      } else if (field.startsWith('game-')) {
        const gameIndex = parseInt(field.split('-')[1]);
        const gameScores = [...(participation.gameScores || Array(numberOfGames).fill(0))];
        gameScores[gameIndex] = value ? parseInt(String(value)) : 0;
        dataToSend.gameScores = gameScores;

        // Validate minimum 6 games
        // const validScores = gameScores.filter(score => score > 0);
        // if (validScores.length > 0 && validScores.length < 6) {
        //   toast.error('Minimum 6 games required for qualification');
        //   setSavingCell(null);
        //   return;
        // }
      }

      await api.patch(
        `/tournaments/${tournamentId}/participants/${participationId}`,
        dataToSend
      );

      onResultsUpdated();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      toast.error(errorMessage);
    } finally {
      setSavingCell(null);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    participationId: string,
    participation: TournamentParticipation,
    field: string
  ) => {
    let value = e.target.value;

    // Validate game scores are between 0-300
    if (field.startsWith('game-')) {
      const numValue = parseInt(value);
      if (numValue < 0) {
        e.target.value = '0';
        value = '0';
      } else if (numValue > 300) {
        e.target.value = '300';
        value = '300';
      }
    }

    // Debounce the save - wait 500ms after the last change
    const cellKey = `${participationId}-${field}`;
    if (saveTimeoutRef.current[cellKey]) {
      clearTimeout(saveTimeoutRef.current[cellKey]);
    }

    saveTimeoutRef.current[cellKey] = setTimeout(() => {
      saveField(participationId, participation, field, value);
      delete saveTimeoutRef.current[cellKey];
    }, 500);
  };

  const handleFinalsToggle = async () => {
    const newFinalsMode = !isFinalsMode;
    setIsFinalsMode(newFinalsMode);

    try {
      await api.patch(`/tournaments/${tournamentId}`, {
        qualificationCompleted: newFinalsMode
      });
      onResultsUpdated();
    } catch (error) {
      toast.error('Failed to save qualification status');
      setIsFinalsMode(!newFinalsMode); // Revert on error
    }
  };

  const saveFinalsScore = async (participationId: string, scores: number[]) => {
    try {
      await api.patch(
        `/tournaments/${tournamentId}/participants/${participationId}`,
        { finalsScores: scores }
      );
      onResultsUpdated();
    } catch (error) {
      toast.error('Failed to save finals score');
    }
  };

  const handleFinalsScoreChange = (playerId: string, participationId: string, gameIndex: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const validatedValue = Math.max(0, Math.min(300, numValue));

    setFinalsScores(prev => {
      const playerScores = prev[playerId] || [0, 0];
      const newScores = [...playerScores];
      newScores[gameIndex] = validatedValue;

      // Save to database with debouncing
      const cellKey = `${participationId}-finals-${gameIndex}`;
      if (saveTimeoutRef.current[cellKey]) {
        clearTimeout(saveTimeoutRef.current[cellKey]);
      }

      saveTimeoutRef.current[cellKey] = setTimeout(() => {
        saveFinalsScore(participationId, newScores);
        delete saveTimeoutRef.current[cellKey];
      }, 500);

      return { ...prev, [playerId]: newScores };
    });
  };

  // Get top 4 finalists based on Total+HC score, then sort by finals total
  const finalists = useMemo(() => {
    const top4 = [...participations]
      .map(p => ({
        ...p,
        totalWithHandicap: (p.totalScore || 0) + ((p.handicap || 0) * numberOfGames)
      }))
      .sort((a, b) => b.totalWithHandicap - a.totalWithHandicap)
      .slice(0, 4);

    // Sort by finals total (descending)
    return top4.sort((a, b) => {
      const playerId_a = a.player?.id || a.id;
      const playerId_b = b.player?.id || b.id;
      const finalsTotal_a = (finalsScores[playerId_a] || [0, 0]).reduce((sum, score) => sum + score, 0);
      const finalsTotal_b = (finalsScores[playerId_b] || [0, 0]).reduce((sum, score) => sum + score, 0);
      return finalsTotal_b - finalsTotal_a;
    });
  }, [participations, numberOfGames, finalsScores]);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Enter Results</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Number of games: {numberOfGames} ({participations.length} players: {participations.length <= 8 ? '≤8 = 6 games' : participations.length <= 12 ? '9-12 = 7 games' : '13+ = 8 games'})
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isFinalsMode ? 'Qualification results are now readonly' : 'Click any cell to edit. Changes save automatically. Click column headers to sort.'}
          </p>
        </div>
        <button
          onClick={handleFinalsToggle}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            isFinalsMode
              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
          }`}
        >
          {isFinalsMode ? 'Back to Qualification' : 'Complete Qualification'}
        </button>
      </div>

      {participations.length === 0 ? (
        <p className="text-muted-foreground">No participants yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-card text-left py-3 px-2 text-sm font-semibold text-foreground">
                  Pos
                </th>
                <th>
                  <button
                    onClick={() => handleSort('player')}
                    className="group w-full text-left py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Player
                    <SortIcon field="player" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort('handicap')}
                    className="group w-full text-center py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    HC
                    <SortIcon field="handicap" />
                  </button>
                </th>
                {Array.from({ length: numberOfGames }, (_, i) => (
                  <th key={i}>
                    <button
                      onClick={() => handleSort(`game-${i}` as SortField)}
                      className="group w-full text-center py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      G{i + 1}
                      <SortIcon field={`game-${i}` as SortField} />
                    </button>
                  </th>
                ))}
                <th>
                  <button
                    onClick={() => handleSort('average')}
                    className="group w-full text-center py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Avg
                    <SortIcon field="average" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort('total')}
                    className="group w-full text-center py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Total
                    <SortIcon field="total" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort('totalWithHandicap')}
                    className="group w-full text-center py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Total+HC
                    <SortIcon field="totalWithHandicap" />
                  </button>
                </th>
                <th>
                  <button
                    onClick={() => handleSort('gapTo4th')}
                    className="group w-full text-center py-3 px-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Gap to 4th
                    <SortIcon field="gapTo4th" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedParticipations.map((participation, index) => {
                const displayScores = participation.gameScores || [];
                const isTopFour = index < 4;
                const isCutLine = index === 4;

                return (
                  <tr key={participation.id} className={`border-b border-border ${isCutLine ? 'border-t-4 border-t-primary' : ''}`}>
                    <td className="py-3 px-2 sticky left-0 bg-card">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        isTopFour
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-medium text-foreground text-sm">
                        {participation.player?.firstName} {participation.player?.lastName}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-sm text-muted-foreground">
                        {participation.handicap ?? '-'}
                      </span>
                    </td>
                    {Array.from({ length: numberOfGames }, (_, gameIndex) => {
                      const score = displayScores[gameIndex] || 0;
                      const isHighScore = score >= 200;
                      return (
                        <td key={gameIndex} className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="300"
                            defaultValue={displayScores[gameIndex] || ''}
                            onChange={(e) => handleChange(e, participation.id, participation, `game-${gameIndex}`)}
                            disabled={savingCell === `${participation.id}-game-${gameIndex}` || isFinalsMode}
                            readOnly={isFinalsMode}
                            className={`w-14 rounded border-0 px-1 py-1 text-xs text-center focus:outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              isHighScore
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 font-bold focus:bg-green-200 dark:focus:bg-green-900/50'
                                : 'bg-transparent text-foreground focus:bg-muted'
                            } ${isFinalsMode ? 'cursor-not-allowed' : ''}`}
                            placeholder="0"
                          />
                        </td>
                      );
                    })}
                    <td className="py-3 px-2 text-center">
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          const validScores = displayScores.filter(score => score > 0);
                          if (validScores.length === 0) return '-';
                          const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
                          return average.toFixed(1);
                        })()}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-semibold text-foreground text-sm">
                        {participation.totalScore || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-semibold text-foreground text-sm">
                        {(() => {
                          const total = participation.totalScore || 0;
                          const handicap = participation.handicap || 0;
                          if (total === 0) return '-';
                          return total + (handicap * numberOfGames);
                        })()}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-sm font-medium ${
                        index < 4
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}>
                        {(() => {
                          const total = participation.totalScore || 0;
                          const handicap = participation.handicap || 0;
                          const playerScore = total + (handicap * numberOfGames);

                          if (total === 0) return '-';

                          const gap = playerScore - fourthPlaceScore;

                          // 4th place
                          if (index === 3) {
                            return '0';
                          }

                          // Top 3 (above 4th place)
                          if (index < 3) {
                            return `+${gap}`;
                          }

                          // Below 4th place
                          return gap.toString();
                        })()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isFinalsMode && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Finals - Top 4 Players</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Enter 2 final games without handicap for each player
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">
                    Position
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">
                    Player
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                    Qual. Score
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                    Final G1
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                    Final G2
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-foreground">
                    Finals Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {finalists.map((finalist, index) => {
                  const playerId = finalist.player?.id || finalist.id;
                  const playerFinalsScores = finalsScores[playerId] || [0, 0];
                  const finalsTotal = playerFinalsScores.reduce((sum, score) => sum + score, 0);

                  return (
                    <tr key={finalist.id} className="border-b border-border">
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 font-bold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-medium text-foreground">
                          {finalist.player?.firstName} {finalist.player?.lastName}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="font-semibold text-foreground">
                          {finalist.totalWithHandicap}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="300"
                          value={playerFinalsScores[0] || ''}
                          onChange={(e) => handleFinalsScoreChange(playerId, finalist.id, 0, e.target.value)}
                          className="w-14 rounded border-0 px-1 py-1 text-xs text-center focus:outline-none bg-transparent text-foreground focus:bg-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="300"
                          value={playerFinalsScores[1] || ''}
                          onChange={(e) => handleFinalsScoreChange(playerId, finalist.id, 1, e.target.value)}
                          className="w-14 rounded border-0 px-1 py-1 text-xs text-center focus:outline-none bg-transparent text-foreground focus:bg-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-lg font-bold text-primary">
                          {finalsTotal || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
