import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminsModule } from '../admins/admins.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { OtpChallengeRepository } from './repositories/otp-challenge.repository.js';
import { RefreshTokenRepository } from './repositories/refresh-token.repository.js';
import { AuthService } from './services/auth.service.js';
import { OtpService } from './services/otp.service.js';
import { PasswordService } from './services/password.service.js';
import { TokenService } from './services/token.service.js';
import { ConsoleSmsProvider } from './sms/console-sms.provider.js';
import { Msg91SmsProvider } from './sms/msg91-sms.provider.js';
import { SMS_PROVIDER } from './sms/sms-provider.interface.js';

interface JwtSettings {
  accessSecret: string;
  issuer: string;
  audience: string;
  smsProvider: 'console' | 'msg91';
  msg91AuthKey?: string;
  msg91TemplateId?: string;
}

/** Global so the JWT guard (APP_GUARD) and registration flows can use JwtService/AuthService. */
@Global()
@Module({
  imports: [
    AdminsModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const auth = config.getOrThrow<JwtSettings>('auth');
        return {
          secret: auth.accessSecret,
          signOptions: { issuer: auth.issuer, audience: auth.audience, algorithm: 'HS256' },
          verifyOptions: { issuer: auth.issuer, audience: auth.audience, algorithms: ['HS256'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    PasswordService,
    TokenService,
    OtpService,
    AuthService,
    RefreshTokenRepository,
    OtpChallengeRepository,
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const auth = config.getOrThrow<JwtSettings>('auth');
        return auth.smsProvider === 'msg91'
          ? new Msg91SmsProvider(auth.msg91AuthKey ?? '', auth.msg91TemplateId ?? '')
          : new ConsoleSmsProvider();
      },
    },
  ],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}
