import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { configurations } from './config/configuration.js';
import { envValidationSchema } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { AdminsModule } from './modules/admins/admins.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ExploreModule } from './modules/explore/explore.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { InvoicesModule } from './modules/invoices/invoices.module.js';
import { LabelsModule } from './modules/labels/labels.module.js';
import { ParticipantsModule } from './modules/participants/participants.module.js';
import { PlumbersModule } from './modules/plumbers/plumbers.module.js';
import { PointsModule } from './modules/points/points.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { RedemptionsModule } from './modules/redemptions/redemptions.module.js';
import { RetailersModule } from './modules/retailers/retailers.module.js';
import { RewardsModule } from './modules/rewards/rewards.module.js';
import { ScansModule } from './modules/scans/scans.module.js';
import { SchemesModule } from './modules/schemes/schemes.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { SupportModule } from './modules/support/support.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: configurations,
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : process.env.NODE_ENV === 'test' ? 'silent' : 'debug',
        genReqId: (req, res) => {
          const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.refreshToken', 'req.body.code'],
        transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
        autoLogging: { ignore: (req) => req.url?.includes('/health/') ?? false },
      },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    ScheduleModule.forRoot(),

    // Infrastructure (global)
    DatabaseModule,
    AuditModule,
    SettingsModule,
    ParticipantsModule,
    UploadsModule,
    AuthModule,

    // Features
    AdminsModule,
    PointsModule,
    ProductsModule,
    LabelsModule,
    PlumbersModule,
    RetailersModule,
    SchemesModule,
    InvoicesModule,
    ScansModule,
    RewardsModule,
    RedemptionsModule,
    InventoryModule,
    ExploreModule,
    SupportModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
