import type { Role } from '../../../common/interfaces/authenticated-user.interface.js';

export interface TokenSubjectBo {
  sub: string;
  role: Role;
  phone?: string;
  name?: string;
}

export interface AuthTokensBo {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  subject: TokenSubjectBo;
}
