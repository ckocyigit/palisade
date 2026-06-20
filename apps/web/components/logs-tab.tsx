"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useRealtime } from "@/lib/socket";

/** Live tail of the server's container log: the last N lines, plus new lines as
 *  they arrive over realtime while the server is running. */
export function LogsTab({ serverId }: { serverId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [tail, setTail] = useState(50);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const scrollToBottom = () =>
    requestAnimationFrame(() => {
      if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
    });

  const load = (n: number) => {
    setLoading(true);
    apiGet<{ log: string }>(`/servers/${serverId}/logs?tail=${n}`)
      .then(({ log }) => {
        setLines(log.split("\n").filter((l) => l.length > 0));
        scrollToBottom();
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => load(tail), [serverId, tail]); // eslint-disable-line react-hooks/exhaustive-deps

  // Append new lines live; only auto-scroll when the user is already at the bottom.
  useRealtime((msg) => {
    if (msg.serverId === serverId && msg.topic === "server.log") {
      setLines((prev) => [...prev.slice(-2000), (msg.payload as { line: string }).line]);
      if (atBottom.current) scrollToBottom();
    }
  }, serverId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={() => load(tail)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
        <select className="input w-auto" value={tail} onChange={(e) => setTail(Number(e.target.value))}>
          {[20, 50, 100, 200, 500].map((n) => (
            <option key={n} value={n}>
              Last {n} lines
            </option>
          ))}
        </select>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <ScrollText className="h-3.5 w-3.5" /> Live while the server is running.
        </span>
      </div>
      <div
        ref={boxRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-ark-border bg-black/40 p-3 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 ? (
          <span className="text-slate-500">
            No log output yet — the server may be stopped, or nothing has been logged.
          </span>
        ) : (
          lines.map((l, i) => <div key={i}>{l}</div>)
        )}
      </div>
    </div>
  );
}
