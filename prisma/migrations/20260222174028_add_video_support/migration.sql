-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'image';
