import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateFlowDto {
  @ApiProperty({ example: 'openai', description: 'AI model provider (openai or ollama)' })
  @IsString()
  @IsNotEmpty()
  modelProvider: string;
  @ApiProperty({ example: 'gpt-4', description: 'Model identifier' })
  @IsString()
  @IsNotEmpty()
  modelId: string;
}