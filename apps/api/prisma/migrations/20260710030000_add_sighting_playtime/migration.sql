-- Playtime analytics: minutes counted by the 60s player-list poll, plus a
-- 24-slot UTC hour-of-day histogram (JSON int array) for peak-hours heatmaps.
ALTER TABLE "PlayerSighting" ADD COLUMN "minutesPlayed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerSighting" ADD COLUMN "hourCountsJson" TEXT NOT NULL DEFAULT '[]';
