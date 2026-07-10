import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Per-client throttle for the credential endpoints. Browser traffic reaches
 * the API through the Next server's rewrite proxy, so req.ip would collapse
 * every user into one bucket — prefer the first x-forwarded-for hop.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const fwd = req.headers?.["x-forwarded-for"];
    const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0]?.trim();
    return first || req.ips?.[0] || req.ip;
  }
}
