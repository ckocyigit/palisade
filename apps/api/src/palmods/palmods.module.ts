import { Module } from "@nestjs/common";
import { PalModsController } from "./palmods.controller";
import { PalModsService } from "./palmods.service";

@Module({
  controllers: [PalModsController],
  providers: [PalModsService],
})
export class PalModsModule {}
