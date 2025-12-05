import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { UpdateRatingConfigDto } from './dto/update-rating-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('seasons')
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new season (Admin only)' })
  create(@Body() createSeasonDto: CreateSeasonDto) {
    return this.seasonsService.create(createSeasonDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all seasons' })
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active season' })
  findActive() {
    return this.seasonsService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get season by ID' })
  findOne(@Param('id') id: string) {
    return this.seasonsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update season (Admin only)' })
  update(@Param('id') id: string, @Body() updateSeasonDto: UpdateSeasonDto) {
    return this.seasonsService.update(id, updateSeasonDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete season (Admin only)' })
  remove(@Param('id') id: string) {
    return this.seasonsService.remove(id);
  }

  @Get(':id/rating-config')
  @ApiOperation({ summary: 'Get rating configuration for a season' })
  getRatingConfig(@Param('id') id: string) {
    return this.seasonsService.getRatingConfig(id);
  }

  @Patch(':id/rating-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rating configuration for a season (Admin only)' })
  updateRatingConfig(
    @Param('id') id: string,
    @Body() updateRatingConfigDto: UpdateRatingConfigDto,
  ) {
    return this.seasonsService.updateRatingConfig(id, updateRatingConfigDto);
  }
}
