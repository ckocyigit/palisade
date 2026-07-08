import { Controller, Get, Param, Post } from "@nestjs/common";
import { PortForwardsService } from "./portforwards.service";

@Controller("servers/:id/portforwards")
export class PortForwardsController {
  constructor(private readonly portforwards: PortForwardsService) {}

  /** Which of this server's player-facing forwards exist on the pfSense router. */
  @Get()
  status(@Param("id") id: string) {
    return this.portforwards.status(id);
  }

  /** Create the missing forwards (auto pass rules) and apply. */
  @Post()
  apply(@Param("id") id: string) {
    return this.portforwards.apply(id);
  }
}
