import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'admin' | 'teacher' | 'parent'>) =>
  SetMetadata(ROLES_KEY, roles);
