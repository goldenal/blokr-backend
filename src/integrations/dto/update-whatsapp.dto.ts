import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateWhatsAppDto {
  @ApiProperty()
  @IsBoolean()
  remindersEnabled!: boolean;
}
