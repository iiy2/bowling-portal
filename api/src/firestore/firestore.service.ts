import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  Firestore,
  FieldValue,
  Timestamp,
  CollectionReference,
  DocumentReference,
  Query,
  WriteBatch,
  Transaction,
} from '@google-cloud/firestore';

@Injectable()
export class FirestoreService implements OnModuleInit {
  public db: Firestore;

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    this.db = admin.firestore();
  }

  // Collection references
  collection(name: string): CollectionReference {
    return this.db.collection(name);
  }

  doc(collection: string, id: string): DocumentReference {
    return this.db.collection(collection).doc(id);
  }

  // Helper methods
  serverTimestamp(): FieldValue {
    return FieldValue.serverTimestamp();
  }

  increment(value: number): FieldValue {
    return FieldValue.increment(value);
  }

  arrayUnion(...elements: unknown[]): FieldValue {
    return FieldValue.arrayUnion(...elements);
  }

  arrayRemove(...elements: unknown[]): FieldValue {
    return FieldValue.arrayRemove(...elements);
  }

  toTimestamp(date: Date | string): Timestamp {
    return Timestamp.fromDate(new Date(date));
  }

  fromTimestamp(timestamp: Timestamp | null): Date | null {
    if (!timestamp) return null;
    return timestamp.toDate();
  }

  generateId(): string {
    return this.db.collection('_').doc().id;
  }

  // Batch operations
  batch(): WriteBatch {
    return this.db.batch();
  }

  // Transaction support
  async runTransaction<T>(
    fn: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    return this.db.runTransaction(fn);
  }

  // Query helpers
  async getDocumentById<T>(
    collection: string,
    id: string,
  ): Promise<(T & { id: string }) | null> {
    const doc = await this.db.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as T & { id: string };
  }

  async queryCollection<T>(
    collection: string,
    queryFn?: (ref: CollectionReference) => Query,
  ): Promise<(T & { id: string })[]> {
    let query: Query | CollectionReference = this.db.collection(collection);
    if (queryFn) {
      query = queryFn(this.db.collection(collection));
    }
    const snapshot = await query.get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as T & { id: string },
    );
  }

  // Unique constraint helpers
  async checkUniqueConstraint(
    constraintType: string,
    value: string,
  ): Promise<boolean> {
    const doc = await this.db
      .collection('uniqueConstraints')
      .doc(constraintType)
      .collection('values')
      .doc(value.toLowerCase())
      .get();
    return !doc.exists;
  }

  async setUniqueConstraint(
    constraintType: string,
    value: string,
    documentId: string,
    transaction?: Transaction,
  ): Promise<void> {
    const ref = this.db
      .collection('uniqueConstraints')
      .doc(constraintType)
      .collection('values')
      .doc(value.toLowerCase());

    if (transaction) {
      transaction.set(ref, { documentId, createdAt: FieldValue.serverTimestamp() });
    } else {
      await ref.set({ documentId, createdAt: FieldValue.serverTimestamp() });
    }
  }

  async deleteUniqueConstraint(
    constraintType: string,
    value: string,
    transaction?: Transaction,
  ): Promise<void> {
    const ref = this.db
      .collection('uniqueConstraints')
      .doc(constraintType)
      .collection('values')
      .doc(value.toLowerCase());

    if (transaction) {
      transaction.delete(ref);
    } else {
      await ref.delete();
    }
  }

  // Pagination helper
  async paginateQuery<T>(
    query: Query,
    page: number,
    limit: number,
  ): Promise<{ data: (T & { id: string })[]; total: number }> {
    // Get total count
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Get paginated data
    const offset = (page - 1) * limit;
    const snapshot = await query.offset(offset).limit(limit).get();

    const data = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as T & { id: string },
    );

    return { data, total };
  }

  // Clean database for testing
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;

    const collections = [
      'users',
      'players',
      'seasons',
      'tournaments',
      'tournamentParticipations',
      'tournamentApplications',
      'playerStatistics',
      'notifications',
      'uniqueConstraints',
    ];

    const batch = this.db.batch();
    let operationCount = 0;

    for (const collectionName of collections) {
      const snapshot = await this.db.collection(collectionName).get();
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        operationCount++;

        // Firestore batch limit is 500
        if (operationCount >= 500) {
          await batch.commit();
          operationCount = 0;
        }
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }
  }
}
