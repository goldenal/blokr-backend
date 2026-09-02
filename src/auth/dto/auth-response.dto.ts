import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ enum: Role })
  role!: Role;
}

export class TokenPairDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

export class AuthResponseDto extends TokenPairDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class MeResponseDto extends UserResponseDto {
  @ApiProperty({ nullable: true, type: String, format: 'uuid' })
  professionalProfileId!: string | null;
}
