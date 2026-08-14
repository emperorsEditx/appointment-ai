import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    ...(process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : []),
  ].filter((v): v is string => Boolean(v));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
      // Allow requests without an Origin header (Postman, curl, server-to-server, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Only check includes when origin is a string
      if (typeof origin === 'string' && allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      console.warn(`CORS origin denied: ${origin}`);
      callback(null, false);
      return;
    },

    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization'],

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
