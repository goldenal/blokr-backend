import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { ComputedSlotDto } from './dto/computed-slot.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('availability-public')
@Controller('public/professionals/:username/services/:serviceId/slots')
export class AvailabilityPublicController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOkResponse({ type: [ComputedSlotDto] })
  @Public()
  @Get()
  async getSlots(
    @Param('username') username: string,
    @Param('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { username: username.replace(/^@/, '').toLowerCase() },
    });
    if (!profile) {
      throw new NotFoundException('Professional not found.');
    }
    return this.availabilityService.computeAvailableSlots(
      profile.id,
      serviceId,
      date,
    );
  }
}
