import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { ProfessionalResponseDto } from './professional-response.dto';
import { ServiceResponseDto } from '../../services/dto/service-response.dto';

/** Public-safe profile — no bank details, no Paystack subaccount code. */
export class PublicProfessionalResponseDto extends OmitType(
  ProfessionalResponseDto,
  ['paystackSubaccount', 'bankDetails'] as const,
) {
  @ApiPropertyOptional({ type: [ServiceResponseDto] })
  services?: ServiceResponseDto[];
}
