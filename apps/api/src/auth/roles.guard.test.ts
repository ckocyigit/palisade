import { describe, it, expect } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";

// Policy matrix: explicit @MinRole wins; otherwise GET=viewer, mutation=operator.
// Legacy tokens without a role claim count as admin (predate multi-user).
function makeContext(opts: { method: string; role?: string; minRole?: string; isPublic?: boolean }) {
  const reflector = {
    getAllAndOverride: (key: string) =>
      key === "isPublic" ? (opts.isPublic ?? false) : key === "minRole" ? opts.minRole : undefined,
  };
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ method: opts.method, user: opts.role ? { role: opts.role } : {} }),
    }),
  };
  return { guard: new RolesGuard(reflector as never), context: context as never };
}

const allows = (opts: Parameters<typeof makeContext>[0]) => {
  const { guard, context } = makeContext(opts);
  try {
    return guard.canActivate(context);
  } catch (err) {
    if (err instanceof ForbiddenException) return false;
    throw err;
  }
};

describe("RolesGuard", () => {
  it("viewer: reads yes, mutations no", () => {
    expect(allows({ method: "GET", role: "viewer" })).toBe(true);
    expect(allows({ method: "POST", role: "viewer" })).toBe(false);
    expect(allows({ method: "DELETE", role: "viewer" })).toBe(false);
  });

  it("operator: mutations yes, admin-marked routes no", () => {
    expect(allows({ method: "POST", role: "operator" })).toBe(true);
    expect(allows({ method: "POST", role: "operator", minRole: "admin" })).toBe(false);
    expect(allows({ method: "GET", role: "operator", minRole: "admin" })).toBe(false);
  });

  it("admin passes everything; explicit MinRole('viewer') opens mutations to all", () => {
    expect(allows({ method: "DELETE", role: "admin", minRole: "admin" })).toBe(true);
    expect(allows({ method: "POST", role: "viewer", minRole: "viewer" })).toBe(true);
  });

  it("legacy tokens without a role act as admin; @Public bypasses entirely", () => {
    expect(allows({ method: "DELETE" })).toBe(true);
    expect(allows({ method: "POST", role: "viewer", minRole: "admin", isPublic: true })).toBe(true);
  });
});
