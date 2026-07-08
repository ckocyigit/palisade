import { Module } from "@nestjs/common";
import { PortForwardsController } from "./portforwards.controller";
import { PortForwardsService } from "./portforwards.service";

@Module({
  controllers: [PortForwardsController],
  providers: [PortForwardsService],
})
export class PortForwardsModule {}
