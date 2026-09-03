import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'The authorization code returned by Google OAuth popup' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
