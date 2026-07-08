import { Injectable, OnModuleInit } from "@nestjs/common";
import { LIVE_STATES } from "@ark/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DockerService } from "../docker/docker.service";
import { PlayersService } from "../players/players.service";

/** One 30-second sample of a live server. */
export interface HistorySample {
  at: string; // ISO timestamp
  cpuPercent: number | null;
  memUsedMb: number | null;
  playersOnline: number | null;
}

const SAMPLE_MS = 30_000;
const MAX_SAMPLES = 120; // 1 hour at 30 s

/**
 * In-memory resource/player history for live servers — enough to answer "was it
 * struggling before the crash" and "when do people actually play" with sparklines,
 * without a time-series DB. One ring buffer per server, sampled every 30 s while
 * the server is live; buffers survive stops (so a crashed server's tail is
 * visible) but not manager restarts.
 */
@Injectable()
export class HistoryService implements OnModuleInit {
  private readonly buffers = new Map<string, HistorySample[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly docker: DockerService,
    private readonly players: PlayersService,
  ) {}

  onModuleInit(): void {
    setInterval(() => void this.sample(), SAMPLE_MS).unref?.();
  }

  get(serverId: string): HistorySample[] {
    return this.buffers.get(serverId) ?? [];
  }

  private async sample(): Promise<void> {
    const live = await this.prisma.server
      .findMany({ where: { state: { in: LIVE_STATES } } })
      .catch(() => []);
    for (const s of live) {
      const stats = s.containerId ? await this.docker.stats(s.containerId).catch(() => null) : null;
      const players = await this.players.count(s.id).catch(() => null);
      const buf = this.buffers.get(s.id) ?? [];
      buf.push({
        at: new Date().toISOString(),
        cpuPercent: stats?.cpuPercent ?? null,
        memUsedMb: stats?.memUsedMb ?? null,
        playersOnline: players?.online ?? null,
      });
      if (buf.length > MAX_SAMPLES) buf.splice(0, buf.length - MAX_SAMPLES);
      this.buffers.set(s.id, buf);
    }
  }
}
