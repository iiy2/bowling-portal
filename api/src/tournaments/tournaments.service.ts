import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTournamentDto,
  TournamentStatus,
} from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { UpdateParticipationResultDto } from './dto/update-participation-result.dto';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async create(createTournamentDto: CreateTournamentDto) {
    const { seasonId, ...tournamentData } = createTournamentDto;

    // Verify season exists
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    // Validate tournament date is within season dates
    const tournamentDate = new Date(createTournamentDto.date);
    const seasonStart = new Date(season.startDate);
    const seasonEnd = new Date(season.endDate);

    if (tournamentDate < seasonStart || tournamentDate > seasonEnd) {
      throw new BadRequestException(
        `Tournament date must be within season dates (${seasonStart.toISOString().split('T')[0]} to ${seasonEnd.toISOString().split('T')[0]})`,
      );
    }

    // Create tournament with default status
    const tournament = await this.prisma.tournament.create({
      data: {
        ...tournamentData,
        seasonId,
        status: tournamentData.status || TournamentStatus.UPCOMING,
      },
      include: {
        season: true,
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });

    return tournament;
  }

  async findAll(query: TournamentQueryDto) {
    const { page = 1, limit = 10, seasonId, status, fromDate, toDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (seasonId) {
      where.seasonId = seasonId;
    }

    if (status) {
      where.status = status;
    }

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) {
        where.date.gte = new Date(fromDate);
      }
      if (toDate) {
        where.date.lte = new Date(toDate);
      }
    }

    const [tournaments, total] = await Promise.all([
      this.prisma.tournament.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          season: true,
          _count: {
            select: {
              participations: true,
            },
          },
        },
      }),
      this.prisma.tournament.count({ where }),
    ]);

    return {
      data: tournaments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            ratingConfigurations: true,
          },
        },
        participations: {
          include: {
            player: true,
          },
          orderBy: {
            finalPosition: 'asc',
          },
        },
        applications: {
          where: {
            status: 'PENDING',
          },
          include: {
            player: true,
          },
        },
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    return tournament;
  }

  async update(id: string, updateTournamentDto: UpdateTournamentDto) {
    // Verify tournament exists
    const existingTournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: { season: true },
    });

    if (!existingTournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    const { seasonId, ...updateData } = updateTournamentDto;

    // If updating season, verify it exists
    if (seasonId && seasonId !== existingTournament.seasonId) {
      const newSeason = await this.prisma.season.findUnique({
        where: { id: seasonId },
      });

      if (!newSeason) {
        throw new NotFoundException(`Season with ID ${seasonId} not found`);
      }

      // Validate tournament date is within new season dates
      const tournamentDate = new Date(
        updateTournamentDto.date || existingTournament.date,
      );
      const seasonStart = new Date(newSeason.startDate);
      const seasonEnd = new Date(newSeason.endDate);

      if (tournamentDate < seasonStart || tournamentDate > seasonEnd) {
        throw new BadRequestException(
          `Tournament date must be within season dates (${seasonStart.toISOString().split('T')[0]} to ${seasonEnd.toISOString().split('T')[0]})`,
        );
      }
    }

    // If updating date but not season, validate against current season
    if (updateTournamentDto.date && !seasonId) {
      const tournamentDate = new Date(updateTournamentDto.date);
      const seasonStart = new Date(existingTournament.season.startDate);
      const seasonEnd = new Date(existingTournament.season.endDate);

      if (tournamentDate < seasonStart || tournamentDate > seasonEnd) {
        throw new BadRequestException(
          `Tournament date must be within season dates (${seasonStart.toISOString().split('T')[0]} to ${seasonEnd.toISOString().split('T')[0]})`,
        );
      }
    }

    const tournament = await this.prisma.tournament.update({
      where: { id },
      data: {
        ...updateData,
        ...(seasonId && { seasonId }),
      },
      include: {
        season: true,
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });

    return tournament;
  }

  async remove(id: string) {
    // Check if tournament exists
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    // Prevent deletion if tournament has participations
    if (tournament._count.participations > 0) {
      throw new ConflictException(
        `Cannot delete tournament with ${tournament._count.participations} participants. Remove participants first.`,
      );
    }

    await this.prisma.tournament.delete({
      where: { id },
    });

    return { message: 'Tournament deleted successfully' };
  }

  async updateStatus(id: string, status: TournamentStatus) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            ratingConfigurations: true,
          },
        },
        participations: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    // If setting status to COMPLETED, calculate and save rating points
    if (status === TournamentStatus.COMPLETED) {
      await this.calculateAndSaveRatingPoints(tournament);
    }

    return this.prisma.tournament.update({
      where: { id },
      data: { status },
      include: {
        season: true,
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });
  }

  private async calculateAndSaveRatingPoints(tournament: any) {
    // Get rating configuration for the season
    const ratingConfig = tournament.season?.ratingConfigurations?.[0];
    if (!ratingConfig || !ratingConfig.pointsDistribution) {
      // No rating configuration, skip
      return;
    }

    const pointsDistribution = ratingConfig.pointsDistribution as Record<string, number>;

    // Get participations and determine final positions based on finals scores or qualification scores
    const participations = tournament.participations;
    if (!participations || participations.length === 0) {
      return;
    }

    // Calculate number of games for handicap
    const numberOfGames = this.calculateNumberOfGames(participations.length);

    // Sort participants to determine final positions
    const sortedParticipations = [...participations].sort((a, b) => {
      // If tournament has finals (check if any participant has finalsScores)
      const hasFinalsResults = participations.some(
        (p: any) => p.finalsScores && Array.isArray(p.finalsScores) && p.finalsScores.length > 0
      );

      if (hasFinalsResults) {
        // For tournaments with finals:
        // Top 4 are sorted by finals total (descending)
        // Rest are sorted by qualification total with handicap (descending)

        const aHasFinalsScores = a.finalsScores && Array.isArray(a.finalsScores) && a.finalsScores.length > 0;
        const bHasFinalsScores = b.finalsScores && Array.isArray(b.finalsScores) && b.finalsScores.length > 0;

        // Both have finals scores - compare finals totals
        if (aHasFinalsScores && bHasFinalsScores) {
          const finalsA = a.finalsScores.reduce((sum: number, score: number) => sum + score, 0);
          const finalsB = b.finalsScores.reduce((sum: number, score: number) => sum + score, 0);
          return finalsB - finalsA; // Descending
        }

        // Only one has finals scores - that one is higher
        if (aHasFinalsScores) return -1;
        if (bHasFinalsScores) return 1;

        // Neither has finals scores - sort by qualification total with handicap
        const qualA = (a.totalScore || 0) + ((a.handicap || 0) * numberOfGames);
        const qualB = (b.totalScore || 0) + ((b.handicap || 0) * numberOfGames);
        return qualB - qualA; // Descending
      } else {
        // No finals - sort by qualification total with handicap
        const totalA = (a.totalScore || 0) + ((a.handicap || 0) * numberOfGames);
        const totalB = (b.totalScore || 0) + ((b.handicap || 0) * numberOfGames);
        return totalB - totalA; // Descending
      }
    });

    // Assign rating points based on final position
    const updatePromises = sortedParticipations.map((participation: any, index: number) => {
      const position = index + 1;
      const ratingPoints = pointsDistribution[position.toString()] || 0;

      return this.prisma.tournamentParticipation.update({
        where: { id: participation.id },
        data: {
          finalPosition: position,
          ratingPointsEarned: ratingPoints,
        },
      });
    });

    await Promise.all(updatePromises);
  }

  private calculateNumberOfGames(participantCount: number): number {
    if (participantCount <= 8) return 6;
    if (participantCount <= 12) return 7;
    return 8;
  }

  async getUpcoming(limit: number = 5) {
    const now = new Date();
    return this.prisma.tournament.findMany({
      where: {
        status: TournamentStatus.UPCOMING,
        date: { gte: now },
      },
      take: limit,
      orderBy: { date: 'asc' },
      include: {
        season: true,
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });
  }

  // Tournament Applications
  async applyToTournament(tournamentId: string, playerId: string, userId: string, userRole: string) {
    // Verify tournament exists
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: {
            participations: true,
            applications: { where: { status: 'PENDING' } },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    // Verify player exists
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${playerId} not found`);
    }

    // Only check player ownership for non-admin users
    if (userRole !== 'ADMIN' && player.userId !== userId) {
      throw new BadRequestException('You can only apply with your own players');
    }

    // Check if tournament is full
    if (tournament.maxParticipants && tournament._count.participations >= tournament.maxParticipants) {
      throw new BadRequestException('Tournament is full');
    }

    // Check if already applied or participating
    const existingApplication = await this.prisma.tournamentApplication.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId,
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException('Player has already applied to this tournament');
    }

    const existingParticipation = await this.prisma.tournamentParticipation.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId,
        },
      },
    });

    if (existingParticipation) {
      throw new ConflictException('Player is already participating in this tournament');
    }

    // Admin users: directly create participation (no approval needed)
    // Regular users: create application that requires approval
    if (userRole === 'ADMIN') {
      const participation = await this.prisma.tournamentParticipation.create({
        data: {
          tournamentId,
          playerId,
        },
        include: {
          player: true,
          tournament: true,
        },
      });

      return {
        message: 'Player added to tournament successfully',
        participation,
      };
    } else {
      // Create application for regular users
      const application = await this.prisma.tournamentApplication.create({
        data: {
          tournamentId,
          playerId,
        },
        include: {
          player: true,
          tournament: true,
        },
      });

      return application;
    }
  }

  async getApplications(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    return this.prisma.tournamentApplication.findMany({
      where: { tournamentId },
      include: {
        player: true,
      },
      orderBy: { applicationDate: 'asc' },
    });
  }

  async approveApplication(applicationId: string) {
    const application = await this.prisma.tournamentApplication.findUnique({
      where: { id: applicationId },
      include: {
        tournament: true,
        player: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException(`Application has already been ${application.status.toLowerCase()}`);
    }

    // Check if tournament is full
    const participationCount = await this.prisma.tournamentParticipation.count({
      where: { tournamentId: application.tournamentId },
    });

    if (application.tournament.maxParticipants && participationCount >= application.tournament.maxParticipants) {
      throw new BadRequestException('Tournament is full');
    }

    // Update application status and create participation in a transaction
    const [updatedApplication, participation] = await this.prisma.$transaction([
      this.prisma.tournamentApplication.update({
        where: { id: applicationId },
        data: { status: 'APPROVED' },
        include: { player: true },
      }),
      this.prisma.tournamentParticipation.create({
        data: {
          tournamentId: application.tournamentId,
          playerId: application.playerId,
        },
        include: { player: true },
      }),
    ]);

    return { application: updatedApplication, participation };
  }

  async rejectApplication(applicationId: string) {
    const application = await this.prisma.tournamentApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException(`Application has already been ${application.status.toLowerCase()}`);
    }

    return this.prisma.tournamentApplication.update({
      where: { id: applicationId },
      data: { status: 'REJECTED' },
      include: { player: true },
    });
  }

  async getParticipants(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    return this.prisma.tournamentParticipation.findMany({
      where: { tournamentId },
      include: {
        player: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateParticipationResult(
    tournamentId: string,
    participationId: string,
    updateData: UpdateParticipationResultDto,
  ) {
    // Verify tournament exists
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    // Verify participation exists and belongs to tournament
    const participation = await this.prisma.tournamentParticipation.findUnique({
      where: { id: participationId },
    });

    if (!participation) {
      throw new NotFoundException(`Participation with ID ${participationId} not found`);
    }

    if (participation.tournamentId !== tournamentId) {
      throw new BadRequestException('Participation does not belong to this tournament');
    }

    // If game scores are provided, calculate total score automatically
    const dataToUpdate: any = { ...updateData };
    if (updateData.gameScores && Array.isArray(updateData.gameScores)) {
      dataToUpdate.totalScore = updateData.gameScores.reduce((sum, score) => sum + score, 0);
    }

    // Update the participation with results
    return this.prisma.tournamentParticipation.update({
      where: { id: participationId },
      data: dataToUpdate,
      include: {
        player: true,
        tournament: true,
      },
    });
  }
}
