-- CreateTable
CREATE TABLE "StreamCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "season" INTEGER,
    "episode" INTEGER,
    "m3u8Url" TEXT NOT NULL,
    "referer" TEXT NOT NULL,
    "cachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "StreamCache_tmdbId_mediaType_season_episode_key" ON "StreamCache"("tmdbId", "mediaType", "season", "episode");
