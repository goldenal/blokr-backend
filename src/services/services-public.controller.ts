import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { ServiceResponseDto } from './dto/service-response.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('services-public')
@Controller('public/professionals/:username/services')
export class ServicesPublicController {
  constructor(private readonly servicesService: ServicesService) {}

  @ApiOkResponse({ type: [ServiceResponseDto] })
  @Public()
  @Get()
  list(@Param('username') username: string) {
    return this.servicesService.listPublicByUsername(username);
  }
}
