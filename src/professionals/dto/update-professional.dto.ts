import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';
import { CreateProfessionalDto } from './create-professional.dto';

/** username changes go through a dedicated flow in a future pass; not editable via PATCH. */
export class UpdateProfessionalDto extends PartialType(
  OmitType(CreateProfessionalDto, ['username'] as const),
) {
  @ApiPropertyOptional()
  declare name?: string;
}
