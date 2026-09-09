import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('inquiries')
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(dto);
  }

  @ApiBearerAuth()
  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.inquiriesService.listMine(user.id);
  }
}
