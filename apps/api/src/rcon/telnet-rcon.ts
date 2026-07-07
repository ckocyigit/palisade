import { EventEmitter } from "events";
import { Socket, connect as netConnect } from "net";

export interface TelnetRconOptions {
  host: string;
  port: number;
  password: string;
  /** Hard cap for a single command's reply (ms). */
  timeout?: number;
  /** Resolve a reply this long after the last byte arrives (ms). */
  idle?: number;
}

/**
 * A line-based telnet client for the 7 Days to Die remote console (port 8081).
 *
 * 7DTD has no Source RCON — its "RCON" is a telnet console: connect, answer the
 * "Please enter password:" prompt, then send newline-terminated commands and read
 * newline-terminated output. Telnet isn't request/response framed (the server also
 * streams live log lines to every client), so — like SourceRcon — we serialise
 * commands and resolve each one by draining whatever arrives until the stream goes
 * quiet (idle) or a hard timeout fires. Exposes the same surface RconService relies
 * on: on(), connect(), send(), end().
 */
export class TelnetRcon {
  private readonly emitter = new EventEmitter();
  private socket: Socket | null = null;
  private authenticated = false;
  private passwordSent = false;
  private authBuffer = "";
  private authResolver: ((err?: Error) => void) | null = null;
  // The single in-flight command awaiting a reply (sends are serialized).
  private pending: {
    chunks: string[];
    resolve: (out: string) => void;
    reject: (err: Error) => void;
    hard: NodeJS.Timeout;
    idle: NodeJS.Timeout | null;
  } | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  private readonly timeout: number;
  private readonly idleMs: number;

  constructor(private readonly opts: TelnetRconOptions) {
    this.timeout = opts.timeout ?? 10_000;
    this.idleMs = opts.idle ?? 400;
  }

  on(event: "error" | "end", listener: (...args: unknown[]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  async connect(): Promise<this> {
    if (this.socket) throw new Error("Already connected");
    const socket = (this.socket = netConnect({ host: this.opts.host, port: this.opts.port }));
    socket.setNoDelay(true);
    socket.setEncoding("utf8");

    await new Promise<void>((resolve, reject) => {
      const onErr = (e: Error) => reject(e);
      socket.once("error", onErr);
      socket.once("connect", () => {
        socket.off("error", onErr);
        resolve();
      });
    });

    socket.on("error", (err) => this.emitter.emit("error", err));
    socket.on("close", () => {
      this.failPending(new Error("Connection closed"));
      this.authenticated = false;
      this.socket = null;
      this.emitter.emit("end");
    });
    socket.on("data", (d: string) => this.onData(d));

    await this.authenticate();
    return this;
  }

  private authenticate(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.authResolver = null;
        reject(new Error("Telnet auth timeout"));
      }, this.timeout);
      this.authResolver = (err?: Error) => {
        clearTimeout(timer);
        this.authResolver = null;
        if (err) reject(err);
        else resolve();
      };
    });
  }

  private onData(chunk: string): void {
    if (!this.authenticated) {
      this.authBuffer += chunk;
      const lower = this.authBuffer.toLowerCase();
      if (!this.passwordSent && lower.includes("enter password")) {
        this.passwordSent = true;
        this.socket?.write(`${this.opts.password}\n`);
      }
      if (lower.includes("logon successful")) {
        this.authenticated = true;
        this.authBuffer = "";
        this.authResolver?.();
        return;
      }
      if (lower.includes("password incorrect") || lower.includes("invalid password")) {
        this.authResolver?.(new Error("Telnet authentication failed"));
      }
      return;
    }
    const p = this.pending;
    if (!p) return; // live log line with nothing waiting — ignored (console shows live logs separately)
    p.chunks.push(chunk);
    if (p.idle) clearTimeout(p.idle);
    p.idle = setTimeout(() => {
      clearTimeout(p.hard);
      this.pending = null;
      p.resolve(p.chunks.join("").trim());
    }, this.idleMs);
  }

  async send(command: string): Promise<string> {
    const run = this.queue.then(() => this.sendOne(command));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private sendOne(command: string): Promise<string> {
    if (!this.socket || !this.authenticated) return Promise.reject(new Error("Not connected"));
    return new Promise<string>((resolve, reject) => {
      const hard = setTimeout(() => {
        this.pending = null;
        reject(new Error("Telnet timeout"));
      }, this.timeout);
      this.pending = { chunks: [], resolve, reject, hard, idle: null };
      this.socket!.write(`${command}\n`);
    });
  }

  private failPending(err: Error): void {
    const p = this.pending;
    if (!p) return;
    clearTimeout(p.hard);
    if (p.idle) clearTimeout(p.idle);
    this.pending = null;
    p.reject(err);
  }

  async end(): Promise<void> {
    const socket = this.socket;
    if (!socket) return;
    // Ask the console to close cleanly, then end the socket.
    socket.write("exit\n");
    await new Promise<void>((resolve) => {
      socket.once("close", () => resolve());
      socket.end();
    });
  }
}
