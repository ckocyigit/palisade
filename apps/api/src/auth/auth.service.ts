import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import type { FirstRunDto, LoginDto } from "@ark/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ManagerSettingsService, SettingKeys } from "../manager-settings/manager-settings.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly settings: ManagerSettingsService,
  ) {}

  async status(): Promise<{ initialized: boolean }> {
    const count = await this.prisma.user.count();
    return { initialized: count > 0 && (await this.settings.isInitialized()) };
  }

  /** First-run wizard: create the single admin + persist paths/API keys. */
  async firstRun(dto: FirstRunDto): Promise<{ token: string }> {
    const existing = await this.prisma.user.count();
    if (existing > 0) throw new BadRequestException("Already initialized");
    if (!dto.username || dto.password.length < 8) {
      throw new BadRequestException("Username required and password must be 8+ chars");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { username: dto.username, passwordHash, role: "admin" },
    });

    if (dto.dataDir) await this.settings.set(SettingKeys.DataDir, dto.dataDir);
    if (dto.timezone) await this.settings.set(SettingKeys.Timezone, dto.timezone);
    if (dto.curseForgeApiKey)
      await this.settings.set(SettingKeys.CurseForgeApiKey, dto.curseForgeApiKey);
    if (dto.steamWebApiKey)
      await this.settings.set(SettingKeys.SteamWebApiKey, dto.steamWebApiKey);
    await this.settings.markInitialized();

    return { token: await this.sign(user) };
  }

  async login(dto: LoginDto): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return { token: await this.sign(user) };
  }

  /** Reject tokens whose `ver` claim no longer matches the user's tokenVersion. */
  async isTokenCurrent(sub: unknown, ver: unknown): Promise<boolean> {
    if (typeof sub !== "string" || typeof ver !== "number") return false;
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { tokenVersion: true },
    });
    return user !== null && user.tokenVersion === ver;
  }

  /** Invalidate every outstanding token for this user. */
  async logoutAll(userId: string): Promise<{ ok: true }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { ok: true };
  }

  private sign(user: { id: string; username: string; tokenVersion: number }): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, username: user.username, role: "admin", ver: user.tokenVersion },
      { expiresIn: "7d" },
    );
  }

  // ── User management (foundation for multi-user / RBAC) ─────────────────────
  listUsers() {
    return this.prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async createUser(username: string, password: string, role = "admin") {
    if (!username || password.length < 8) {
      throw new BadRequestException("Username required and password must be 8+ chars");
    }
    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) throw new BadRequestException("Username already taken");
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({ data: { username, passwordHash, role } });
    return { id: user.id, username: user.username, role: user.role };
  }

  async deleteUser(id: string) {
    const count = await this.prisma.user.count();
    if (count <= 1) throw new BadRequestException("Cannot delete the last user");
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
