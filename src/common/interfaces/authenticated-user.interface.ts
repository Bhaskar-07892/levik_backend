export const ROLES = ['admin', 'plumber', 'retailer', 'guest'] as const;
export type Role = (typeof ROLES)[number];
export type ParticipantRole = 'plumber' | 'retailer';

/** Identity attached to every authenticated request (decoded from the access token). */
export interface AuthenticatedUser {
  /** Admin UUID, plumber ID (PLM-…), retailer ID (RTL-…), or the phone digits for a guest. */
  sub: string;
  role: Role;
  /** E.164 digits without "+", present for phone-authenticated users. */
  phone?: string;
  /** Display name at sign-in time (recorded on audit entries). */
  name?: string;
}
