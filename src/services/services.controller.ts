import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('services')
@ApiBearerAuth()
@Roles(Role.PROFESSIONAL)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @ApiOkResponse({ type: [ServiceResponseDto] })
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.servicesService.listMine(user.id);
  }

  @ApiOkResponse({ type: ServiceResponseDto })
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(user.id, dto);
  }

  @ApiOkResponse({ type: ServiceResponseDto })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, user.id, dto);
  }

  @ApiOkResponse({ type: ServiceResponseDto })
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.servicesService.remove(id, user.id);
  }
}
