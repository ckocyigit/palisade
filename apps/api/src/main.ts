import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";
import { ensureSecrets } from "./config/ensure-secrets";
import { ensureHostDataDir } from "./config/ensure-host-data-dir";
import { installProcessSafetyNet } from "./common/process-safety";

async function bootstrap() {
  // Guard against a single background error (a socket reset, a stray rejection)
  // taking the whole manager down — must be active before anything else runs.
  installProcessSafetyNet();
  // Auto-generate + persist SECRETS_KEY/JWT_SECRET if the user didn't supply them,
  // so a blank install boots instead of failing loadEnv's required-secret check.
  ensureSecrets();
  // Auto-detect HOST_DATA_DIR from our own /data mount if unset (best-effort). Both
  // run BEFORE loadEnv, which caches the environment.
  await ensureHostDataDir();
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  // The API serves JSON, not pages — CSP would only constrain error responses,
  // and HSTS breaks plain-HTTP LAN setups, so both stay off.
  app.use(helmet({ contentSecurityPolicy: false, strictTransportSecurity: false }));
  // Browsers reach the API same-origin via the Next rewrite proxy, so
  // cross-origin is denied unless origins are explicitly allowed via CORS_ORIGINS.
  app.enableCors({
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
    credentials: true,
  });

  await app.listen(env.API_PORT, "0.0.0.0");
  new Logger("Bootstrap").log(
    `Palisade API listening on :${env.API_PORT} (${env.NODE_ENV})`,
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal boot error:", err);
  process.exit(1);
});
