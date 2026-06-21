import { Global, Module } from "@nestjs/common";
import { LogCaptureService } from "./log-capture.service";

@Global()
@Module({
  providers: [LogCaptureService],
  exports: [LogCaptureService],
})
export class LogCaptureModule {}
