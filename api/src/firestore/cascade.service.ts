import { Injectable } from '@nestjs/common';
import { FirestoreService } from './firestore.service';

@Injectable()
export class CascadeService {
  constructor(private firestore: FirestoreService) {}

  /**
   * Delete a user and all related data
   * - Updates player.userId to null
   * - Deletes all notifications for this user
   * - Deletes email unique constraint
   */
  async deleteUserCascade(userId: string, email: string): Promise<void> {
    const batch = this.firestore.batch();

    // Update player to remove userId reference
    const playersSnapshot = await this.firestore
      .collection('players')
      .where('userId', '==', userId)
      .get();

    playersSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { userId: null });
    });

    // Delete notifications
    const notificationsSnapshot = await this.firestore
      .collection('notifications')
      .where('userId', '==', userId)
      .get();

    notificationsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete email unique constraint
    const emailConstraintRef = this.firestore
      .collection('uniqueConstraints')
      .doc('emails')
      .collection('values')
      .doc(email.toLowerCase());
    batch.delete(emailConstraintRef);

    // Delete user
    batch.delete(this.firestore.doc('users', userId));

    await batch.commit();
  }

  /**
   * Delete a player and all related data
   * - Deletes all tournament participations
   * - Deletes all tournament applications
   * - Deletes all player statistics
   * - Updates user.playerId to null
   * - Updates denormalized counts on tournaments
   */
  async deletePlayerCascade(playerId: string, userId?: string | null): Promise<void> {
    const batch = this.firestore.batch();
    let operationCount = 0;

    const commitBatchIfNeeded = async () => {
      if (operationCount >= 450) {
        await batch.commit();
        operationCount = 0;
      }
    };

    // Get tournament IDs for participation count updates
    const participationsSnapshot = await this.firestore
      .collection('tournamentParticipations')
      .where('playerId', '==', playerId)
      .get();

    const tournamentCountUpdates = new Map<string, number>();

    for (const doc of participationsSnapshot.docs) {
      const data = doc.data();
      const count = tournamentCountUpdates.get(data.tournamentId) || 0;
      tournamentCountUpdates.set(data.tournamentId, count + 1);
      batch.delete(doc.ref);
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Update tournament participation counts
    for (const [tournamentId, count] of tournamentCountUpdates) {
      batch.update(this.firestore.doc('tournaments', tournamentId), {
        participationCount: this.firestore.increment(-count),
      });
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Delete applications and update pending counts
    const applicationsSnapshot = await this.firestore
      .collection('tournamentApplications')
      .where('playerId', '==', playerId)
      .get();

    const pendingCountUpdates = new Map<string, number>();

    for (const doc of applicationsSnapshot.docs) {
      const data = doc.data();
      if (data.status === 'PENDING') {
        const count = pendingCountUpdates.get(data.tournamentId) || 0;
        pendingCountUpdates.set(data.tournamentId, count + 1);
      }
      batch.delete(doc.ref);
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Update tournament pending application counts
    for (const [tournamentId, count] of pendingCountUpdates) {
      batch.update(this.firestore.doc('tournaments', tournamentId), {
        pendingApplicationCount: this.firestore.increment(-count),
      });
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Delete player statistics
    const statisticsSnapshot = await this.firestore
      .collection('playerStatistics')
      .where('playerId', '==', playerId)
      .get();

    for (const doc of statisticsSnapshot.docs) {
      batch.delete(doc.ref);
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Update user if linked
    if (userId) {
      batch.update(this.firestore.doc('users', userId), { playerId: null });
      operationCount++;
    }

    // Delete player
    batch.delete(this.firestore.doc('players', playerId));
    operationCount++;

    if (operationCount > 0) {
      await batch.commit();
    }
  }

  /**
   * Delete a season and all related data
   * - Deletes all tournaments (which cascade their own data)
   * - Deletes all player statistics for this season
   */
  async deleteSeasonCascade(seasonId: string): Promise<void> {
    // Get all tournaments for this season
    const tournamentsSnapshot = await this.firestore
      .collection('tournaments')
      .where('seasonId', '==', seasonId)
      .get();

    // Delete each tournament with cascade
    for (const tournamentDoc of tournamentsSnapshot.docs) {
      await this.deleteTournamentCascade(tournamentDoc.id, seasonId);
    }

    const batch = this.firestore.batch();

    // Delete player statistics for this season
    const statisticsSnapshot = await this.firestore
      .collection('playerStatistics')
      .where('seasonId', '==', seasonId)
      .get();

    statisticsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete season
    batch.delete(this.firestore.doc('seasons', seasonId));

    await batch.commit();
  }

  /**
   * Delete a tournament and all related data
   * - Deletes all participations
   * - Deletes all applications
   * - Updates season tournament count
   */
  async deleteTournamentCascade(
    tournamentId: string,
    seasonId?: string,
  ): Promise<void> {
    const batch = this.firestore.batch();
    let operationCount = 0;

    // Delete participations
    const participationsSnapshot = await this.firestore
      .collection('tournamentParticipations')
      .where('tournamentId', '==', tournamentId)
      .get();

    for (const doc of participationsSnapshot.docs) {
      batch.delete(doc.ref);
      operationCount++;

      if (operationCount >= 450) {
        await batch.commit();
        operationCount = 0;
      }
    }

    // Delete applications
    const applicationsSnapshot = await this.firestore
      .collection('tournamentApplications')
      .where('tournamentId', '==', tournamentId)
      .get();

    for (const doc of applicationsSnapshot.docs) {
      batch.delete(doc.ref);
      operationCount++;

      if (operationCount >= 450) {
        await batch.commit();
        operationCount = 0;
      }
    }

    // Update season tournament count if seasonId provided
    if (seasonId) {
      batch.update(this.firestore.doc('seasons', seasonId), {
        tournamentCount: this.firestore.increment(-1),
      });
      operationCount++;
    }

    // Delete tournament
    batch.delete(this.firestore.doc('tournaments', tournamentId));
    operationCount++;

    if (operationCount > 0) {
      await batch.commit();
    }
  }

  /**
   * Update denormalized player name across all related documents
   */
  async updatePlayerNameDenormalized(
    playerId: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    const batch = this.firestore.batch();
    let operationCount = 0;
    const playerName = `${firstName} ${lastName}`;

    // Update participations
    const participationsSnapshot = await this.firestore
      .collection('tournamentParticipations')
      .where('playerId', '==', playerId)
      .get();

    for (const doc of participationsSnapshot.docs) {
      batch.update(doc.ref, {
        playerName,
        playerFirstName: firstName,
        playerLastName: lastName,
      });
      operationCount++;

      if (operationCount >= 450) {
        await batch.commit();
        operationCount = 0;
      }
    }

    // Update applications
    const applicationsSnapshot = await this.firestore
      .collection('tournamentApplications')
      .where('playerId', '==', playerId)
      .get();

    for (const doc of applicationsSnapshot.docs) {
      batch.update(doc.ref, {
        playerName,
        playerFirstName: firstName,
        playerLastName: lastName,
      });
      operationCount++;

      if (operationCount >= 450) {
        await batch.commit();
        operationCount = 0;
      }
    }

    // Update statistics
    const statisticsSnapshot = await this.firestore
      .collection('playerStatistics')
      .where('playerId', '==', playerId)
      .get();

    for (const doc of statisticsSnapshot.docs) {
      batch.update(doc.ref, { playerName });
      operationCount++;

      if (operationCount >= 450) {
        await batch.commit();
        operationCount = 0;
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }
  }

  /**
   * Update denormalized season name across tournaments
   */
  async updateSeasonNameDenormalized(
    seasonId: string,
    seasonName: string,
  ): Promise<void> {
    const batch = this.firestore.batch();

    const tournamentsSnapshot = await this.firestore
      .collection('tournaments')
      .where('seasonId', '==', seasonId)
      .get();

    tournamentsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { seasonName });
    });

    await batch.commit();
  }

  /**
   * Update denormalized tournament info across participations and applications
   */
  async updateTournamentInfoDenormalized(
    tournamentId: string,
    tournamentName: string,
    tournamentDate: FirebaseFirestore.Timestamp,
  ): Promise<void> {
    const batch = this.firestore.batch();
    let operationCount = 0;

    const participationsSnapshot = await this.firestore
      .collection('tournamentParticipations')
      .where('tournamentId', '==', tournamentId)
      .get();

    for (const doc of participationsSnapshot.docs) {
      batch.update(doc.ref, { tournamentName, tournamentDate });
      operationCount++;

      if (operationCount >= 450) {
        await batch.commit();
        operationCount = 0;
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }
  }
}
