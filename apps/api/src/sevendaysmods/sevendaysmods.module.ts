import { Module } from "@nestjs/common";
import { SevenDaysModsController } from "./sevendaysmods.controller";
import { SevenDaysModsService } from "./sevendaysmods.service";

@Module({
  controllers: [SevenDaysModsController],
  providers: [SevenDaysModsService],
})
export class SevenDaysModsModule {}
