"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useRealtime } from "@/lib/socket";

const MAX_LINES = 6000;

/** Full log of the current run, captured server-side — complete whether or not
 *  this tab was open, kept across refreshes/tab switches, wiped on the next Start. */
export function LogsTab({ serverId }: { serverId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const scrollToBottom = () =>
    requestAnimationFrame(() => {
      if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
    });

  const load = () => {
    setLoading(true);
    apiGet<{ log: string }>(`/servers/${serverId}/logs`)
      .then(({ log }) => {
        setLines(log ? log.split("\n") : []);
        scrollToBottom();
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };
  useEffect(load, [serverId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Append live lines; only auto-scroll when already at the bottom.
  useRealtime((msg) => {
    if (msg.serverId === serverId && msg.topic === "server.log") {
      setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), (msg.payload as { line: string }).line]);
      if (atBottom.current) scrollToBottom();
    }
  }, serverId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <ScrollText className="h-3.5 w-3.5" /> Full log of the current run — kept until the next Start.
        </span>
      </div>
      <div
        ref={boxRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="h-[32rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-ark-border bg-black/40 p-3 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 ? (
          <span className="text-slate-500">No log captured yet — start the server to capture this run.</span>
        ) : (
          lines.join("\n")
        )}
      </div>
    </div>
  );
}
