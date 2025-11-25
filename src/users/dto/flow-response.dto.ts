import { ApiProperty } from '@nestjs/swagger';
export class FlowResponseDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  status: string;
  @ApiProperty()
  modelProvider: string;
  @ApiProperty()
  model: string;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
  @ApiProperty({ required: false })
  container?: {
    id: number;
    name: string;
    image: string;
    status: string;
  };
}