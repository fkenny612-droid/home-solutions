import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'

/** Run after AuthGuard('jwt') — rejects any caller whose JWT role isn't 'admin'. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    if (req.user?.role !== 'admin') throw new ForbiddenException('Admin access only')
    return true
  }
}
