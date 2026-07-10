-- Bumped to invalidate every outstanding JWT for a user (logout-all).
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
