import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto, TournamentStatus } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('tournaments')
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tournament (Admin only)' })
  @ApiResponse({ status: 201, description: 'Tournament created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentsService.create(createTournamentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tournaments with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of tournaments' })
  findAll(@Query() query: TournamentQueryDto) {
    return this.tournamentsService.findAll(query);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming tournaments' })
  @ApiResponse({ status: 200, description: 'List of upcoming tournaments' })
  getUpcoming(@Query('limit') limit?: number) {
    return this.tournamentsService.getUpcoming(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tournament by ID with full details' })
  @ApiResponse({ status: 200, description: 'Tournament details' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tournament (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tournament updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  update(@Param('id') id: string, @Body() updateTournamentDto: UpdateTournamentDto) {
    return this.tournamentsService.update(id, updateTournamentDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tournament status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tournament status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: TournamentStatus,
  ) {
    return this.tournamentsService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete tournament (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tournament deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Tournament has participants' })
  remove(@Param('id') id: string) {
    return this.tournamentsService.remove(id);
  }

  // Tournament Applications endpoints
  @Post(':id/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to tournament (authenticated users)' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or tournament full' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  @ApiResponse({ status: 409, description: 'Conflict - already applied' })
  applyToTournament(@Param('id') id: string, @Request() req: any, @Body('playerId') playerId: string) {
    return this.tournamentsService.applyToTournament(id, playerId, req.user.userId);
  }

  @Get(':id/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all applications for a tournament (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of applications' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  getApplications(@Param('id') id: string) {
    return this.tournamentsService.getApplications(id);
  }

  @Patch(':id/applications/:applicationId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve tournament application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Application approved and participant created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  approveApplication(@Param('applicationId') applicationId: string) {
    return this.tournamentsService.approveApplication(applicationId);
  }

  @Patch(':id/applications/:applicationId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject tournament application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Application rejected' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  rejectApplication(@Param('applicationId') applicationId: string) {
    return this.tournamentsService.rejectApplication(applicationId);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get all participants for a tournament' })
  @ApiResponse({ status: 200, description: 'List of participants' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  getParticipants(@Param('id') id: string) {
    return this.tournamentsService.getParticipants(id);
  }
}
