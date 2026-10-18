import type { AuthTokensBo } from './bo/auth.bo.js';
import type { AuthTokensResponseDto } from './dto/auth.response.dto.js';

export const AuthMapper = {
  tokensToDto: (b: AuthTokensBo): AuthTokensResponseDto => ({
    accessToken: b.accessToken,
    accessTokenExpiresIn: b.accessTokenExpiresIn,
    refreshToken: b.refreshToken,
    refreshTokenExpiresAt: b.refreshTokenExpiresAt.toISOString(),
    user: { id: b.subject.sub, role: b.subject.role, name: b.subject.name, phone: b.subject.phone },
  }),
};
