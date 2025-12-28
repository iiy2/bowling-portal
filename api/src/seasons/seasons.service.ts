import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { UpdateRatingConfigDto } from './dto/update-rating-config.dto';

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

  async create(createSeasonDto: CreateSeasonDto) {
    const { pointsDistribution, ...seasonData } = createSeasonDto;

    // Validate date range (should be approximately 3 months)
    const startDate = new Date(seasonData.startDate);
    const endDate = new Date(seasonData.endDate);
    const diffMonths =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    if (diffMonths < 2 || diffMonths > 4) {
      throw new BadRequestException(
        'Season duration should be approximately 3 months (2-4 months allowed)',
      );
    }

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check for overlapping seasons
    const overlapping = await this.prisma.season.findFirst({
      where: {
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        `Season dates overlap with existing season "${overlapping.name}"`,
      );
    }

    // If setting this season as active, deactivate others
    if (createSeasonDto.isActive) {
      await this.prisma.season.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const season = await this.prisma.season.create({
      data: {
        ...seasonData,
        startDate,
        endDate,
      },
      include: {
        ratingConfigurations: true,
      },
    });

    // Create rating configuration if provided
    if (pointsDistribution) {
      await this.prisma.ratingConfiguration.create({
        data: {
          seasonId: season.id,
          pointsDistribution,
        },
      });
    }

    return this.findOne(season.id);
  }

  async findAll() {
    return this.prisma.season.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        ratingConfigurations: true,
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    });
  }

  async findActive() {
    const season = await this.prisma.season.findFirst({
      where: { isActive: true },
      include: {
        ratingConfigurations: true,
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException('No active season found');
    }

    return season;
  }

  async findOne(id: string) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        ratingConfigurations: true,
        tournaments: {
          take: 10,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            name: true,
            date: true,
            status: true,
            _count: {
              select: {
                participations: true,
              },
            },
          },
        },
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    return season;
  }

  async update(id: string, updateSeasonDto: UpdateSeasonDto) {
    const season = await this.prisma.season.findUnique({
      where: { id },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    // Validate dates if provided
    const startDate = updateSeasonDto.startDate
      ? new Date(updateSeasonDto.startDate)
      : new Date(season.startDate);
    const endDate = updateSeasonDto.endDate
      ? new Date(updateSeasonDto.endDate)
      : new Date(season.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // If setting this season as active, deactivate others
    if (updateSeasonDto.isActive) {
      await this.prisma.season.updateMany({
        where: { isActive: true, NOT: { id } },
        data: { isActive: false },
      });
    }

    const { pointsDistribution, ...seasonData } = updateSeasonDto;

    const updated = await this.prisma.season.update({
      where: { id },
      data: seasonData,
      include: {
        ratingConfigurations: true,
      },
    });

    // Update rating configuration if provided
    if (pointsDistribution) {
      const existingConfig = await this.prisma.ratingConfiguration.findUnique({
        where: { seasonId: id },
      });

      if (existingConfig) {
        await this.prisma.ratingConfiguration.update({
          where: { seasonId: id },
          data: { pointsDistribution },
        });
      } else {
        await this.prisma.ratingConfiguration.create({
          data: {
            seasonId: id,
            pointsDistribution,
          },
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    if (season._count.tournaments > 0) {
      throw new BadRequestException(
        `Cannot delete season with ${season._count.tournaments} tournaments. Delete tournaments first.`,
      );
    }

    await this.prisma.season.delete({
      where: { id },
    });

    return { message: 'Season deleted successfully' };
  }

  async getRatingConfig(seasonId: string) {
    const config = await this.prisma.ratingConfiguration.findUnique({
      where: { seasonId },
      include: {
        season: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!config) {
      throw new NotFoundException(
        `Rating configuration for season ${seasonId} not found`,
      );
    }

    return config;
  }

  async updateRatingConfig(
    seasonId: string,
    updateRatingConfigDto: UpdateRatingConfigDto,
  ) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    const existingConfig = await this.prisma.ratingConfiguration.findUnique({
      where: { seasonId },
    });

    if (existingConfig) {
      return this.prisma.ratingConfiguration.update({
        where: { seasonId },
        data: updateRatingConfigDto,
      });
    } else {
      return this.prisma.ratingConfiguration.create({
        data: {
          seasonId,
          ...updateRatingConfigDto,
        },
      });
    }
  }

  async getActiveLeaderboard() {
    const activeSeason = await this.findActive();
    return this.getLeaderboard(activeSeason.id);
  }

  async getLeaderboard(seasonId: string) {
    // Verify season exists
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    // Get all participations for completed tournaments in this season
    const participations = await this.prisma.tournamentParticipation.findMany({
      where: {
        tournament: {
          seasonId,
          status: 'COMPLETED',
        },
        ratingPointsEarned: {
          not: null,
        },
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
      },
      orderBy: {
        tournament: {
          date: 'asc',
        },
      },
    });

    // Aggregate rating points by player
    const playerRatings = new Map<
      string,
      {
        player: any;
        totalPoints: number;
        tournamentsPlayed: number;
        totalPosition: number;
        positionCount: number;
        totalGameScore: number;
        totalGamesPlayed: number;
        tournaments: Array<{
          tournamentId: string;
          tournamentName: string;
          date: string;
          position: number | null;
          points: number;
        }>;
      }
    >();

    participations.forEach((participation) => {
      const playerId = participation.player.id;
      const points = participation.ratingPointsEarned || 0;

      if (!playerRatings.has(playerId)) {
        playerRatings.set(playerId, {
          player: participation.player,
          totalPoints: 0,
          tournamentsPlayed: 0,
          totalPosition: 0,
          positionCount: 0,
          totalGameScore: 0,
          totalGamesPlayed: 0,
          tournaments: [],
        });
      }

      const playerData = playerRatings.get(playerId)!;
      playerData.totalPoints += points;
      playerData.tournamentsPlayed += 1;

      // Track position for average calculation
      if (participation.finalPosition !== null) {
        playerData.totalPosition += participation.finalPosition;
        playerData.positionCount += 1;
      }

      // Track game scores for average calculation (only count games that were actually played)
      if (participation.gameScores && Array.isArray(participation.gameScores)) {
        const gameScores = participation.gameScores as number[];
        gameScores.forEach((score) => {
          // Only count games with a score greater than 0 (game was actually played)
          if (typeof score === 'number' && !isNaN(score) && score > 0) {
            playerData.totalGameScore += score;
            playerData.totalGamesPlayed += 1;
          }
        });
      }

      playerData.tournaments.push({
        tournamentId: participation.tournament.id,
        tournamentName: participation.tournament.name,
        date: participation.tournament.date.toISOString(),
        position: participation.finalPosition,
        points,
      });
    });

    // Convert to array and sort by total points (descending)
    const leaderboard = Array.from(playerRatings.values())
      .map((data, index) => ({
        rank: index + 1, // Will be recalculated after sorting
        playerId: data.player.id,
        playerName: `${data.player.firstName} ${data.player.lastName}`,
        isActive: data.player.isActive,
        totalPoints: data.totalPoints,
        tournamentsPlayed: data.tournamentsPlayed,
        averagePoints: data.tournamentsPlayed > 0 ? data.totalPoints / data.tournamentsPlayed : 0,
        averagePosition: data.totalGamesPlayed > 0 ? data.totalGameScore / data.totalGamesPlayed : 0,
        tournaments: data.tournaments,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return {
      season,
      leaderboard,
      totalPlayers: leaderboard.length,
      lastUpdated: new Date().toISOString(),
    };
  }
}
