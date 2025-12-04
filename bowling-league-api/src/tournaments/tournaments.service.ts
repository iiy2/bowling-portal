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
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
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
}
