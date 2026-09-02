import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { UpsertAvailabilityRulesDto } from './dto/upsert-availability-rules.dto';
import { CreateOverrideDto } from './dto/create-override.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('availability')
@ApiBearerAuth()
@Roles(Role.PROFESSIONAL)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @ApiOkResponse()
  @Get('rules')
  getRules(@CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.getRules(user.id);
  }

  @ApiOkResponse()
  @Put('rules')
  upsertRules(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertAvailabilityRulesDto,
  ) {
    return this.availabilityService.upsertRules(user.id, dto);
  }

  @ApiOkResponse()
  @Get('overrides')
  listOverrides(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.availabilityService.listOverrides(user.id, from, to);
  }

  @ApiOkResponse()
  @Post('overrides')
  createOverride(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOverrideDto,
  ) {
    return this.availabilityService.createOverride(user.id, dto);
  }

  @ApiOkResponse()
  @Delete('overrides/:id')
  removeOverride(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.availabilityService.removeOverride(user.id, id);
  }
}
