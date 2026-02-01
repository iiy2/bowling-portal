import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { CascadeService } from '../firestore/cascade.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayerQueryDto } from './dto/player-query.dto';

interface Player {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  firstNameLower: string;
  lastNameLower: string;
  email: string | null;
  emailLower: string | null;
  phone: string | null;
  registrationDate: FirebaseFirestore.Timestamp;
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  overallStats?: {
    averageScore: number;
    highestScore: number;
    totalTournamentsPlayed: number;
    totalRatingPoints: number;
  };
}

export interface User {
  id: string;
  email: string;
  role: string;
}

type UserRole = 'ADMIN' | 'REGULAR';

@Injectable()
export class PlayersService {
  constructor(
    private firestore: FirestoreService,
    private cascadeService: CascadeService,
  ) {}

  async create(
    createPlayerDto: CreatePlayerDto,
    userId: string,
    userRole: UserRole,
  ) {
    // Regular users: automatically assign player to themselves
    // Admin users: can leave userId null (unassigned player)
    const finalUserId = userRole === 'ADMIN' ? null : userId;

    const playerId = this.firestore.generateId();
    const playerData = {
      id: playerId,
      ...createPlayerDto,
      firstNameLower: createPlayerDto.firstName.toLowerCase(),
      lastNameLower: createPlayerDto.lastName.toLowerCase(),
      emailLower: createPlayerDto.email?.toLowerCase() || null,
      userId: finalUserId,
      isActive: createPlayerDto.isActive ?? true,
      registrationDate: this.firestore.serverTimestamp(),
      createdAt: this.firestore.serverTimestamp(),
      updatedAt: this.firestore.serverTimestamp(),
      overallStats: {
        averageScore: 0,
        highestScore: 0,
        totalTournamentsPlayed: 0,
        totalRatingPoints: 0,
      },
    };

    await this.firestore.doc('players', playerId).set(playerData);

    // Get user info if assigned
    let user: User | null = null;
    if (finalUserId) {
      const userDoc = await this.firestore.doc('users', finalUserId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        user = {
          id: userDoc.id,
          email: userData?.email,
          role: userData?.role,
        };
      }
    }

    return {
      ...playerData,
      registrationDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      user,
    };
  }

  async findAll(query: PlayerQueryDto) {
    const { search, isActive, page = 1, limit = 10 } = query;

    let firestoreQuery = this.firestore.collection('players').orderBy('lastName');

    // Apply isActive filter if specified
    if (isActive !== undefined) {
      firestoreQuery = firestoreQuery.where('isActive', '==', isActive) as any;
    }

    // Get all matching documents (we'll filter search in memory for case-insensitive)
    const snapshot = await firestoreQuery.get();
    let players = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Player & { id: string })[];

    // Apply search filter in memory (case-insensitive)
    if (search) {
      const searchLower = search.toLowerCase();
      players = players.filter(
        (p) =>
          p.firstNameLower?.includes(searchLower) ||
          p.lastNameLower?.includes(searchLower) ||
          p.emailLower?.includes(searchLower),
      );
    }

    const total = players.length;

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedPlayers = players.slice(skip, skip + limit);

    // Fetch user info for players with userId
    const playersWithUser = await Promise.all(
      paginatedPlayers.map(async (player) => {
        let user: User | null = null;
        if (player.userId) {
          const userDoc = await this.firestore.doc('users', player.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            user = {
              id: userDoc.id,
              email: userData?.email,
              role: userData?.role,
            };
          }
        }

        // Format statistics from overallStats
        const statistics = player.overallStats
          ? [
              {
                averageScore: player.overallStats.averageScore,
                highestScore: player.overallStats.highestScore,
                totalTournamentsPlayed: player.overallStats.totalTournamentsPlayed,
                totalRatingPoints: player.overallStats.totalRatingPoints,
              },
            ]
          : [];

        return {
          ...player,
          registrationDate: this.firestore.fromTimestamp(
            player.registrationDate as any,
          ),
          createdAt: this.firestore.fromTimestamp(player.createdAt as any),
          updatedAt: this.firestore.fromTimestamp(player.updatedAt as any),
          user,
          statistics,
        };
      }),
    );

    return {
      data: playersWithUser,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const playerDoc = await this.firestore.doc('players', id).get();

    if (!playerDoc.exists) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    const player = { id: playerDoc.id, ...playerDoc.data() } as Player;

    // Get user info
    let user: User | null = null;
    if (player.userId) {
      const userDoc = await this.firestore.doc('users', player.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        user = {
          id: userDoc.id,
          email: userData?.email,
          role: userData?.role,
        };
      }
    }

    // Get statistics for this player
    const statsSnapshot = await this.firestore
      .collection('playerStatistics')
      .where('playerId', '==', id)
      .get();

    const statistics = await Promise.all(
      statsSnapshot.docs.map(async (doc) => {
        const statData = doc.data();
        let season: { id: string; name: string } | null = null;
        if (statData.seasonId) {
          const seasonDoc = await this.firestore
            .doc('seasons', statData.seasonId)
            .get();
          if (seasonDoc.exists) {
            const seasonData = seasonDoc.data();
            season = {
              id: seasonDoc.id,
              name: seasonData?.name,
            };
          }
        }
        return {
          id: doc.id,
          seasonId: statData.seasonId,
          averageScore: statData.averageScore,
          highestScore: statData.highestScore,
          totalTournamentsPlayed: statData.totalTournamentsPlayed,
          totalRatingPoints: statData.totalRatingPoints,
          season,
        };
      }),
    );

    // Get recent participations
    const participationsSnapshot = await this.firestore
      .collection('tournamentParticipations')
      .where('playerId', '==', id)
      .orderBy('tournamentDate', 'desc')
      .limit(10)
      .get();

    const participations = participationsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        tournamentId: data.tournamentId,
        handicap: data.handicap,
        gameScores: data.gameScores,
        totalScore: data.totalScore,
        finalsScores: data.finalsScores,
        finalPosition: data.finalPosition,
        ratingPointsEarned: data.ratingPointsEarned,
        tournament: {
          id: data.tournamentId,
          name: data.tournamentName,
          date: this.firestore.fromTimestamp(data.tournamentDate),
          status: data.tournamentStatus || 'COMPLETED',
        },
      };
    });

    return {
      ...player,
      registrationDate: this.firestore.fromTimestamp(
        player.registrationDate as any,
      ),
      createdAt: this.firestore.fromTimestamp(player.createdAt as any),
      updatedAt: this.firestore.fromTimestamp(player.updatedAt as any),
      user,
      statistics,
      participations,
    };
  }

  async update(id: string, updatePlayerDto: UpdatePlayerDto) {
    const playerDoc = await this.firestore.doc('players', id).get();

    if (!playerDoc.exists) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    const player = playerDoc.data() as Player;

    const updateData: any = {
      ...updatePlayerDto,
      updatedAt: this.firestore.serverTimestamp(),
    };

    // Update lowercase fields if name/email changed
    if (updatePlayerDto.firstName) {
      updateData.firstNameLower = updatePlayerDto.firstName.toLowerCase();
    }
    if (updatePlayerDto.lastName) {
      updateData.lastNameLower = updatePlayerDto.lastName.toLowerCase();
    }
    if (updatePlayerDto.email !== undefined) {
      updateData.emailLower = updatePlayerDto.email?.toLowerCase() || null;
    }

    await this.firestore.doc('players', id).update(updateData);

    // Update denormalized names if name changed
    if (updatePlayerDto.firstName || updatePlayerDto.lastName) {
      const newFirstName = updatePlayerDto.firstName || player.firstName;
      const newLastName = updatePlayerDto.lastName || player.lastName;
      await this.cascadeService.updatePlayerNameDenormalized(
        id,
        newFirstName,
        newLastName,
      );
    }

    // Get updated player
    const updatedPlayerDoc = await this.firestore.doc('players', id).get();
    const updatedPlayer = {
      id: updatedPlayerDoc.id,
      ...updatedPlayerDoc.data(),
    } as Player;

    // Get user info
    let user: User | null = null;
    if (updatedPlayer.userId) {
      const userDoc = await this.firestore
        .doc('users', updatedPlayer.userId)
        .get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        user = {
          id: userDoc.id,
          email: userData?.email,
          role: userData?.role,
        };
      }
    }

    return {
      ...updatedPlayer,
      registrationDate: this.firestore.fromTimestamp(
        updatedPlayer.registrationDate as any,
      ),
      createdAt: this.firestore.fromTimestamp(updatedPlayer.createdAt as any),
      updatedAt: this.firestore.fromTimestamp(updatedPlayer.updatedAt as any),
      user,
    };
  }

  async remove(id: string) {
    const playerDoc = await this.firestore.doc('players', id).get();

    if (!playerDoc.exists) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    const player = playerDoc.data() as Player;

    // Use cascade service to delete player and related data
    await this.cascadeService.deletePlayerCascade(id, player.userId);

    return { message: 'Player deleted successfully' };
  }

  async getSuggestions(query: string, limit: number = 10) {
    const queryLower = query.toLowerCase();

    // Get active players
    const snapshot = await this.firestore
      .collection('players')
      .where('isActive', '==', true)
      .orderBy('lastName')
      .get();

    // Filter by name match in memory
    const matchingPlayers = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Player)
      .filter(
        (p) =>
          p.firstNameLower?.includes(queryLower) ||
          p.lastNameLower?.includes(queryLower),
      )
      .slice(0, limit);

    return matchingPlayers.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
    }));
  }
}
