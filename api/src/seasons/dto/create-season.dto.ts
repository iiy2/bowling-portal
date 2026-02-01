import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreateSeasonDto {
  @ApiProperty({ example: 'Spring 2025' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2025-03-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-05-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: true, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: { '1': 100, '2': 80, '3': 60, '4': 50, '5': 40 },
    description: 'Points distribution for tournament placements',
    required: false,
  })
  @IsOptional()
  @IsObject()
  pointsDistribution?: Record<string, number>;
}
