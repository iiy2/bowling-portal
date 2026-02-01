import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { CascadeService } from '../firestore/cascade.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { UpdateRatingConfigDto } from './dto/update-rating-config.dto';

interface Season {
  id: string;
  name: string;
  startDate: FirebaseFirestore.Timestamp;
  endDate: FirebaseFirestore.Timestamp;
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  ratingConfig?: {
    pointsDistribution: Record<string, number>;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
  } | null;
  tournamentCount: number;
}

interface TournamentParticipation {
  id: string;
  tournamentId: string;
  playerId: string;
  playerFirstName: string;
  playerLastName: string;
  tournamentName: string;
  tournamentDate: FirebaseFirestore.Timestamp;
  seasonId: string;
  gameScores: number[] | null;
  totalScore: number | null;
  finalsScores: number[] | null;
  finalPosition: number | null;
  ratingPointsEarned: number | null;
}

@Injectable()
export class SeasonsService {
  constructor(
    private firestore: FirestoreService,
    private cascadeService: CascadeService,
  ) {}

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
    const seasonsSnapshot = await this.firestore.collection('seasons').get();
    const existingSeasons = seasonsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Season[];

    for (const existingSeason of existingSeasons) {
      const existingStart = this.firestore.fromTimestamp(existingSeason.startDate)!;
      const existingEnd = this.firestore.fromTimestamp(existingSeason.endDate)!;

      const overlaps =
        (startDate <= existingEnd && startDate >= existingStart) ||
        (endDate <= existingEnd && endDate >= existingStart) ||
        (startDate <= existingStart && endDate >= existingEnd);

      if (overlaps) {
        throw new ConflictException(
          `Season dates overlap with existing season "${existingSeason.name}"`,
        );
      }
    }

    // If setting this season as active, deactivate others
    if (createSeasonDto.isActive) {
      const batch = this.firestore.batch();
      const activeSeasons = await this.firestore
        .collection('seasons')
        .where('isActive', '==', true)
        .get();

      activeSeasons.docs.forEach((doc) => {
        batch.update(doc.ref, { isActive: false });
      });
      await batch.commit();
    }

    const seasonId = this.firestore.generateId();
    const seasonDoc = {
      id: seasonId,
      name: seasonData.name,
      startDate: this.firestore.toTimestamp(startDate),
      endDate: this.firestore.toTimestamp(endDate),
      isActive: seasonData.isActive ?? false,
      createdAt: this.firestore.serverTimestamp(),
      updatedAt: this.firestore.serverTimestamp(),
      ratingConfig: pointsDistribution
        ? {
            pointsDistribution,
            createdAt: this.firestore.serverTimestamp(),
            updatedAt: this.firestore.serverTimestamp(),
          }
        : null,
      tournamentCount: 0,
    };

    await this.firestore.doc('seasons', seasonId).set(seasonDoc);

    return this.findOne(seasonId);
  }

  async findAll() {
    const snapshot = await this.firestore
      .collection('seasons')
      .orderBy('startDate', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Season;
      return {
        id: doc.id,
        name: data.name,
        startDate: this.firestore.fromTimestamp(data.startDate),
        endDate: this.firestore.fromTimestamp(data.endDate),
        isActive: data.isActive,
        createdAt: this.firestore.fromTimestamp(data.createdAt),
        updatedAt: this.firestore.fromTimestamp(data.updatedAt),
        ratingConfigurations: data.ratingConfig
          ? [
              {
                pointsDistribution: data.ratingConfig.pointsDistribution,
                createdAt: this.firestore.fromTimestamp(data.ratingConfig.createdAt),
                updatedAt: this.firestore.fromTimestamp(data.ratingConfig.updatedAt),
              },
            ]
          : [],
        _count: {
          tournaments: data.tournamentCount || 0,
        },
      };
    });
  }

  async findActive() {
    const snapshot = await this.firestore
      .collection('seasons')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException('No active season found');
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as Season;

    return {
      id: doc.id,
      name: data.name,
      startDate: this.firestore.fromTimestamp(data.startDate),
      endDate: this.firestore.fromTimestamp(data.endDate),
      isActive: data.isActive,
      createdAt: this.firestore.fromTimestamp(data.createdAt),
      updatedAt: this.firestore.fromTimestamp(data.updatedAt),
      ratingConfigurations: data.ratingConfig
        ? [
            {
              pointsDistribution: data.ratingConfig.pointsDistribution,
              createdAt: this.firestore.fromTimestamp(data.ratingConfig.createdAt),
              updatedAt: this.firestore.fromTimestamp(data.ratingConfig.updatedAt),
            },
          ]
        : [],
      _count: {
        tournaments: data.tournamentCount || 0,
      },
    };
  }

  async findOne(id: string) {
    const seasonDoc = await this.firestore.doc('seasons', id).get();

    if (!seasonDoc.exists) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    const data = seasonDoc.data() as Season;

    // Get recent tournaments for this season
    const tournamentsSnapshot = await this.firestore
      .collection('tournaments')
      .where('seasonId', '==', id)
      .orderBy('date', 'desc')
      .limit(10)
      .get();

    const tournaments = tournamentsSnapshot.docs.map((doc) => {
      const tData = doc.data();
      return {
        id: doc.id,
        name: tData.name,
        date: this.firestore.fromTimestamp(tData.date),
        status: tData.status,
        _count: {
          participations: tData.participationCount || 0,
        },
      };
    });

    return {
      id: seasonDoc.id,
      name: data.name,
      startDate: this.firestore.fromTimestamp(data.startDate),
      endDate: this.firestore.fromTimestamp(data.endDate),
      isActive: data.isActive,
      createdAt: this.firestore.fromTimestamp(data.createdAt),
      updatedAt: this.firestore.fromTimestamp(data.updatedAt),
      ratingConfigurations: data.ratingConfig
        ? [
            {
              seasonId: id,
              pointsDistribution: data.ratingConfig.pointsDistribution,
              createdAt: this.firestore.fromTimestamp(data.ratingConfig.createdAt),
              updatedAt: this.firestore.fromTimestamp(data.ratingConfig.updatedAt),
            },
          ]
        : [],
      tournaments,
      _count: {
        tournaments: data.tournamentCount || 0,
      },
    };
  }

  async update(id: string, updateSeasonDto: UpdateSeasonDto) {
    const seasonDoc = await this.firestore.doc('seasons', id).get();

    if (!seasonDoc.exists) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    const season = seasonDoc.data() as Season;

    // Validate dates if provided
    const startDate = updateSeasonDto.startDate
      ? new Date(updateSeasonDto.startDate)
      : this.firestore.fromTimestamp(season.startDate)!;
    const endDate = updateSeasonDto.endDate
      ? new Date(updateSeasonDto.endDate)
      : this.firestore.fromTimestamp(season.endDate)!;

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // If setting this season as active, deactivate others
    if (updateSeasonDto.isActive) {
      const batch = this.firestore.batch();
      const activeSeasons = await this.firestore
        .collection('seasons')
        .where('isActive', '==', true)
        .get();

      activeSeasons.docs.forEach((doc) => {
        if (doc.id !== id) {
          batch.update(doc.ref, { isActive: false });
        }
      });
      await batch.commit();
    }

    const { pointsDistribution, ...seasonData } = updateSeasonDto;

    const updateData: any = {
      ...seasonData,
      updatedAt: this.firestore.serverTimestamp(),
    };

    if (updateSeasonDto.startDate) {
      updateData.startDate = this.firestore.toTimestamp(startDate);
    }
    if (updateSeasonDto.endDate) {
      updateData.endDate = this.firestore.toTimestamp(endDate);
    }

    // Update rating configuration if provided
    if (pointsDistribution) {
      updateData.ratingConfig = {
        pointsDistribution,
        createdAt: season.ratingConfig?.createdAt || this.firestore.serverTimestamp(),
        updatedAt: this.firestore.serverTimestamp(),
      };
    }

    await this.firestore.doc('seasons', id).update(updateData);

    // Update denormalized season name in tournaments if name changed
    if (updateSeasonDto.name && updateSeasonDto.name !== season.name) {
      await this.cascadeService.updateSeasonNameDenormalized(
        id,
        updateSeasonDto.name,
      );
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const seasonDoc = await this.firestore.doc('seasons', id).get();

    if (!seasonDoc.exists) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    const season = seasonDoc.data() as Season;

    if (season.tournamentCount > 0) {
      throw new BadRequestException(
        `Cannot delete season with ${season.tournamentCount} tournaments. Delete tournaments first.`,
      );
    }

    await this.firestore.doc('seasons', id).delete();

    return { message: 'Season deleted successfully' };
  }

  async getRatingConfig(seasonId: string) {
    const seasonDoc = await this.firestore.doc('seasons', seasonId).get();

    if (!seasonDoc.exists) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    const season = seasonDoc.data() as Season;

    if (!season.ratingConfig) {
      throw new NotFoundException(
        `Rating configuration for season ${seasonId} not found`,
      );
    }

    return {
      seasonId,
      pointsDistribution: season.ratingConfig.pointsDistribution,
      createdAt: this.firestore.fromTimestamp(season.ratingConfig.createdAt),
      updatedAt: this.firestore.fromTimestamp(season.ratingConfig.updatedAt),
      season: {
        id: seasonId,
        name: season.name,
      },
    };
  }

  async updateRatingConfig(
    seasonId: string,
    updateRatingConfigDto: UpdateRatingConfigDto,
  ) {
    const seasonDoc = await this.firestore.doc('seasons', seasonId).get();

    if (!seasonDoc.exists) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    const season = seasonDoc.data() as Season;

    const ratingConfig = {
      pointsDistribution: updateRatingConfigDto.pointsDistribution,
      createdAt: season.ratingConfig?.createdAt || this.firestore.serverTimestamp(),
      updatedAt: this.firestore.serverTimestamp(),
    };

    await this.firestore.doc('seasons', seasonId).update({
      ratingConfig,
      updatedAt: this.firestore.serverTimestamp(),
    });

    return {
      seasonId,
      ...updateRatingConfigDto,
      createdAt: this.firestore.fromTimestamp(ratingConfig.createdAt as any),
      updatedAt: new Date(),
    };
  }

  async getActiveLeaderboard() {
    const activeSeason = await this.findActive();
    return this.getLeaderboard(activeSeason.id);
  }

  async getLeaderboard(seasonId: string) {
    // Verify season exists
    const seasonDoc = await this.firestore.doc('seasons', seasonId).get();

    if (!seasonDoc.exists) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    const seasonData = seasonDoc.data() as Season;
    const season = {
      id: seasonId,
      name: seasonData.name,
      startDate: this.firestore.fromTimestamp(seasonData.startDate),
      endDate: this.firestore.fromTimestamp(seasonData.endDate),
      isActive: seasonData.isActive,
    };

    // Get all completed tournaments for this season
    const completedTournamentsSnapshot = await this.firestore
      .collection('tournaments')
      .where('seasonId', '==', seasonId)
      .where('status', '==', 'COMPLETED')
      .get();

    const completedTournamentIds = completedTournamentsSnapshot.docs.map(
      (doc) => doc.id,
    );

    if (completedTournamentIds.length === 0) {
      return {
        season,
        leaderboard: [],
        totalPlayers: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Get all participations for completed tournaments with rating points
    const participationsSnapshot = await this.firestore
      .collection('tournamentParticipations')
      .where('seasonId', '==', seasonId)
      .get();

    const participations = participationsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as TournamentParticipation)
      .filter(
        (p) =>
          completedTournamentIds.includes(p.tournamentId) &&
          p.ratingPointsEarned !== null,
      );

    // Get player info for all participants
    const playerIds = [...new Set(participations.map((p) => p.playerId))];
    const playersMap = new Map<
      string,
      { firstName: string; lastName: string; isActive: boolean }
    >();

    for (const playerId of playerIds) {
      const playerDoc = await this.firestore.doc('players', playerId).get();
      if (playerDoc.exists) {
        const playerData = playerDoc.data();
        playersMap.set(playerId, {
          firstName: playerData?.firstName || '',
          lastName: playerData?.lastName || '',
          isActive: playerData?.isActive ?? true,
        });
      }
    }

    // Aggregate rating points by player
    const playerRatings = new Map<
      string,
      {
        player: { id: string; firstName: string; lastName: string; isActive: boolean };
        totalPoints: number;
        tournamentsPlayed: number;
        totalPosition: number;
        positionCount: number;
        totalGameScore: number;
        totalGamesPlayed: number;
        tournaments: Array<{
          tournamentId: string;
          tournamentName: string;
          date: string;
          position: number | null;
          points: number;
        }>;
      }
    >();

    participations.forEach((participation) => {
      const playerId = participation.playerId;
      const points = participation.ratingPointsEarned || 0;
      const playerInfo = playersMap.get(playerId);

      if (!playerInfo) return;

      if (!playerRatings.has(playerId)) {
        playerRatings.set(playerId, {
          player: {
            id: playerId,
            firstName: playerInfo.firstName,
            lastName: playerInfo.lastName,
            isActive: playerInfo.isActive,
          },
          totalPoints: 0,
          tournamentsPlayed: 0,
          totalPosition: 0,
          positionCount: 0,
          totalGameScore: 0,
          totalGamesPlayed: 0,
          tournaments: [],
        });
      }

      const playerData = playerRatings.get(playerId)!;
      playerData.totalPoints += points;
      playerData.tournamentsPlayed += 1;

      // Track position for average calculation
      if (participation.finalPosition !== null) {
        playerData.totalPosition += participation.finalPosition;
        playerData.positionCount += 1;
      }

      // Track game scores for average calculation
      if (participation.gameScores && Array.isArray(participation.gameScores)) {
        participation.gameScores.forEach((score) => {
          if (typeof score === 'number' && !isNaN(score) && score > 0) {
            playerData.totalGameScore += score;
            playerData.totalGamesPlayed += 1;
          }
        });
      }

      playerData.tournaments.push({
        tournamentId: participation.tournamentId,
        tournamentName: participation.tournamentName,
        date: this.firestore.fromTimestamp(participation.tournamentDate)?.toISOString() || '',
        position: participation.finalPosition,
        points,
      });
    });

    // Convert to array and sort by total points (descending)
    const leaderboard = Array.from(playerRatings.values())
      .map((data) => ({
        rank: 0,
        playerId: data.player.id,
        playerName: `${data.player.firstName} ${data.player.lastName}`,
        isActive: data.player.isActive,
        totalPoints: data.totalPoints,
        tournamentsPlayed: data.tournamentsPlayed,
        averagePoints:
          data.tournamentsPlayed > 0
            ? data.totalPoints / data.tournamentsPlayed
            : 0,
        averagePosition:
          data.totalGamesPlayed > 0
            ? data.totalGameScore / data.totalGamesPlayed
            : 0,
        tournaments: data.tournaments,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return {
      season,
      leaderboard,
      totalPlayers: leaderboard.length,
      lastUpdated: new Date().toISOString(),
    };
  }
}
