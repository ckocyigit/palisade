import { Module } from "@nestjs/common";
import { PortForwardsController, PfsenseController } from "./portforwards.controller";
import { PortForwardsService } from "./portforwards.service";

@Module({
  controllers: [PortForwardsController, PfsenseController],
  providers: [PortForwardsService],
})
export class PortForwardsModule {}
