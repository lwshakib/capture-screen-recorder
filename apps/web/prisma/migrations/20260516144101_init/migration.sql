/*
  Warnings:

  - You are about to drop the column `chapters` on the `video` table. All the data in the column will be lost.
  - You are about to drop the column `chapters_url` on the `video` table. All the data in the column will be lost.
  - You are about to drop the column `cloudinaryPublicId` on the `video` table. All the data in the column will be lost.
  - You are about to drop the column `m3u8Url` on the `video` table. All the data in the column will be lost.
  - You are about to drop the column `subtitles_url` on the `video` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `video` table. All the data in the column will be lost.
  - You are about to drop the column `transcript` on the `video` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `video` table. All the data in the column will be lost.
  - Added the required column `path` to the `video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "video" DROP COLUMN "chapters",
DROP COLUMN "chapters_url",
DROP COLUMN "cloudinaryPublicId",
DROP COLUMN "m3u8Url",
DROP COLUMN "subtitles_url",
DROP COLUMN "thumbnail",
DROP COLUMN "transcript",
DROP COLUMN "url",
ADD COLUMN     "path" TEXT NOT NULL;
