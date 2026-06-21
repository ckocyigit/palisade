import { describe, it, expect, beforeAll } from "vitest";
import { LocalPaths } from "./paths";

// Regression guard: ARK saves live under ShooterGame/Saved, not the instance root.
// Pointing backup/restore/import at the root silently finds nothing (ENOENT).
beforeAll(() => {
  // loadEnv() validates required secrets; vitest doesn't load .env (see game-cache).
  process.env.DATA_DIR ??= "/data";
  process.env.SECRETS_KEY ??= "a".repeat(64);
  process.env.JWT_SECRET ??= "test-jwt-secret-1234";
});

describe("LocalPaths.savedDir", () => {
  it("resolves to ShooterGame/Saved under the instance dir", () => {
    expect(LocalPaths.savedDir("s1")).toBe(`${LocalPaths.instanceRoot("s1")}/ShooterGame/Saved`);
    expect(LocalPaths.savedDir("s1")).toMatch(/\/instances\/s1\/ShooterGame\/Saved$/);
  });
});
