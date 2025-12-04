import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateRatingConfigDto {
  @ApiProperty({
    example: { '1': 100, '2': 80, '3': 60, '4': 50, '5': 40 },
    description: 'Points distribution for tournament placements',
  })
  @IsObject()
  pointsDistribution: Record<string, number>;
}
