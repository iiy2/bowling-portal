import { Global, Module } from '@nestjs/common';
import { FirestoreService } from './firestore.service';
import { CascadeService } from './cascade.service';

@Global()
@Module({
  providers: [FirestoreService, CascadeService],
  exports: [FirestoreService, CascadeService],
})
export class FirestoreModule {}
