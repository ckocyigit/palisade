"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Check, X, Loader2, ArrowUpRight } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

interface ForwardStatus {
  port: number;
  proto: "udp" | "tcp";
  label: string;
  present: boolean;
}
interface View {
  configured: boolean;
  targetIp: string | null;
  forwards: ForwardStatus[];
}

/**
 * WAN port-forward status for this server's player-facing ports, with a one-click
 * "Forward ports" that creates the missing pfSense NAT rules (auto pass rules) and
 * applies them. Needs the pfSense host + API key + target IP in Settings.
 */
export function PortForwardsCard({ serverId }: { serverId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(() => {
    apiGet<View>(`/servers/${serverId}/portforwards`)
      .then(setView)
      .catch((e) => setErr((e as Error).message));
  }, [serverId]);
  useEffect(() => refresh(), [refresh]);

  const apply = async () => {
    setApplying(true);
    setErr(null);
    try {
      setView(await apiPost<View>(`/servers/${serverId}/portforwards`));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  if (!view) return null;
  const missing = view.forwards.filter((f) => !f.present).length;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-ark-accent" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ark-accent2">
            Port forwarding (pfSense)
          </h3>
        </div>
        {view.configured && missing > 0 && (
          <button className="btn-primary" onClick={apply} disabled={applying}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
            {applying ? "Applying…" : `Forward ${missing} port${missing === 1 ? "" : "s"}`}
          </button>
        )}
      </div>

      {!view.configured ? (
        <p className="text-xs text-slate-500">
          Set the pfSense host, API key, and target IP in{" "}
          <Link href="/settings" className="text-ark-accent hover:underline">
            Settings
          </Link>{" "}
          to check and create WAN forwards from here.
        </p>
      ) : (
        <>
          <ul className="space-y-1 text-sm">
            {view.forwards.map((f) => (
              <li key={`${f.port}/${f.proto}`} className="flex items-center gap-2">
                {f.present ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-ark-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                )}
                <span className="font-mono text-slate-200">
                  {f.port}/{f.proto}
                </span>
                <span className="text-xs text-slate-500">{f.label}</span>
                {!f.present && <span className="text-xs text-rose-400">not forwarded</span>}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500">
            WAN → {view.targetIp}. Admin ports (RCON/telnet) are deliberately never forwarded.
            {missing === 0 && " All player-facing ports are forwarded."}
          </p>
        </>
      )}
      {err && <p className="text-xs text-rose-400">{err}</p>}
    </div>
  );
}
