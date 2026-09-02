import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'PROFESSIONAL' | 'CUSTOMER';
};

type RequestWithUser = { user: AuthenticatedUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
