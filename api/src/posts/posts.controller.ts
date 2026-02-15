import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { getActiveProfileOrThrow } from "../common/active-profile";

@Controller("posts")
export class PostsController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get("mine")
  async mine(@Req() req: Request) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    const posts = await this.prisma.feedPost.findMany({
      where: { profileId: active.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return posts.map((p) => {
      const images = Array.isArray(p.images) ? (p.images as string[]) : typeof p.images === "string" ? [p.images] : [];
      return {
        id: p.id.toString(),
        content: p.content,
        images,
        createdAt: p.createdAt.toISOString(),
      };
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: Request, @Body() body: { content?: string; imageUrls?: string[] }) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content || content.length < 10) {
      return { ok: false, error: "Текст должен быть не короче 10 символов" };
    }
    const imageUrls = Array.isArray(body?.imageUrls)
      ? body.imageUrls.filter((u): u is string => typeof u === "string" && u.length > 0).slice(0, 10)
      : [];
    const post = await this.prisma.feedPost.create({
      data: { profileId: active.id, content, images: imageUrls.length > 0 ? imageUrls : undefined },
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
    const images = Array.isArray(post.images)
      ? (post.images as string[])
      : typeof post.images === "string"
        ? [post.images]
        : [];
    return {
      id: post.id.toString(),
      content: post.content,
      images,
      createdAt: post.createdAt.toISOString(),
      authorProfileId: post.profileId.toString(),
      author: {
        displayName: p.displayName ?? "Пользователь",
        avatarUrl: p.avatarUrl ?? null,
        photoUrl: p.user?.photoUrl ?? null,
        contactPhone: p.showContactPhonePublicly ? p.contactPhone ?? null : null,
        username,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async delete(@Req() req: Request, @Param("id") id: string) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const active = await getActiveProfileOrThrow(this.prisma, userId);
    const postId = BigInt(id);
    const post = await this.prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Объявление не найдено");
    if (post.profileId !== active.id) throw new ForbiddenException("Можно удалить только своё объявление");
    await this.prisma.feedPost.delete({ where: { id: postId } });
    return { ok: true };
  }
}
