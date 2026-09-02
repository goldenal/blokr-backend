import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  AuthResponseDto,
  MeResponseDto,
  TokenPairDto,
} from './dto/auth-response.dto';
import { SuccessResponseDto } from '../common/dto/success-response.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({
    description: 'An account with this email already exists.',
    type: ErrorResponseDto,
  })
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password.',
    type: ErrorResponseDto,
  })
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid, expired, or has been revoked.',
    type: ErrorResponseDto,
  })
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiBearerAuth()
  @Post('logout')
  logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: RefreshTokenDto) {
    return this.authService
      .logout(user.id, dto.refreshToken)
      .then(() => ({ success: true }));
  }

  @ApiOkResponse({ type: MeResponseDto })
  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }
}
