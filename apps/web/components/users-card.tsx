"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { ROLES, type Role } from "@ark/shared";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

interface UserRow {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

const ROLE_HINTS: Record<Role, string> = {
  viewer: "Read-only: dashboards, players, logs.",
  operator: "Day-to-day ops: start/stop, console, backups, mods, schedules.",
  admin: "Everything, including settings, users, and deletes.",
};

/** Settings card: manage panel accounts and their roles. */
export function UsersCard() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("operator");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    apiGet<UserRow[]>("/users")
      .then(setUsers)
      .catch(() => undefined);
  };
  useEffect(load, []);

  const add = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await apiPost("/users", { username, password, role });
      setUsername("");
      setPassword("");
      load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: UserRow) => {
    if (!window.confirm(`Delete user "${u.username}"? Their tokens stop working immediately.`)) return;
    try {
      await apiDelete(`/users/${u.id}`);
      load();
    } catch (err) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div className="card space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ark-accent2">
        <Users className="h-4 w-4" /> Users
      </h2>
      <p className="text-xs text-slate-500">
        Give friends their own logins. Viewers can look, operators can run servers, admins can
        change anything. The API enforces roles server-side.
      </p>

      <ul className="space-y-1">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded border border-slate-700/60 px-3 py-2 text-sm">
            <span className="font-medium text-slate-200">{u.username}</span>
            <span className="rounded bg-slate-700/60 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-300">
              {u.role}
            </span>
            <button
              type="button"
              className="btn-secondary ml-auto"
              onClick={() => remove(u)}
              disabled={users.length <= 1}
              title={users.length <= 1 ? "The last user can't be deleted" : "Delete user"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-3">
        <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" className="input" placeholder="Password (8+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-500">{ROLE_HINTS[role]}</p>
      <button type="button" className="btn-secondary" onClick={add} disabled={busy || !username || password.length < 8}>
        <Plus className="h-4 w-4" /> Add user
      </button>
      {msg && <p className="text-sm text-amber-400">{msg}</p>}
    </div>
  );
}
