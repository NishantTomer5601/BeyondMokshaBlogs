/*
  Warnings:

  - You are about to drop the column `authorId` on the `blogs` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `blogs` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `blogs` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `blogs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "blogs_slug_idx";

-- DropIndex
DROP INDEX "blogs_slug_key";

-- DropIndex
DROP INDEX "blogs_status_idx";

-- AlterTable
ALTER TABLE "blogs" DROP COLUMN "authorId",
DROP COLUMN "slug",
DROP COLUMN "status",
DROP COLUMN "summary",
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[];
