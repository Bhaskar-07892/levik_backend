import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { TransactionService } from '../../../database/transaction.service.js';
import type { AuthTokensBo, TokenSubjectBo } from '../bo/auth.bo.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';

interface AuthSettings {
  accessTtlSeconds: number;
  refreshTtlDays: number;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Short-lived JWT access tokens + rotating opaque refresh tokens (stored hashed).
 * Presenting an already-rotated refresh token revokes every session of that subject (token theft).
 */
@Injectable()
export class TokenService {
  private readonly settings: AuthSettings;

  constructor(
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tx: TransactionService,
    config: ConfigService,
  ) {
    this.settings = config.getOrThrow<AuthSettings>('auth');
  }

  async issue(subject: TokenSubjectBo, userAgent?: string): Promise<AuthTokensBo> {
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenExpiresAt = new Date(Date.now() + this.settings.refreshTtlDays * 86_400_000);
    await this.refreshTokens.create({
      subjectId: subject.sub,
      role: subject.role,
      phone: subject.phone ?? null,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshTokenExpiresAt,
      userAgent: userAgent?.slice(0, 300) ?? null,
    });
    return {
      accessToken: await this.signAccess(subject),
      accessTokenExpiresIn: this.settings.accessTtlSeconds,
      refreshToken,
      refreshTokenExpiresAt,
      subject,
    };
  }

  /**
   * Rotates a refresh token. `resolve` re-checks the subject (still active? new role?) and may return a
   * different subject — e.g. a guest that has since registered becomes a plumber.
   */
  async rotate(
    refreshToken: string,
    resolve: (stored: TokenSubjectBo) => Promise<TokenSubjectBo>,
    userAgent?: string,
  ): Promise<AuthTokensBo> {
    const result = await this.tx.run(async (manager) => {
      const stored = await this.refreshTokens.findByHashForUpdate(sha256(refreshToken), manager);
      if (!stored) throw new UnauthorizedException('Invalid refresh token');
      // Revoke the family inside the transaction and return; throwing here would roll the revocation back.
      if (stored.revokedAt) {
        await this.refreshTokens.revokeAllForSubject(stored.subjectId, manager);
        return { reused: true as const };
      }
      if (stored.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Refresh token expired');
      await this.refreshTokens.revoke(stored.id, null, manager);
      return { reused: false as const, subject: { sub: stored.subjectId, role: stored.role, phone: stored.phone ?? undefined } };
    });
    if (result.reused) throw new UnauthorizedException('Refresh token reuse detected; all sessions were signed out');
    return this.issue(await resolve(result.subject), userAgent);
  }

  revoke(refreshToken: string): Promise<void> {
    return this.refreshTokens.revokeByHash(sha256(refreshToken));
  }

  revokeAll(subjectId: string): Promise<void> {
    return this.refreshTokens.revokeAllForSubject(subjectId);
  }

  private signAccess(subject: TokenSubjectBo): Promise<string> {
    return this.jwt.signAsync(
      { sub: subject.sub, role: subject.role, phone: subject.phone, name: subject.name, typ: 'access' },
      { expiresIn: this.settings.accessTtlSeconds },
    );
  }
}
