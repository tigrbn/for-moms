import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Без глобального префикса: nginx часто проксирует с proxy_pass .../ так, что путь приходит без /api
  app.enableCors({ origin: true });
  // Раздача загрузок: бэкенд отдаёт по /uploads/...; фронт запрашивает API_BASE + /uploads/... = /api/uploads/...
  // Если nginx сбрасывает /api, то на бэкенд приходит /uploads/... — раздаём по этому пути
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads/" });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
