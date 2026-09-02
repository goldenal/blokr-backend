import { Body, Controller, Get, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { IntegrationsService } from './integrations.service';
import { UpdateWhatsAppDto } from './dto/update-whatsapp.dto';
import { IntegrationsStatusResponseDto } from './dto/integrations-status-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @ApiOkResponse({ type: IntegrationsStatusResponseDto })
  @ApiBearerAuth()
  @Roles(Role.PROFESSIONAL)
  @Get('status')
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.integrationsService.getStatus(user.id);
  }

  @ApiOkResponse({ schema: { properties: { url: { type: 'string' } } } })
  @ApiBearerAuth()
  @Roles(Role.PROFESSIONAL)
  @Get('google-calendar/connect')
  connectGoogle(@CurrentUser() user: AuthenticatedUser) {
    return this.integrationsService.getGoogleConnectUrl(user.id);
  }

  /** Google redirects here without a bearer token; identity is recovered from the signed `state`. */
  @Public()
  @Get('google-calendar/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.integrationsService.handleGoogleCallback(
      code,
      state,
    );
    res.redirect(redirectUrl);
  }

  @ApiOkResponse()
  @ApiBearerAuth()
  @Roles(Role.PROFESSIONAL)
  @Post('google-calendar/disconnect')
  disconnectGoogle(@CurrentUser() user: AuthenticatedUser) {
    return this.integrationsService
      .disconnectGoogle(user.id)
      .then(() => ({ success: true }));
  }

  @ApiOkResponse()
  @ApiBearerAuth()
  @Roles(Role.PROFESSIONAL)
  @Patch('whatsapp')
  updateWhatsApp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWhatsAppDto,
  ) {
    return this.integrationsService.updateWhatsApp(user.id, dto);
  }
}
