import { SetMetadata } from "@nestjs/common";
import type { Role } from "@ark/shared";

export const MIN_ROLE_KEY = "minRole";

/**
 * Minimum role required for a route (or a whole controller). Without an
 * explicit MinRole, RolesGuard applies the default policy: GET needs viewer,
 * anything mutating needs operator.
 */
export const MinRole = (role: Role) => SetMetadata(MIN_ROLE_KEY, role);
