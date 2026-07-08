import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { request as httpsRequest } from "node:https";
import { Game, DEFAULT_PORTS } from "@ark/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ManagerSettingsService, SettingKeys } from "../manager-settings/manager-settings.service";
import { forwardSpec, type ForwardPort } from "../catalog/ports";

export interface ForwardStatus extends ForwardPort {
  /** An enabled WAN rule for this port/proto → target already exists. */
  present: boolean;
}

export interface PortForwardsView {
  /** pfSense host + API key + target IP are all configured. */
  configured: boolean;
  targetIp: string | null;
  forwards: ForwardStatus[];
}

/** The slice of a pfSense NAT rule we read. */
interface NatRule {
  interface?: string;
  protocol?: string;
  destination_port?: string;
  target?: string;
  disabled?: boolean;
}

/**
 * One-click WAN port-forwards via the pfSense REST API (the jaredhendrickson13
 * package, /api/v2). The manager knows exactly which player-facing ports each game
 * needs (forwardSpec), so it can report which forwards exist and create the missing
 * ones — the chore we used to do by hand per game. Rules are created with
 * associated_rule_id "pass" (auto firewall rule) and applied immediately. pfSense
 * boxes run self-signed certs, so TLS verification is disabled for this client.
 */
@Injectable()
export class PortForwardsService {
  private readonly logger = new Logger(PortForwardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: ManagerSettingsService,
  ) {}

  private async config(): Promise<{ host: string; apiKey: string; targetIp: string } | null> {
    const [host, apiKey, targetIp] = await Promise.all([
      this.settings.get(SettingKeys.PfsenseHost),
      this.settings.get(SettingKeys.PfsenseApiKey),
      this.settings.get(SettingKeys.PfsenseTargetIp),
    ]);
    if (!host || !apiKey || !targetIp) return null;
    return { host, apiKey, targetIp };
  }

  /** Minimal JSON request against the pfSense REST API (self-signed cert tolerated). */
  private api<T>(
    cfg: { host: string; apiKey: string },
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? null : JSON.stringify(body);
      const req = httpsRequest(
        {
          host: cfg.host,
          path: `/api/v2${path}`,
          method,
          rejectUnauthorized: false, // pfSense self-signed cert
          timeout: 15_000,
          headers: {
            "X-API-Key": cfg.apiKey,
            ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (d) => (data += d));
          res.on("end", () => {
            if ((res.statusCode ?? 500) >= 400) {
              return reject(new Error(`pfSense ${res.statusCode}: ${data.slice(0, 200)}`));
            }
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              resolve(undefined as T);
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => req.destroy(new Error("pfSense request timeout")));
      if (payload) req.write(payload);
      req.end();
    });
  }

  private async server(id: string) {
    const s = await this.prisma.server.findUnique({ where: { id } });
    if (!s) throw new NotFoundException("Server not found");
    return s;
  }

  /** Which of this server's player-facing forwards already exist on the router. */
  async status(id: string): Promise<PortForwardsView> {
    const s = await this.server(id);
    const spec = forwardSpec(s.game as Game, {
      game: s.gamePort,
      rawSocket: s.rawSocketPort,
      query: s.queryPort,
      rcon: s.rconPort,
    } as typeof DEFAULT_PORTS);
    const cfg = await this.config();
    if (!cfg) {
      return { configured: false, targetIp: null, forwards: spec.map((f) => ({ ...f, present: false })) };
    }
    const res = await this.api<{ data?: NatRule[] }>(cfg, "GET", "/firewall/nat/port_forwards?limit=0");
    const rules = res.data ?? [];
    const present = (f: ForwardPort) =>
      rules.some(
        (r) =>
          !r.disabled &&
          (r.interface ?? "wan") === "wan" &&
          (r.protocol ?? "").toLowerCase() === f.proto &&
          String(r.destination_port ?? "") === String(f.port) &&
          r.target === cfg.targetIp,
      );
    return { configured: true, targetIp: cfg.targetIp, forwards: spec.map((f) => ({ ...f, present: present(f) })) };
  }

  /** Create every missing forward (with an auto pass rule), then apply. */
  async apply(id: string): Promise<PortForwardsView> {
    const cfg = await this.config();
    if (!cfg) {
      throw new BadRequestException("Configure the pfSense host, API key, and target IP in Settings first.");
    }
    const s = await this.server(id);
    const before = await this.status(id);
    const missing = before.forwards.filter((f) => !f.present);
    for (const f of missing) {
      await this.api(cfg, "POST", "/firewall/nat/port_forward", {
        interface: "wan",
        ipprotocol: "inet",
        protocol: f.proto,
        source: "any",
        destination: "wan:ip",
        destination_port: String(f.port),
        target: cfg.targetIp,
        local_port: String(f.port),
        descr: `ASM ${s.name} — ${f.label}`,
        associated_rule_id: "pass",
        disabled: false,
      });
      this.logger.log(`pfSense forward created: ${f.port}/${f.proto} → ${cfg.targetIp} (${s.name})`);
    }
    if (missing.length > 0) {
      // Apply twice — the reliable pattern against this API (matches how the
      // manually-created rules were applied).
      await this.api(cfg, "POST", "/firewall/apply", {});
      await this.api(cfg, "POST", "/firewall/apply", {});
    }
    return this.status(id);
  }
}
