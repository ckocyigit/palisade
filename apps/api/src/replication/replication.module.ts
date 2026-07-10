import { Module } from "@nestjs/common";
import { ReplicationService } from "./replication.service";
import { ReplicationController } from "./replication.controller";
import { ManagerSettingsModule } from "../manager-settings/manager-settings.module";

@Module({
  imports: [ManagerSettingsModule],
  controllers: [ReplicationController],
  providers: [ReplicationService],
  exports: [ReplicationService],
})
export class ReplicationModule {}
