import { describe, it, expect } from "vitest";
import { READY_RE } from "./servers.service";

// READY_RE flips a server to Running. POK logs a line that *quotes* the
// completion markers while it's still booting, which must NOT count as ready.
describe("READY_RE startup marker", () => {
  const REAL_ASA =
    "[2026.06.19-23.14.24:284][237]Server has completed startup and is now advertising for join. (10.19GB Mem)";
  const WAITING =
    "[INFO] Waiting for startup completion markers: 'Full Startup:' or 'Server has completed startup and is now advertising for join'";

  it("matches the real ASA completion line", () => {
    expect(READY_RE.test(REAL_ASA)).toBe(true);
  });

  it("does NOT match POK's 'Waiting for startup completion markers' line", () => {
    expect(READY_RE.test(WAITING)).toBe(false);
  });

  it("distinguishes a real 'Full Startup:' from the quoted marker", () => {
    expect(READY_RE.test("Full Startup: 45.2 seconds")).toBe(true);
    expect(READY_RE.test("...markers: 'Full Startup:' or ...")).toBe(false);
  });

  it("matches the hermsi/ASE 'server is up' line", () => {
    expect(READY_RE.test("[arkmanager] server is up")).toBe(true);
  });

  it("on a multi-line blob, is ready only once the real line appears", () => {
    expect(READY_RE.test(`${WAITING}\nLoading the map...`)).toBe(false);
    expect(READY_RE.test(`${WAITING}\nLoading the map...\n${REAL_ASA}`)).toBe(true);
  });
});
