import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthenticatedUser, Role } from '../interfaces/authenticated-user.interface.js';

/**
 * Global guard. Routes without @Roles() are open to any registered user (admin/plumber/retailer)
 * but never to guests, who may only call routes that list 'guest' explicitly (registration).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    const user = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user;
    const allowed = required ?? (['admin', 'plumber', 'retailer'] as Role[]);
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        user.role === 'guest' ? 'Complete registration to use this feature' : 'You do not have access to this resource',
      );
    }
    return true;
  }
}
