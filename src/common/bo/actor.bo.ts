import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

/** Who performed an action — recorded on ledger, audit and history rows. */
export interface ActorBo {
  id: string | null;
  name: string;
}

export const SYSTEM_ACTOR: ActorBo = { id: null, name: 'System' };

export function actorFrom(user: AuthenticatedUser): ActorBo {
  return { id: user.sub, name: user.name ?? user.sub };
}
