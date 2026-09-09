import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  username!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  customerName!: string;

  @ApiProperty()
  @IsEmail()
  customerEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  message!: string;
}
