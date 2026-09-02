import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOkResponse({ type: HealthResponseDto })
  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        db: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        db: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
