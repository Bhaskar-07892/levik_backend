import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

interface AppSettings {
  apiPrefix: string;
  corsOrigins: string[];
  isProduction: boolean;
}

/** Shared by main.ts and the e2e tests so both run the exact same HTTP pipeline. */
export function setupApp(app: INestApplication): void {
  const settings = app.get(ConfigService).getOrThrow<AppSettings>('app');
  (app as NestExpressApplication).set('trust proxy', 1);
  app.use(helmet());
  app.enableCors({
    origin: settings.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
    maxAge: 600,
  });
  app.setGlobalPrefix(settings.apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );
  app.enableShutdownHooks();

  if (!settings.isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Levik Rewards API')
      .setDescription('Admin portal (/admin/*), plumber & retailer app (/app/*), auth and public label verification.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${settings.apiPrefix}/docs`, app, SwaggerModule.createDocument(app, config), {
      jsonDocumentUrl: `${settings.apiPrefix}/docs/openapi.json`,
    });
  }
}
