import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { ROLES, type Role } from "@ark/shared";
import { AuthService } from "./auth.service";
import { MinRole } from "./min-role.decorator";

class CreateUserBody {
  @IsString() username!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsIn(ROLES) role?: Role;
}

@MinRole("admin")
@Controller("users")
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  list() {
    return this.auth.listUsers();
  }

  @Post()
  create(@Body() body: CreateUserBody) {
    return this.auth.createUser(body.username, body.password, body.role);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.auth.deleteUser(id);
  }
}
