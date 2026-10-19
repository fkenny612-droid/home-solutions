import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * For public routes that behave a little differently for a signed-in caller (e.g. hide people they blocked).
 * A missing or invalid token is not an error — req.user is simply undefined.
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) { return super.canActivate(context) }
  handleRequest<T>(_err: unknown, user: T): T | undefined { return user || undefined }
}
