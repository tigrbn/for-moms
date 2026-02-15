import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { Request } from "express";
import { ContactService, ContactDto } from "./contact.service";
import { PrismaService } from "../prisma/prisma.service";

@Controller("contact")
export class ContactController {
  constructor(
    private readonly contact: ContactService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async submit(@Req() req: Request, @Body() body: ContactDto) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const category = body?.category === "order" ? "order" : "bug";
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return { ok: true };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, firstName: true, username: true },
    });

    await this.contact.sendToDeveloper(
      {
        category,
        message,
        contactEmail:
          typeof body?.contactEmail === "string"
            ? body.contactEmail.trim()
            : undefined,
        contactPhone:
          typeof body?.contactPhone === "string"
            ? body.contactPhone.trim()
            : undefined,
      },
      {
        telegramId: user?.telegramId?.toString(),
        firstName: user?.firstName ?? undefined,
        username: user?.username ?? undefined,
      },
    );

    return { ok: true };
  }
}
