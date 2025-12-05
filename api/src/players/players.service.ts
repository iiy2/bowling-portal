import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayerQueryDto } from './dto/player-query.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async create(createPlayerDto: CreatePlayerDto, userId: string, userRole: UserRole) {
    // Regular users: automatically assign player to themselves
    // Admin users: can leave userId null (unassigned player) or create for themselves
    const finalUserId = userRole === UserRole.ADMIN ? null : userId;

    return this.prisma.player.create({
      data: {
        ...createPlayerDto,
        userId: finalUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async findAll(query: PlayerQueryDto) {
    const { search, isActive, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [players, total] = await Promise.all([
      this.prisma.player.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          statistics: {
            where: { seasonId: null }, // Overall statistics
            select: {
              averageScore: true,
              highestScore: true,
              totalTournamentsPlayed: true,
              totalRatingPoints: true,
            },
          },
        },
      }),
      this.prisma.player.count({ where }),
    ]);

    return {
      data: players,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        statistics: {
          select: {
            id: true,
            seasonId: true,
            averageScore: true,
            highestScore: true,
            totalTournamentsPlayed: true,
            totalRatingPoints: true,
            season: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        participations: {
          take: 10,
          orderBy: {
            tournament: {
              date: 'desc',
            },
          },
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                date: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    return player;
  }

  async update(id: string, updatePlayerDto: UpdatePlayerDto) {
    const player = await this.prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    return this.prisma.player.update({
      where: { id },
      data: updatePlayerDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    await this.prisma.player.delete({
      where: { id },
    });

    return { message: 'Player deleted successfully' };
  }

  async getSuggestions(query: string, limit: number = 10) {
    return this.prisma.player.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
  }
}
