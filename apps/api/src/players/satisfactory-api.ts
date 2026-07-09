import { request } from "node:https";

/**
 * Minimal client for Satisfactory's Dedicated Server HTTPS API (v1) — the game's
 * only management surface (there is no RCON). It serves on the GAME port over TLS
 * with a self-signed cert, so verification is disabled (same LAN-trust model as
 * the pfSense client). Docs: the game ships them in
 * CommunityResources/DedicatedServerAPIDocs.md.
 *
 * Auth model: an UNCLAIMED server grants an InitialAdmin token via
 * PasswordlessLogin, which ClaimServer upgrades to a real admin session (setting
 * the server name + admin password). A CLAIMED server grants Client tokens
 * passwordlessly only while no client password is set; otherwise PasswordLogin
 * with the admin password works for everything.
 */

interface ApiEnvelope<T> {
  data?: T;
  errorCode?: string;
  errorMessage?: string;
}

function call<T>(
  host: string,
  port: number,
  fn: string,
  data: Record<string, unknown> = {},
  token?: string,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ function: fn, data });
    const req = request(
      {
        host,
        port,
        path: "/api/v1",
        method: "POST",
        rejectUnauthorized: false, // self-signed by design
        timeout: timeoutMs,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          // 204 = success with no body (e.g. SetClientPassword).
          if (!text) return resolve(undefined as T);
          try {
            const json = JSON.parse(text) as ApiEnvelope<T>;
            if (json.errorCode) return reject(new Error(`${fn}: ${json.errorCode} ${json.errorMessage ?? ""}`));
            resolve(json.data as T);
          } catch {
            reject(new Error(`${fn}: unparseable response (${res.statusCode})`));
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`${fn}: timeout`)));
    req.end(body);
  });
}

async function login(host: string, port: number, privilege: string, password?: string): Promise<string> {
  const fn = password ? "PasswordLogin" : "PasswordlessLogin";
  const data: Record<string, unknown> = { MinimumPrivilegeLevel: privilege };
  if (password) data.Password = password;
  const res = await call<{ authenticationToken: string }>(host, port, fn, data);
  if (!res?.authenticationToken) throw new Error(`${fn}: no token`);
  return res.authenticationToken;
}

export interface SatisfactoryState {
  online: number;
  max: number;
  claimed: boolean;
}

/**
 * The live server state (player count + slot cap). Tries a passwordless Client
 * token first (works on a claimed server with no join password); falls back to
 * an admin PasswordLogin when a join password blocks passwordless access.
 */
export async function satisfactoryQueryState(
  host: string,
  port: number,
  adminPassword?: string | null,
): Promise<SatisfactoryState | null> {
  let token: string;
  try {
    token = await login(host, port, "Client");
  } catch {
    if (!adminPassword) return null;
    token = await login(host, port, "Administrator", adminPassword);
  }
  const res = await call<{
    serverGameState?: { numConnectedPlayers?: number; playerLimit?: number };
  }>(host, port, "QueryServerState", {}, token);
  const gs = res?.serverGameState;
  if (!gs || gs.numConnectedPlayers === undefined) return null;
  return { online: gs.numConnectedPlayers, max: gs.playerLimit ?? 0, claimed: true };
}

/**
 * Claim a freshly-installed server (sets its name + admin password) and set the
 * optional join password — the step players otherwise do by hand in-game.
 * Returns "claimed" when this call did the claim, "already" when the server had
 * been claimed before (the InitialAdmin login is refused then).
 */
export async function satisfactoryClaim(
  host: string,
  port: number,
  serverName: string,
  adminPassword: string,
  clientPassword?: string | null,
): Promise<"claimed" | "already"> {
  let initial: string;
  try {
    initial = await login(host, port, "InitialAdmin");
  } catch {
    return "already"; // claimed servers refuse InitialAdmin passwordless login
  }
  const res = await call<{ authenticationToken?: string }>(
    host,
    port,
    "ClaimServer",
    { ServerName: serverName, AdminPassword: adminPassword },
    initial,
  );
  const admin = res?.authenticationToken;
  if (clientPassword && admin) {
    await call(host, port, "SetClientPassword", { Password: clientPassword }, admin).catch(() => undefined);
  }
  return "claimed";
}
