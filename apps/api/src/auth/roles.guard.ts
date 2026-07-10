import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLE_RANK, type Role } from "@ark/shared";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { MIN_ROLE_KEY } from "./min-role.decorator";

interface RequestLike {
  method: string;
  user?: { role?: string };
}

/**
 * Role enforcement, layered after JwtAuthGuard (which populated req.user).
 * Explicit @MinRole on the handler/controller wins; otherwise reads are open
 * to every authenticated role and mutations require operator. Legacy tokens
 * without a role claim count as admin (single-admin installs predate roles).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<RequestLike>();
    const role = (req.user?.role as Role) ?? "admin";
    const required =
      this.reflector.getAllAndOverride<Role | undefined>(MIN_ROLE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? (req.method === "GET" ? "viewer" : "operator");

    if ((ROLE_RANK[role] ?? 0) < ROLE_RANK[required]) {
      throw new ForbiddenException(`Requires the ${required} role`);
    }
    return true;
  }
}
