import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { nairaToKobo, koboToNaira } from '../common/constants/money';
import type { Service } from '@prisma/client';

type ServiceWithNaira = Omit<Service, 'priceKobo'> & { priceNaira: number };

const toResponse = (service: Service): ServiceWithNaira => {
  const { priceKobo, ...rest } = service;
  return { ...rest, priceNaira: koboToNaira(priceKobo) };
};

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  async listMine(userId: string) {
    const profile = await this.professionalsService.getMine(userId);
    const services = await this.prisma.service.findMany({
      where: { professionalId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
    return services.map(toResponse);
  }

  async create(userId: string, dto: CreateServiceDto) {
    const profile = await this.professionalsService.getMine(userId);
    const service = await this.prisma.service.create({
      data: {
        professionalId: profile.id,
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        priceKobo: nairaToKobo(dto.priceNaira),
        bufferMinutes: dto.bufferMinutes ?? 0,
        locationType: dto.locationType,
        meetingInstructions: dto.meetingInstructions,
        isActive: dto.isActive ?? true,
      },
    });
    return toResponse(service);
  }

  private async assertOwned(id: string, userId: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found.');
    }
    const profile = await this.professionalsService.getMine(userId);
    if (service.professionalId !== profile.id) {
      throw new ForbiddenException('You do not own this service.');
    }
    return service;
  }

  async update(id: string, userId: string, dto: UpdateServiceDto) {
    await this.assertOwned(id, userId);
    const { priceNaira, ...rest } = dto;
    const service = await this.prisma.service.update({
      where: { id },
      data: {
        ...rest,
        ...(priceNaira !== undefined
          ? { priceKobo: nairaToKobo(priceNaira) }
          : {}),
      },
    });
    return toResponse(service);
  }

  /** "Delete" soft-deactivates — existing bookings still reference this service. */
  async remove(id: string, userId: string) {
    await this.assertOwned(id, userId);
    const service = await this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
    return toResponse(service);
  }

  async listPublicByUsername(username: string) {
    const cleaned = username.replace(/^@/, '').toLowerCase();
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { username: cleaned },
    });
    if (!profile) {
      throw new NotFoundException('Professional not found.');
    }
    const services = await this.prisma.service.findMany({
      where: { professionalId: profile.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return services.map(toResponse);
  }
}
