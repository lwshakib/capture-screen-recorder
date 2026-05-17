-- AlterTable
ALTER TABLE "user" ADD COLUMN     "defaultPrivacy" TEXT NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'system';
