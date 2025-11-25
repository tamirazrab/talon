import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateTaskDto {
  @ApiProperty()
  @IsNumber()
  flowId: number;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  query: string;
}