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
}
