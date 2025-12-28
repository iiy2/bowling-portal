import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TournamentStatus, ApplicationStatus } from '../types/tournament';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns Tailwind CSS classes for tournament status badges
 */
export function getTournamentStatusBadgeColor(status: TournamentStatus): string {
  switch (status) {
    case 'UPCOMING':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'ONGOING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

/**
 * Returns Tailwind CSS classes for application status badges
 */
export function getApplicationStatusBadgeColor(status: ApplicationStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'APPROVED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

/**
 * Calculate number of games based on tournament participant count
 * Rules: ≤8 players = 6 games, 9-12 players = 7 games, 13+ players = 8 games
 */
export function calculateNumberOfGames(participantCount: number): number {
  if (participantCount <= 8) return 6;
  if (participantCount <= 12) return 7;
  return 8;
}

/**
 * Format ordinal position (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(position: number | string): string {
  const pos = typeof position === 'string' ? position : position.toString();
  if (pos === '1') return '1st';
  if (pos === '2') return '2nd';
  if (pos === '3') return '3rd';
  return `${pos}th`;
}
