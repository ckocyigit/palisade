"use client";
import { useEffect, useState } from "react";
import type { Role } from "@ark/shared";
import { getToken } from "./api";

/** Role from the stored JWT (display gating only — the API enforces for real).
 *  Legacy tokens without a role claim were single-admin installs. */
export function roleFromToken(): Role {
  const token = getToken();
  if (!token) return "viewer";
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { role?: Role };
    return payload.role ?? "admin";
  } catch {
    return "viewer";
  }
}

/** SSR-safe hook: renders as viewer until mounted, then the token's role. */
export function useRole(): Role {
  const [role, setRole] = useState<Role>("viewer");
  useEffect(() => setRole(roleFromToken()), []);
  return role;
}
