import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("session")
  async session(@Body() body: { initData: string; platform?: "telegram" | "max" }) {
    return this.auth.createSession(body.initData, body.platform ?? "telegram");
  }
}
