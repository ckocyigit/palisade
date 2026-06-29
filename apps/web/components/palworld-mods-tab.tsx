"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Package, ShieldCheck, Loader2, Save } from "lucide-react";
import { apiGet, apiPatch, apiDelete, apiUpload } from "@/lib/api";

type PalModStatus = {
  paks: string[];
  framework: { enabled: boolean; preload: string; present: boolean };
};

/**
 * Palworld mod management (it's not on Steam Workshop): upload .pak content mods
 * into the bind-mounted Pal/Content/Paks/~mods, and toggle a server-side framework
 * (UE4SS/PalDefender) that's dropped into Pal/Binaries/Linux and loaded via
 * LD_PRELOAD on start. Both take effect on the next restart.
 */
export function PalworldModsTab({ serverId }: { serverId: string }) {
  const [status, setStatus] = useState<PalModStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preload, setPreload] = useState("");
  const pakInput = useRef<HTMLInputElement>(null);
  const fwInput = useRef<HTMLInputElement>(null);

  const apply = (s: PalModStatus) => {
    setStatus(s);
    setPreload(s.framework.preload);
  };
  useEffect(() => {
    apiGet<PalModStatus>(`/servers/${serverId}/palmods`).then(apply).catch((e) => setErr(e.message));
  }, [serverId]);

  const run = async (fn: () => Promise<PalModStatus>) => {
    setBusy(true);
    setErr(null);
    try {
      apply(await fn());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fw = status?.framework;

  return (
    <div className="space-y-4">
      {err && <div className="card border-rose-500/40 text-sm text-rose-300">{err}</div>}

      {/* ── Pak content mods ────────────────────────────────────────────── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ark-accent2">
            <Package className="h-4 w-4" /> Pak mods
          </h3>
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() => pakInput.current?.click()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload .pak
          </button>
          <input
            ref={pakInput}
            type="file"
            accept=".pak,.ucas,.utoc,.zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) run(() => apiUpload(`/servers/${serverId}/palmods/paks`, f));
              e.target.value = "";
            }}
          />
        </div>
        {status && status.paks.length > 0 ? (
          <ul className="divide-y divide-ark-border/50 text-sm">
            {status.paks.map((p) => (
              <li key={p} className="flex items-center justify-between gap-3 py-1.5">
                <span className="truncate font-mono text-slate-200">{p}</span>
                <button
                  className="shrink-0 text-slate-500 hover:text-rose-400"
                  title="Remove"
                  disabled={busy}
                  onClick={() => run(() => apiDelete(`/servers/${serverId}/palmods/paks/${encodeURIComponent(p)}`))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">
            No pak mods yet. Upload <span className="font-mono">.pak</span> /{" "}
            <span className="font-mono">.ucas</span> / <span className="font-mono">.utoc</span> files (or a{" "}
            <span className="font-mono">.zip</span> of them) — they go into{" "}
            <span className="font-mono">Pal/Content/Paks/~mods</span>.
          </p>
        )}
        <p className="text-[11px] text-slate-500">Restart the server to load mod changes.</p>
      </div>

      {/* ── Server mod framework (UE4SS / PalDefender) ──────────────────── */}
      <div className="card space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ark-accent2">
          <ShieldCheck className="h-4 w-4" /> Server mod framework (UE4SS / PalDefender)
        </h3>

        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(fw?.enabled)}
            disabled={busy}
            onChange={(e) => run(() => apiPatch(`/servers/${serverId}/palmods/framework`, { enabled: e.target.checked }))}
          />
          Enable framework (loaded via <span className="font-mono">LD_PRELOAD</span> on start)
        </label>

        <div className="flex items-center gap-2 text-xs">
          <span className={fw?.present ? "text-ark-accent" : "text-amber-400"}>
            {fw?.present ? "● framework installed" : "○ framework not installed"}
          </span>
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() => fwInput.current?.click()}
          >
            <Upload className="h-4 w-4" /> Upload framework .zip
          </button>
          <input
            ref={fwInput}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) run(() => apiUpload(`/servers/${serverId}/palmods/framework/upload`, f));
              e.target.value = "";
            }}
          />
        </div>

        <div>
          <label className="label">Preload library (relative to the install dir)</label>
          <div className="flex gap-2">
            <input
              className="input font-mono"
              value={preload}
              onChange={(e) => setPreload(e.target.value)}
              placeholder="Pal/Binaries/Linux/libUE4SS.so"
            />
            <button
              className="btn-secondary"
              disabled={busy || preload === fw?.preload}
              onClick={() => run(() => apiPatch(`/servers/${serverId}/palmods/framework`, { preload }))}
            >
              <Save className="h-4 w-4" /> Save
            </button>
          </div>
        </div>

        <p className="text-[11px] leading-snug text-slate-500">
          This server runs the <span className="text-slate-300">native Linux</span> Palworld binary, so the
          framework must be a Linux build; its files are extracted into{" "}
          <span className="font-mono">Pal/Binaries/Linux</span> and injected via{" "}
          <span className="font-mono">LD_PRELOAD</span>. Restart the server to apply.
        </p>
      </div>
    </div>
  );
}
