import { Game } from "@ark/shared";
import { loadEnv } from "../config/env";

/**
 * Container-side mount targets the game images expect. Both images install the
 * game files themselves into their own volume (POK → /home/pok/arkserver via
 * POK_DATA_DIR, hermsi → /app via HERMSI_VOLUME), so the only shared targets
 * here are the cross-server cluster dirs.
 */
export const ContainerPaths = {
  // Shared cross-server cluster dir mount targets — a path outside each image's
  // per-instance volume so it isn't swallowed by it. All members of a cluster
  // mount the same host dir here and ARK is pointed at it via -ClusterDirOverride.
  pokCluster: "/home/pok/clustershared", // ASA (POK), sibling of /home/pok/arkserver
  hermsiCluster: "/clustershared", // ASE (hermsi), outside /app
} as const;

function hostDataDir(): string {
  const env = loadEnv();
  return env.HOST_DATA_DIR ?? env.DATA_DIR;
}

/**
 * Paths as seen by the **manager process itself** (DATA_DIR), used for direct
 * filesystem work — rendering INIs, reflink-cloning game files. These differ
 * from HostPaths (which are resolved by the Docker daemon for bind mounts);
 * on Unraid the manager sees e.g. /data while the daemon sees /mnt/cache/....
 */
export const LocalPaths = {
  instanceRoot(serverId: string): string {
    return `${loadEnv().DATA_DIR}/instances/${serverId}`;
  },
  /**
   * The ARK world save dir inside an instance — the world, configs, player
   * profiles, and tribes. BOTH POK/ASA and hermsi/ASE store saves under
   * `ShooterGame/Saved`, NOT the instance root. Backup, restore, and import all
   * operate on this; pointing them at the root finds nothing (ENOENT).
   */
  savedDir(serverId: string): string {
    return `${this.instanceRoot(serverId)}/ShooterGame/Saved`;
  },
  /** Warmed golden copy of a game's files, reflink-cloned into each instance. */
  gameCache(game: Game): string {
    return `${loadEnv().DATA_DIR}/cache/${game.toLowerCase()}`;
  },
  /** Shared cluster transfer dir (manager view), mounted into each member. */
  cluster(clusterId: string): string {
    return `${loadEnv().DATA_DIR}/clusters/${clusterId}`;
  },
};

export const HostPaths = {
  instanceRoot(serverId: string): string {
    return `${hostDataDir()}/instances/${serverId}`;
  },
  cluster(clusterId: string): string {
    return `${hostDataDir()}/clusters/${clusterId}`;
  },
  backups(serverId: string): string {
    return `${hostDataDir()}/backups/${serverId}`;
  },
};
