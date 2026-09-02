import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import { ProfessionalResponseDto } from './dto/professional-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('professionals')
@ApiBearerAuth()
@Roles(Role.PROFESSIONAL)
@Controller('professionals/me')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @ApiOkResponse({ type: ProfessionalResponseDto })
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProfessionalDto,
  ) {
    return this.professionalsService.create(user.id, dto);
  }

  @ApiOkResponse({ type: ProfessionalResponseDto })
  @Get()
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.professionalsService.getMine(user.id);
  }

  @ApiOkResponse({ type: ProfessionalResponseDto })
  @Patch()
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.updateMine(user.id, dto);
  }

  @ApiOkResponse({ type: ProfessionalResponseDto })
  @Patch('payout')
  updatePayout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePayoutDto,
  ) {
    return this.professionalsService.updatePayout(user.id, dto);
  }

  @ApiOkResponse({ schema: { properties: { available: { type: 'boolean' } } } })
  @Get('username-available')
  usernameAvailable(
    @CurrentUser() user: AuthenticatedUser,
    @Query('username') username: string,
  ) {
    return this.professionalsService.isUsernameAvailable(user.id, username);
  }
}
