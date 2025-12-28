import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export enum TournamentStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
}

export class CreateTournamentDto {
  @ApiProperty({
    example: 'Spring Championship 2025',
    description: 'Tournament name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '2025-03-15T10:00:00Z',
    description: 'Tournament date and time',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    example: 'Downtown Bowling Center',
    description: 'Tournament location',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Season ID this tournament belongs to',
  })
  @IsUUID()
  @IsNotEmpty()
  seasonId: string;

  @ApiPropertyOptional({
    enum: TournamentStatus,
    example: TournamentStatus.UPCOMING,
    description: 'Tournament status',
    default: TournamentStatus.UPCOMING,
  })
  @IsEnum(TournamentStatus)
  @IsOptional()
  status?: TournamentStatus;

  @ApiPropertyOptional({
    example: 32,
    description: 'Maximum number of participants',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxParticipants?: number;

  @ApiPropertyOptional({
    example: 'Annual spring championship tournament with prizes',
    description: 'Tournament description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether qualification round is completed',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  qualificationCompleted?: boolean;
}
