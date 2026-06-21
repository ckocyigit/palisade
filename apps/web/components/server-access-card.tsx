"use client";
import { useState } from "react";
import { KeyRound, Save, Check } from "lucide-react";
import { ServerState, type ServerSummary } from "@ark/shared";
import { apiPatch } from "@/lib/api";

/** Set / change / remove a server's join + admin passwords. Works for every game
 *  (the API stores them encrypted and delivers them to the container on start). */
export function ServerAccessCard({
  server,
  onSaved,
}: {
  server: ServerSummary;
  onSaved: () => void;
}) {
  const [serverPw, setServerPw] = useState(server.joinPassword ?? "");
  const [adminPw, setAdminPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const joinChanged = serverPw !== (server.joinPassword ?? "");
  const adminChanged = adminPw.length > 0;
  const dirty = joinChanged || adminChanged;
  const live = server.state === ServerState.Running || server.state === ServerState.Starting;

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      const body: Record<string, string> = {};
      if (joinChanged) body.serverPassword = serverPw; // "" removes it
      if (adminChanged) body.adminPassword = adminPw;
      await apiPatch(`/servers/${server.id}`, body);
      setAdminPw("");
      setSaved(true);
      onSaved();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-ark-accent" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ark-accent2">
          Access &amp; passwords
        </h3>
      </div>

      <div>
        <label className="label">Server password (players need it to join)</label>
        <input
          className="input font-mono"
          placeholder="Open server — anyone can join"
          value={serverPw}
          onChange={(e) => {
            setServerPw(e.target.value);
            setSaved(false);
          }}
        />
        <p className="mt-1 text-xs text-slate-500">
          {server.joinPassword
            ? "Players enter this at the in-game “Password Required” prompt. Clear the box to remove it."
            : "Leave blank for an open server."}
        </p>
      </div>

      <div>
        <label className="label">Admin password (enables RCON)</label>
        <input
          className="input font-mono"
          placeholder={server.hasAdminPassword ? "•••••••• set — leave blank to keep" : "Not set"}
          value={adminPw}
          onChange={(e) => {
            setAdminPw(e.target.value);
            setSaved(false);
          }}
        />
        <p className="mt-1 text-xs text-slate-500">For RCON + in-game admin. Never shown after saving.</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={busy || !dirty}>
          {busy ? (
            "Saving…"
          ) : saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save
            </>
          )}
        </button>
        {live && dirty && <span className="text-xs text-amber-400">Restart the server to apply.</span>}
      </div>
    </div>
  );
}
