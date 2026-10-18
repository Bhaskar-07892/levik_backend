import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { UserRole } from '../../../common/domain/enums.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import { normalizeIndianMobile } from '../../../common/utils/mobile.util.js';
import { AdminsRepository } from '../../admins/repositories/admins.repository.js';
import { AuditService } from '../../audit/services/audit.service.js';
import type { ParticipantBo } from '../../participants/bo/participant.bo.js';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository.js';
import type { AuthTokensBo, TokenSubjectBo } from '../bo/auth.bo.js';
import { OtpService } from './otp.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

// Verified against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==';

@Injectable()
export class AuthService {
  constructor(
    private readonly admins: AdminsRepository,
    private readonly participants: ParticipantsRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async adminLogin(email: string, password: string, userAgent?: string): Promise<AuthTokensBo> {
    const admin = await this.admins.findByEmailWithPassword(email);
    const valid = await this.passwords.verify(password, admin?.passwordHash ?? DUMMY_HASH);
    if (!admin || !valid || !admin.isActive) {
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, 'Invalid email or password.');
    }
    await this.admins.touchLastLogin(admin.id);
    await this.audit.record({ id: admin.id, name: admin.name }, { action: 'Admin signed in', entityType: 'Session', entityId: admin.id, summary: admin.email });
    return this.tokens.issue({ sub: admin.id, role: 'admin', name: admin.name }, userAgent);
  }

  requestOtp(phone: string): Promise<{ expiresIn: number }> {
    return this.otp.request(this.mobile(phone).digits);
  }

  /** Verifies the OTP and signs the user in as their plumber/retailer account, or as a guest to register. */
  async verifyOtp(phone: string, code: string, preferredRole: UserRole | undefined, userAgent?: string): Promise<AuthTokensBo> {
    const mobile = this.mobile(phone);
    await this.otp.verify(mobile.digits, code);
    const subject = await this.subjectForPhone(mobile.digits, mobile.display, preferredRole);
    if (subject.role === 'plumber' || subject.role === 'retailer') await this.touchParticipantLogin(subject.sub, subject.role);
    return this.tokens.issue(subject, userAgent);
  }

  /** Called right after registration so the app swaps its guest token for a participant token. */
  issueForParticipant(participant: ParticipantBo, phoneDigits: string, userAgent?: string): Promise<AuthTokensBo> {
    return this.tokens.issue({ sub: participant.id, role: participant.role, phone: phoneDigits, name: participant.name }, userAgent);
  }

  refresh(refreshToken: string, userAgent?: string): Promise<AuthTokensBo> {
    return this.tokens.rotate(
      refreshToken,
      async (stored) => {
        if (stored.role === 'admin') {
          const admin = await this.admins.findById(stored.sub);
          if (!admin?.isActive) throw new UnauthorizedException('Account disabled');
          return { sub: admin.id, role: 'admin', name: admin.name };
        }
        if (!stored.phone) throw new UnauthorizedException('Invalid session');
        const mobile = this.mobile(stored.phone);
        const preferred = stored.role === 'plumber' || stored.role === 'retailer' ? stored.role : undefined;
        return this.subjectForPhone(mobile.digits, mobile.display, preferred);
      },
      userAgent,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  private async subjectForPhone(digits: string, display: string, preferredRole?: UserRole): Promise<TokenSubjectBo> {
    const matches = await this.participants.findByMobile(display);
    const chosen = matches.length > 1 ? matches.find((m) => m.role === preferredRole) : matches[0];
    if (matches.length > 1 && !chosen) {
      throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'This number is registered as both a plumber and a retailer. Choose a role.', {
        roles: matches.map((m) => m.role),
      });
    }
    if (!chosen) return { sub: `guest:${digits}`, role: 'guest', phone: digits };
    return { sub: chosen.id, role: chosen.role, phone: digits, name: chosen.name };
  }

  private async touchParticipantLogin(id: string, role: UserRole): Promise<void> {
    await this.dataSource.query(`update ${role === 'plumber' ? 'plumbers' : 'retailers'} set last_login_at = now() where id = $1`, [id]);
  }

  private mobile(phone: string) {
    const mobile = normalizeIndianMobile(phone);
    if (!mobile) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Enter a valid Indian mobile number.');
    return mobile;
  }
}

