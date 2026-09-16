import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'sales.ops@fmcg-stms.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123', description: 'User account password' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
