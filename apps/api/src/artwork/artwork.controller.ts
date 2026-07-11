import { Controller, Get, Post } from "@nestjs/common";
import { ArtworkService } from "./artwork.service";
import { MinRole } from "../auth/min-role.decorator";

@Controller("artwork")
export class ArtworkController {
  constructor(private readonly artwork: ArtworkService) {}

  /** Per-game art URL map for the web UI (any role — it's decoration). */
  @Get()
  all() {
    return this.artwork.getAll();
  }

  /** Force a full fetch (used by the settings "fetch artwork" button). */
  @MinRole("admin")
  @Post("refresh")
  refresh() {
    return this.artwork.refresh();
  }
}
