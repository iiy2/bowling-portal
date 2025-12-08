import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsArray, ArrayMinSize, ValidateIf } from 'class-validator';

export class UpdateParticipationResultDto {
  @ApiProperty({ example: 1, description: 'Final position in the tournament', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  finalPosition?: number;

  @ApiProperty({ example: 25, description: 'Handicap applied', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  handicap?: number;

  @ApiProperty({
    example: [180, 210, 195, 220, 185, 200],
    description: 'Array of individual game scores (minimum 6 games for qualification)',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateIf((o) => o.gameScores && o.gameScores.length > 0)
  @ArrayMinSize(6, { message: 'Minimum 6 games required for qualification' })
  gameScores?: number[];

  @ApiProperty({ example: 1250, description: 'Total score (sum of all game scores)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalScore?: number;

  @ApiProperty({ example: 150, description: 'Rating points earned', required: false })
  @IsOptional()
  @IsNumber()
  ratingPointsEarned?: number;
}
