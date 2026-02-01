import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { CascadeService } from '../firestore/cascade.service';
import {
  CreateTournamentDto,
  TournamentStatus,
} from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { UpdateParticipationResultDto } from './dto/update-participation-result.dto';

interface Tournament {
  id: string;
  seasonId: string;
  seasonName: string;
  name: string;
  date: FirebaseFirestore.Timestamp;
  location: string;
  maxParticipants: number | null;
  description: string | null;
  status: string;
  qualificationCompleted: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  participationCount: number;
  pendingApplicationCount: number;
}

interface Season {
  id: string;
  name: string;
  startDate: FirebaseFirestore.Timestamp;
  endDate: FirebaseFirestore.Timestamp;
  isActive: boolean;
  ratingConfig?: {
    pointsDistribution: Record<string, number>;
  } | null;
}

interface Player {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface TournamentParticipation {
  id: string;
  tournamentId: string;
  playerId: string;
  tournamentId_playerId: string;
  playerName: string;
  playerFirstName: string;
  playerLastName: string;
  tournamentName: string;
  tournamentDate: FirebaseFirestore.Timestamp;
  tournamentStatus: string;
  seasonId: string;
  handicap: number | null;
  gameScores: number[] | null;
  totalScore: number | null;
  finalsScores: number[] | null;
  finalPosition: number | null;
  ratingPointsEarned: number | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface TournamentApplication {
  id: string;
  tournamentId: string;
  playerId: string;
  tournamentId_playerId: string;
  playerName: string;
  playerFirstName: string;
  playerLastName: string;
  applicationDate: FirebaseFirestore.Timestamp;
  status: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class TournamentsService {
  constructor(
    private firestore: FirestoreService,
    private cascadeService: CascadeService,
  ) {}

  async create(createTournamentDto: CreateTournamentDto) {
    const { seasonId, ...tournamentData } = createTournamentDto;

    const seasonDoc = await this.firestore.doc('seasons', seasonId).get();
    if (!seasonDoc.exists) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }
    const season = seasonDoc.data() as Season;

    const tournamentDate = new Date(createTournamentDto.date);
    const seasonStart = this.firestore.fromTimestamp(season.startDate)!;
    const seasonEnd = this.firestore.fromTimestamp(season.endDate)!;

    if (tournamentDate < seasonStart || tournamentDate > seasonEnd) {
      throw new BadRequestException(
        `Tournament date must be within season dates (${seasonStart.toISOString().split('T')[0]} to ${seasonEnd.toISOString().split('T')[0]})`,
      );
    }

    const tournamentId = this.firestore.generateId();
    const tournament = {
      id: tournamentId,
      ...tournamentData,
      seasonId,
      seasonName: season.name,
      date: this.firestore.toTimestamp(tournamentDate),
      status: tournamentData.status || TournamentStatus.UPCOMING,
      qualificationCompleted: false,
      participationCount: 0,
      pendingApplicationCount: 0,
      createdAt: this.firestore.serverTimestamp(),
      updatedAt: this.firestore.serverTimestamp(),
    };

    await this.firestore.doc('tournaments', tournamentId).set(tournament);
    await this.firestore.doc('seasons', seasonId).update({
      tournamentCount: this.firestore.increment(1),
    });

    return {
      ...tournament,
      date: tournamentDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      season: { id: seasonId, name: season.name },
      _count: { participations: 0 },
    };
  }

  async findAll(query: TournamentQueryDto) {
    const { page = 1, limit = 10, seasonId, status, fromDate, toDate } = query;

    let firestoreQuery = this.firestore.collection('tournaments').orderBy('date', 'desc');
    if (seasonId) firestoreQuery = firestoreQuery.where('seasonId', '==', seasonId) as any;
    if (status) firestoreQuery = firestoreQuery.where('status', '==', status) as any;

    const snapshot = await firestoreQuery.get();
    let tournaments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Tournament[];

    if (fromDate) {
      const fromDateTime = new Date(fromDate).getTime();
      tournaments = tournaments.filter((t) => this.firestore.fromTimestamp(t.date)!.getTime() >= fromDateTime);
    }
    if (toDate) {
      const toDateTime = new Date(toDate).getTime();
      tournaments = tournaments.filter((t) => this.firestore.fromTimestamp(t.date)!.getTime() <= toDateTime);
    }

    const total = tournaments.length;
    const skip = (page - 1) * limit;
    const paginatedTournaments = tournaments.slice(skip, skip + limit);

    const tournamentsWithSeason = await Promise.all(
      paginatedTournaments.map(async (tournament) => {
        const seasonDoc = await this.firestore.doc('seasons', tournament.seasonId).get();
        const season = seasonDoc.exists ? (seasonDoc.data() as Season) : null;
        return {
          ...tournament,
          date: this.firestore.fromTimestamp(tournament.date),
          createdAt: this.firestore.fromTimestamp(tournament.createdAt),
          updatedAt: this.firestore.fromTimestamp(tournament.updatedAt),
          season: season ? { id: tournament.seasonId, name: season.name } : null,
          _count: { participations: tournament.participationCount || 0 },
        };
      }),
    );

    return { data: tournamentsWithSeason, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const tournamentDoc = await this.firestore.doc('tournaments', id).get();
    if (!tournamentDoc.exists) throw new NotFoundException(`Tournament with ID ${id} not found`);
    const tournament = tournamentDoc.data() as Tournament;

    const seasonDoc = await this.firestore.doc('seasons', tournament.seasonId).get();
    const season = seasonDoc.exists ? (seasonDoc.data() as Season) : null;

    const participationsSnapshot = await this.firestore.collection('tournamentParticipations').where('tournamentId', '==', id).get();
    const participations = await Promise.all(
      participationsSnapshot.docs.map(async (doc) => {
        const pData = doc.data() as TournamentParticipation;
        const playerDoc = await this.firestore.doc('players', pData.playerId).get();
        const player = playerDoc.exists ? (playerDoc.data() as Player) : null;
        return {
          id: doc.id, tournamentId: pData.tournamentId, playerId: pData.playerId,
          handicap: pData.handicap, gameScores: pData.gameScores, totalScore: pData.totalScore,
          finalsScores: pData.finalsScores, finalPosition: pData.finalPosition, ratingPointsEarned: pData.ratingPointsEarned,
          createdAt: this.firestore.fromTimestamp(pData.createdAt), updatedAt: this.firestore.fromTimestamp(pData.updatedAt),
          player: player ? { id: pData.playerId, firstName: player.firstName, lastName: player.lastName, isActive: player.isActive } : null,
        };
      }),
    );
    participations.sort((a, b) => (a.finalPosition ?? 999) - (b.finalPosition ?? 999));

    const applicationsSnapshot = await this.firestore.collection('tournamentApplications').where('tournamentId', '==', id).where('status', '==', 'PENDING').get();
    const applications = await Promise.all(
      applicationsSnapshot.docs.map(async (doc) => {
        const aData = doc.data() as TournamentApplication;
        const playerDoc = await this.firestore.doc('players', aData.playerId).get();
        const player = playerDoc.exists ? (playerDoc.data() as Player) : null;
        return {
          id: doc.id, tournamentId: aData.tournamentId, playerId: aData.playerId,
          applicationDate: this.firestore.fromTimestamp(aData.applicationDate), status: aData.status,
          player: player ? { id: aData.playerId, firstName: player.firstName, lastName: player.lastName, isActive: player.isActive } : null,
        };
      }),
    );

    return {
      id: tournamentDoc.id, name: tournament.name, date: this.firestore.fromTimestamp(tournament.date),
      location: tournament.location, maxParticipants: tournament.maxParticipants, description: tournament.description,
      status: tournament.status, qualificationCompleted: tournament.qualificationCompleted, seasonId: tournament.seasonId,
      createdAt: this.firestore.fromTimestamp(tournament.createdAt), updatedAt: this.firestore.fromTimestamp(tournament.updatedAt),
      season: season ? {
        id: tournament.seasonId, name: season.name, startDate: this.firestore.fromTimestamp(season.startDate),
        endDate: this.firestore.fromTimestamp(season.endDate), isActive: season.isActive,
        ratingConfigurations: season.ratingConfig ? [{ pointsDistribution: season.ratingConfig.pointsDistribution }] : [],
      } : null,
      participations, applications, _count: { participations: tournament.participationCount || 0 },
    };
  }

  async update(id: string, updateTournamentDto: UpdateTournamentDto) {
    const tournamentDoc = await this.firestore.doc('tournaments', id).get();
    if (!tournamentDoc.exists) throw new NotFoundException(`Tournament with ID ${id} not found`);
    const existingTournament = tournamentDoc.data() as Tournament;

    const { seasonId, ...updateData } = updateTournamentDto;

    if (seasonId && seasonId !== existingTournament.seasonId) {
      const newSeasonDoc = await this.firestore.doc('seasons', seasonId).get();
      if (!newSeasonDoc.exists) throw new NotFoundException(`Season with ID ${seasonId} not found`);
      const newSeason = newSeasonDoc.data() as Season;
      const tournamentDate = updateTournamentDto.date ? new Date(updateTournamentDto.date) : this.firestore.fromTimestamp(existingTournament.date)!;
      const seasonStart = this.firestore.fromTimestamp(newSeason.startDate)!;
      const seasonEnd = this.firestore.fromTimestamp(newSeason.endDate)!;
      if (tournamentDate < seasonStart || tournamentDate > seasonEnd) {
        throw new BadRequestException(`Tournament date must be within season dates`);
      }
    }

    const firestoreUpdateData: any = { ...updateData, updatedAt: this.firestore.serverTimestamp() };
    if (updateTournamentDto.date) firestoreUpdateData.date = this.firestore.toTimestamp(new Date(updateTournamentDto.date));
    if (seasonId) {
      firestoreUpdateData.seasonId = seasonId;
      const newSeasonDoc = await this.firestore.doc('seasons', seasonId).get();
      if (newSeasonDoc.exists) firestoreUpdateData.seasonName = newSeasonDoc.data()?.name;
    }

    await this.firestore.doc('tournaments', id).update(firestoreUpdateData);

    if (updateTournamentDto.name || updateTournamentDto.date) {
      const updatedTournamentDoc = await this.firestore.doc('tournaments', id).get();
      const updatedTournament = updatedTournamentDoc.data() as Tournament;
      await this.cascadeService.updateTournamentInfoDenormalized(id, updatedTournament.name, updatedTournament.date);
    }

    const updatedDoc = await this.firestore.doc('tournaments', id).get();
    const updated = updatedDoc.data() as Tournament;
    const seasonDoc = await this.firestore.doc('seasons', updated.seasonId).get();
    const season = seasonDoc.exists ? (seasonDoc.data() as Season) : null;

    return {
      id: updatedDoc.id, name: updated.name, date: this.firestore.fromTimestamp(updated.date),
      location: updated.location, maxParticipants: updated.maxParticipants, description: updated.description,
      status: updated.status, seasonId: updated.seasonId, createdAt: this.firestore.fromTimestamp(updated.createdAt),
      updatedAt: this.firestore.fromTimestamp(updated.updatedAt),
      season: season ? { id: updated.seasonId, name: season.name } : null,
      _count: { participations: updated.participationCount || 0 },
    };
  }

  async remove(id: string) {
    const tournamentDoc = await this.firestore.doc('tournaments', id).get();
    if (!tournamentDoc.exists) throw new NotFoundException(`Tournament with ID ${id} not found`);
    const tournament = tournamentDoc.data() as Tournament;

    if (tournament.participationCount > 0) {
      throw new ConflictException(`Cannot delete tournament with ${tournament.participationCount} participants. Remove participants first.`);
    }

    await this.cascadeService.deleteTournamentCascade(id, tournament.seasonId);
    return { message: 'Tournament deleted successfully' };
  }

  async updateStatus(id: string, status: TournamentStatus) {
    const tournamentDoc = await this.firestore.doc('tournaments', id).get();
    if (!tournamentDoc.exists) throw new NotFoundException(`Tournament with ID ${id} not found`);
    const tournament = tournamentDoc.data() as Tournament;

    if (status === TournamentStatus.COMPLETED) {
      await this.calculateAndSaveRatingPoints(id, tournament);
    }

    await this.firestore.doc('tournaments', id).update({ status, updatedAt: this.firestore.serverTimestamp() });

    const updatedDoc = await this.firestore.doc('tournaments', id).get();
    const updated = updatedDoc.data() as Tournament;
    const seasonDoc = await this.firestore.doc('seasons', updated.seasonId).get();
    const season = seasonDoc.exists ? (seasonDoc.data() as Season) : null;

    return {
      id: updatedDoc.id, name: updated.name, date: this.firestore.fromTimestamp(updated.date),
      location: updated.location, status: updated.status, seasonId: updated.seasonId,
      season: season ? { id: updated.seasonId, name: season.name } : null,
      _count: { participations: updated.participationCount || 0 },
    };
  }

  private async calculateAndSaveRatingPoints(tournamentId: string, tournament: Tournament) {
    const seasonDoc = await this.firestore.doc('seasons', tournament.seasonId).get();
    const season = seasonDoc.exists ? (seasonDoc.data() as Season) : null;
    if (!season?.ratingConfig?.pointsDistribution) return;

    const pointsDistribution = season.ratingConfig.pointsDistribution;
    const participationsSnapshot = await this.firestore.collection('tournamentParticipations').where('tournamentId', '==', tournamentId).get();
    const participations = participationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as TournamentParticipation[];
    if (participations.length === 0) return;

    const numberOfGames = this.calculateNumberOfGames(participations.length);
    const sortedParticipations = [...participations].sort((a, b) => {
      const hasFinalsResults = participations.some((p) => p.finalsScores && Array.isArray(p.finalsScores) && p.finalsScores.length > 0);
      if (hasFinalsResults) {
        const aHasFinalsScores = a.finalsScores && Array.isArray(a.finalsScores) && a.finalsScores.length > 0;
        const bHasFinalsScores = b.finalsScores && Array.isArray(b.finalsScores) && b.finalsScores.length > 0;
        if (aHasFinalsScores && bHasFinalsScores) {
          return b.finalsScores!.reduce((sum, s) => sum + s, 0) - a.finalsScores!.reduce((sum, s) => sum + s, 0);
        }
        if (aHasFinalsScores) return -1;
        if (bHasFinalsScores) return 1;
        return ((b.totalScore || 0) + (b.handicap || 0) * numberOfGames) - ((a.totalScore || 0) + (a.handicap || 0) * numberOfGames);
      }
      return ((b.totalScore || 0) + (b.handicap || 0) * numberOfGames) - ((a.totalScore || 0) + (a.handicap || 0) * numberOfGames);
    });

    const batch = this.firestore.batch();
    sortedParticipations.forEach((participation, index) => {
      const position = index + 1;
      batch.update(this.firestore.doc('tournamentParticipations', participation.id), {
        finalPosition: position, ratingPointsEarned: pointsDistribution[position.toString()] || 0, updatedAt: this.firestore.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  private calculateNumberOfGames(participantCount: number): number {
    if (participantCount <= 8) return 6;
    if (participantCount <= 12) return 7;
    return 8;
  }

  async getUpcoming(limit: number = 5) {
    const now = new Date();
    const snapshot = await this.firestore.collection('tournaments').where('status', '==', TournamentStatus.UPCOMING).orderBy('date', 'asc').get();
    const tournaments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Tournament).filter((t) => this.firestore.fromTimestamp(t.date)! >= now).slice(0, limit);

    return Promise.all(tournaments.map(async (tournament) => {
      const seasonDoc = await this.firestore.doc('seasons', tournament.seasonId).get();
      const season = seasonDoc.exists ? (seasonDoc.data() as Season) : null;
      return { ...tournament, date: this.firestore.fromTimestamp(tournament.date), season: season ? { id: tournament.seasonId, name: season.name } : null, _count: { participations: tournament.participationCount || 0 } };
    }));
  }

  async applyToTournament(tournamentId: string, playerId: string, userId: string, userRole: string) {
    const tournamentDoc = await this.firestore.doc('tournaments', tournamentId).get();
    if (!tournamentDoc.exists) throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    const tournament = tournamentDoc.data() as Tournament;

    const playerDoc = await this.firestore.doc('players', playerId).get();
    if (!playerDoc.exists) throw new NotFoundException(`Player with ID ${playerId} not found`);
    const player = playerDoc.data() as Player;

    if (userRole !== 'ADMIN' && player.userId !== userId) throw new BadRequestException('You can only apply with your own players');
    if (tournament.maxParticipants && tournament.participationCount >= tournament.maxParticipants) throw new BadRequestException('Tournament is full');

    const existingApplicationSnapshot = await this.firestore.collection('tournamentApplications').where('tournamentId_playerId', '==', `${tournamentId}_${playerId}`).limit(1).get();
    if (!existingApplicationSnapshot.empty) throw new ConflictException('Player has already applied to this tournament');

    const existingParticipationSnapshot = await this.firestore.collection('tournamentParticipations').where('tournamentId_playerId', '==', `${tournamentId}_${playerId}`).limit(1).get();
    if (!existingParticipationSnapshot.empty) throw new ConflictException('Player is already participating in this tournament');

    if (userRole === 'ADMIN') {
      const handicap = await this.calculateHandicap(playerId, tournament.seasonId);
      const participationId = this.firestore.generateId();
      const participation = {
        id: participationId, tournamentId, playerId, tournamentId_playerId: `${tournamentId}_${playerId}`,
        playerName: `${player.firstName} ${player.lastName}`, playerFirstName: player.firstName, playerLastName: player.lastName,
        tournamentName: tournament.name, tournamentDate: tournament.date, tournamentStatus: tournament.status, seasonId: tournament.seasonId,
        handicap, gameScores: null, totalScore: null, finalsScores: null, finalPosition: null, ratingPointsEarned: null,
        createdAt: this.firestore.serverTimestamp(), updatedAt: this.firestore.serverTimestamp(),
      };
      await this.firestore.doc('tournamentParticipations', participationId).set(participation);
      await this.firestore.doc('tournaments', tournamentId).update({ participationCount: this.firestore.increment(1) });
      return { message: 'Player added to tournament successfully', participation: { ...participation, createdAt: new Date(), updatedAt: new Date(), tournamentDate: this.firestore.fromTimestamp(tournament.date), player: { id: playerId, firstName: player.firstName, lastName: player.lastName }, tournament: { id: tournamentId, name: tournament.name } } };
    } else {
      const applicationId = this.firestore.generateId();
      const application = {
        id: applicationId, tournamentId, playerId, tournamentId_playerId: `${tournamentId}_${playerId}`,
        playerName: `${player.firstName} ${player.lastName}`, playerFirstName: player.firstName, playerLastName: player.lastName,
        applicationDate: this.firestore.serverTimestamp(), status: 'PENDING', createdAt: this.firestore.serverTimestamp(), updatedAt: this.firestore.serverTimestamp(),
      };
      await this.firestore.doc('tournamentApplications', applicationId).set(application);
      await this.firestore.doc('tournaments', tournamentId).update({ pendingApplicationCount: this.firestore.increment(1) });
      return { ...application, applicationDate: new Date(), createdAt: new Date(), updatedAt: new Date(), player: { id: playerId, firstName: player.firstName, lastName: player.lastName }, tournament: { id: tournamentId, name: tournament.name } };
    }
  }

  async getApplications(tournamentId: string) {
    const tournamentDoc = await this.firestore.doc('tournaments', tournamentId).get();
    if (!tournamentDoc.exists) throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);

    const snapshot = await this.firestore.collection('tournamentApplications').where('tournamentId', '==', tournamentId).orderBy('applicationDate', 'asc').get();
    return Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data() as TournamentApplication;
      const playerDoc = await this.firestore.doc('players', data.playerId).get();
      const player = playerDoc.exists ? (playerDoc.data() as Player) : null;
      return { id: doc.id, tournamentId: data.tournamentId, playerId: data.playerId, applicationDate: this.firestore.fromTimestamp(data.applicationDate), status: data.status, player: player ? { id: data.playerId, firstName: player.firstName, lastName: player.lastName } : null };
    }));
  }

  private async calculateHandicap(playerId: string, seasonId: string): Promise<number | null> {
    const completedTournamentsSnapshot = await this.firestore.collection('tournaments').where('seasonId', '==', seasonId).where('status', '==', 'COMPLETED').get();
    const completedTournamentIds = completedTournamentsSnapshot.docs.map((doc) => doc.id);
    if (completedTournamentIds.length === 0) return null;

    const participationsSnapshot = await this.firestore.collection('tournamentParticipations').where('playerId', '==', playerId).where('seasonId', '==', seasonId).orderBy('tournamentDate', 'desc').get();
    const participations = participationsSnapshot.docs.map((doc) => doc.data() as TournamentParticipation).filter((p) => completedTournamentIds.includes(p.tournamentId) && p.gameScores && Array.isArray(p.gameScores)).slice(0, 2);
    if (participations.length < 2) return null;

    let totalScore = 0, totalGames = 0;
    participations.forEach((participation) => {
      if (participation.gameScores && Array.isArray(participation.gameScores)) {
        participation.gameScores.slice(0, 6).forEach((score) => { if (typeof score === 'number' && !isNaN(score) && score > 0) { totalScore += score; totalGames += 1; } });
      }
    });
    if (totalGames === 0) return null;

    const average = totalScore / totalGames;
    return Math.max(-15, Math.min(15, Math.round((180 - average) / 2)));
  }

  async approveApplication(applicationId: string) {
    return this.firestore.runTransaction(async (transaction) => {
      const applicationRef = this.firestore.doc('tournamentApplications', applicationId);
      const applicationDoc = await transaction.get(applicationRef);
      if (!applicationDoc.exists) throw new NotFoundException(`Application with ID ${applicationId} not found`);
      const application = applicationDoc.data() as TournamentApplication;
      if (application.status !== 'PENDING') throw new BadRequestException(`Application has already been ${application.status.toLowerCase()}`);

      const tournamentRef = this.firestore.doc('tournaments', application.tournamentId);
      const tournamentDoc = await transaction.get(tournamentRef);
      const tournament = tournamentDoc.data() as Tournament;
      if (tournament.maxParticipants && tournament.participationCount >= tournament.maxParticipants) throw new BadRequestException('Tournament is full');

      const handicap = await this.calculateHandicap(application.playerId, tournament.seasonId);
      const participationId = this.firestore.generateId();
      const participationRef = this.firestore.doc('tournamentParticipations', participationId);
      const participation = {
        id: participationId, tournamentId: application.tournamentId, playerId: application.playerId, tournamentId_playerId: `${application.tournamentId}_${application.playerId}`,
        playerName: application.playerName, playerFirstName: application.playerFirstName, playerLastName: application.playerLastName,
        tournamentName: tournament.name, tournamentDate: tournament.date, tournamentStatus: tournament.status, seasonId: tournament.seasonId,
        handicap, gameScores: null, totalScore: null, finalsScores: null, finalPosition: null, ratingPointsEarned: null,
        createdAt: this.firestore.serverTimestamp(), updatedAt: this.firestore.serverTimestamp(),
      };

      transaction.update(applicationRef, { status: 'APPROVED', updatedAt: this.firestore.serverTimestamp() });
      transaction.set(participationRef, participation);
      transaction.update(tournamentRef, { participationCount: this.firestore.increment(1), pendingApplicationCount: this.firestore.increment(-1) });

      return {
        application: { ...application, id: applicationId, status: 'APPROVED', applicationDate: this.firestore.fromTimestamp(application.applicationDate), player: { id: application.playerId, firstName: application.playerFirstName, lastName: application.playerLastName } },
        participation: { ...participation, id: participationId, createdAt: new Date(), updatedAt: new Date(), tournamentDate: this.firestore.fromTimestamp(tournament.date), player: { id: application.playerId, firstName: application.playerFirstName, lastName: application.playerLastName } },
      };
    });
  }

  async rejectApplication(applicationId: string) {
    const applicationDoc = await this.firestore.doc('tournamentApplications', applicationId).get();
    if (!applicationDoc.exists) throw new NotFoundException(`Application with ID ${applicationId} not found`);
    const application = applicationDoc.data() as TournamentApplication;
    if (application.status !== 'PENDING') throw new BadRequestException(`Application has already been ${application.status.toLowerCase()}`);

    await this.firestore.doc('tournamentApplications', applicationId).update({ status: 'REJECTED', updatedAt: this.firestore.serverTimestamp() });
    await this.firestore.doc('tournaments', application.tournamentId).update({ pendingApplicationCount: this.firestore.increment(-1) });

    const playerDoc = await this.firestore.doc('players', application.playerId).get();
    const player = playerDoc.exists ? (playerDoc.data() as Player) : null;
    return { id: applicationId, tournamentId: application.tournamentId, playerId: application.playerId, applicationDate: this.firestore.fromTimestamp(application.applicationDate), status: 'REJECTED', player: player ? { id: application.playerId, firstName: player.firstName, lastName: player.lastName } : null };
  }

  async getParticipants(tournamentId: string) {
    const tournamentDoc = await this.firestore.doc('tournaments', tournamentId).get();
    if (!tournamentDoc.exists) throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);

    const snapshot = await this.firestore.collection('tournamentParticipations').where('tournamentId', '==', tournamentId).orderBy('createdAt', 'asc').get();
    return Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data() as TournamentParticipation;
      const playerDoc = await this.firestore.doc('players', data.playerId).get();
      const player = playerDoc.exists ? (playerDoc.data() as Player) : null;
      return { id: doc.id, tournamentId: data.tournamentId, playerId: data.playerId, handicap: data.handicap, gameScores: data.gameScores, totalScore: data.totalScore, finalsScores: data.finalsScores, finalPosition: data.finalPosition, ratingPointsEarned: data.ratingPointsEarned, createdAt: this.firestore.fromTimestamp(data.createdAt), player: player ? { id: data.playerId, firstName: player.firstName, lastName: player.lastName } : null };
    }));
  }

  async updateParticipationResult(tournamentId: string, participationId: string, updateData: UpdateParticipationResultDto) {
    const tournamentDoc = await this.firestore.doc('tournaments', tournamentId).get();
    if (!tournamentDoc.exists) throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);

    const participationDoc = await this.firestore.doc('tournamentParticipations', participationId).get();
    if (!participationDoc.exists) throw new NotFoundException(`Participation with ID ${participationId} not found`);
    const participation = participationDoc.data() as TournamentParticipation;
    if (participation.tournamentId !== tournamentId) throw new BadRequestException('Participation does not belong to this tournament');

    const firestoreUpdateData: any = { ...updateData, updatedAt: this.firestore.serverTimestamp() };
    if (updateData.gameScores && Array.isArray(updateData.gameScores)) firestoreUpdateData.totalScore = updateData.gameScores.reduce((sum, score) => sum + score, 0);

    await this.firestore.doc('tournamentParticipations', participationId).update(firestoreUpdateData);

    const updatedDoc = await this.firestore.doc('tournamentParticipations', participationId).get();
    const updated = updatedDoc.data() as TournamentParticipation;
    const playerDoc = await this.firestore.doc('players', updated.playerId).get();
    const player = playerDoc.exists ? (playerDoc.data() as Player) : null;
    const tournament = tournamentDoc.data() as Tournament;

    return { id: participationId, tournamentId: updated.tournamentId, playerId: updated.playerId, handicap: updated.handicap, gameScores: updated.gameScores, totalScore: updated.totalScore, finalsScores: updated.finalsScores, finalPosition: updated.finalPosition, ratingPointsEarned: updated.ratingPointsEarned, createdAt: this.firestore.fromTimestamp(updated.createdAt), updatedAt: this.firestore.fromTimestamp(updated.updatedAt), player: player ? { id: updated.playerId, firstName: player.firstName, lastName: player.lastName } : null, tournament: { id: tournamentId, name: tournament.name, date: this.firestore.fromTimestamp(tournament.date) } };
  }

  async removeParticipant(tournamentId: string, participationId: string) {
    const tournamentDoc = await this.firestore.doc('tournaments', tournamentId).get();
    if (!tournamentDoc.exists) throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);

    const participationDoc = await this.firestore.doc('tournamentParticipations', participationId).get();
    if (!participationDoc.exists) throw new NotFoundException(`Participation with ID ${participationId} not found`);
    const participation = participationDoc.data() as TournamentParticipation;
    if (participation.tournamentId !== tournamentId) throw new BadRequestException('Participation does not belong to this tournament');

    await this.firestore.doc('tournamentParticipations', participationId).delete();
    await this.firestore.doc('tournaments', tournamentId).update({ participationCount: this.firestore.increment(-1) });
    return { message: 'Participant removed successfully' };
  }
}
