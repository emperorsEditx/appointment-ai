import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigin: string =
    process.env.CORS_ORIGIN ??
    process.env.NEXT_PUBLIC_API_URL ??
    'https://appointment-ai-taupe.vercel.app';
  const corsEnv: string = corsOrigin;
  const allowedOrigins: string[] = corsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as string[];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // allow non-browser requests like curl/postman (no origin)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // don't throw an error here (causes 500 on preflight). Deny CORS silently and log.
      console.warn(`CORS origin denied: ${origin}`);
      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

void bootstrap();
