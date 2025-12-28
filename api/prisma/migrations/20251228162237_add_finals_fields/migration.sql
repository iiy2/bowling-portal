-- AlterTable
ALTER TABLE "tournament_participations" ADD COLUMN     "finalsScores" JSONB;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "qualificationCompleted" BOOLEAN NOT NULL DEFAULT false;
