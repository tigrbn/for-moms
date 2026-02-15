import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { getActiveProfileOrThrow } from "../common/active-profile";

@Controller("posts")
export class PostsController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: Request, @Body() body: { content?: string }) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content || content.length < 10) {
      return { ok: false, error: "Текст должен быть не короче 10 символов" };
    }
    const post = await this.prisma.feedPost.create({
      data: { profileId: active.id, content },
    });
    return { id: post.id.toString() };
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getOne(@Param("id") id: string) {
    const postId = BigInt(id);
    const post = await this.prisma.feedPost.findUnique({
      where: { id: postId },
      include: {
        profile: {
          include: {
            user: { select: { username: true, photoUrl: true } },
          },
        },
      },
    });
    if (!post) return null;
    const p = post.profile;
    const username = p.user?.username ?? null;
    return {
      id: post.id.toString(),
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      author: {
        displayName: p.displayName ?? "Пользователь",
        avatarUrl: p.avatarUrl ?? null,
        photoUrl: p.user?.photoUrl ?? null,
        contactPhone: p.showContactPhonePublicly ? p.contactPhone ?? null : null,
        username,
      },
    };
  }
}
