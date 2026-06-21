import { describe, it, expect } from "vitest";
import { includeInBackup } from "./backups.service";

// A backup keeps the live world + config + players/tribes, and drops ARK's own
// rolling dated dupes (.ark/.arkrbf), its anti-corruption .bak, and Logs/Cache —
// which is what shrinks a snapshot from ~1.3 GB to ~the live world.
describe("includeInBackup", () => {
  it("keeps the live world, config, and player/tribe data", () => {
    expect(includeInBackup("SavedArks/TheIsland_WP/TheIsland_WP.ark")).toBe(true);
    expect(includeInBackup("Config/WindowsServer/Game.ini")).toBe(true);
    expect(includeInBackup("Config/WindowsServer/GameUserSettings.ini")).toBe(true);
    expect(includeInBackup("SavedArks/TheIsland_WP/0002e9f9.arkprofile")).toBe(true);
    expect(includeInBackup("SavedArks/TheIsland_WP/MyTribe.arktribe")).toBe(true);
  });

  it("drops ARK's dated rolling backups (.ark + .arkrbf)", () => {
    expect(includeInBackup("SavedArks/TheIsland_WP/TheIsland_WP_18.06.2026_03.15.06.ark")).toBe(false);
    expect(includeInBackup("SavedArks/TheIsland_WP/TheIsland_WP_21.06.2026_02.49.58.arkrbf")).toBe(false);
  });

  it("drops the anti-corruption .bak and Logs/Cache dirs", () => {
    expect(includeInBackup("SavedArks/TheIsland_WP/TheIsland_WP_AntiCorruptionBackup.bak")).toBe(false);
    expect(includeInBackup("Logs/ShooterGame.log")).toBe(false);
    expect(includeInBackup("Cache/anything/at/all")).toBe(false);
  });
});
