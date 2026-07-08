import { Module } from "@nestjs/common";
import { DbBackupService } from "./dbbackup.service";

@Module({
  providers: [DbBackupService],
})
export class DbBackupModule {}
