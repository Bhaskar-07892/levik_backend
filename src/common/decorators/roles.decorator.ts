import { SetMetadata } from '@nestjs/common';
import type { Role } from '../interfaces/authenticated-user.interface.js';

export const ROLES_KEY = 'roles';
/** Restricts a route or controller to the given roles. Guests are only allowed when listed explicitly. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
