import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SevenDaysModsService } from "./sevendaysmods.service";

// 512 MB cap — 7DTD mods range from a few KB (config tweaks) to large asset packs.
const UPLOAD = { limits: { fileSize: 512 * 1024 * 1024 } };
type Upload = { originalname: string; buffer: Buffer };

@Controller("servers/:id/sevendaysmods")
export class SevenDaysModsController {
  constructor(private readonly sdtdmods: SevenDaysModsService) {}

  @Get()
  status(@Param("id") id: string) {
    return this.sdtdmods.status(id);
  }

  @Post("mods")
  @UseInterceptors(FileInterceptor("file", UPLOAD))
  addMod(@Param("id") id: string, @UploadedFile() file?: Upload) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.sdtdmods.addMod(id, file.originalname, file.buffer);
  }

  @Delete("mods/:name")
  removeMod(@Param("id") id: string, @Param("name") name: string) {
    return this.sdtdmods.removeMod(id, name);
  }
}
