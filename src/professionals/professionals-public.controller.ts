import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { PublicProfessionalResponseDto } from './dto/public-professional-response.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('professionals-public')
@Controller('public/professionals')
export class ProfessionalsPublicController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @ApiOkResponse({ type: PublicProfessionalResponseDto })
  @Public()
  @Get(':username')
  getByUsername(@Param('username') username: string) {
    return this.professionalsService.getPublicByUsername(username);
  }
}
