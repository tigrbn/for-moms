import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from './auth/auth.module';
import { MeModule } from "./me/me.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { RequestsModule } from "./requests/requests.module";
import { OffersModule } from "./offers/offers.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { BannersModule } from "./banners/banners.module";
import { FeedModule } from "./feed/feed.module";
import { UploadModule } from "./upload/upload.module";
import { TelegramModule } from "./telegram/telegram.module";
import { ContactModule } from "./contact/contact.module";
import { PostsModule } from "./posts/posts.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    MeModule,
    ProfilesModule,
    RequestsModule,
    OffersModule,
    ReviewsModule,
    BannersModule,
    FeedModule,
    UploadModule,
    TelegramModule,
    ContactModule,
    PostsModule,
  ],
})
export class AppModule {}
