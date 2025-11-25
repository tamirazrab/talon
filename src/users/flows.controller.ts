import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FlowsService } from './flows.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { FlowResponseDto } from './dto/flow-response.dto';
@ApiTags('flows')
@Controller('api/flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}
  @Get()
  @ApiOperation({ summary: 'Get all flows' })
  @ApiResponse({ status: 200, type: [FlowResponseDto] })
  async findAll(): Promise<FlowResponseDto[]> {
    return this.flowsService.findAll();
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get flow by ID' })
  @ApiResponse({ status: 200, type: FlowResponseDto })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<FlowResponseDto> {
    return this.flowsService.findOne(id);
  }
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new flow' })
  @ApiResponse({ status: 201, type: FlowResponseDto })
  async create(@Body() dto: CreateFlowDto): Promise<FlowResponseDto> {
    return this.flowsService.create(dto);
  }
  @Put(':id/finish')
  @ApiOperation({ summary: 'Finish a flow' })
  @ApiResponse({ status: 200, type: FlowResponseDto })
  async finish(@Param('id', ParseIntPipe) id: number): Promise<FlowResponseDto> {
    return this.flowsService.finish(id);
  }
  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get all tasks for a flow' })
  async getTasks(@Param('id', ParseIntPipe) id: number) {
    return this.flowsService.getTasks(id);
  }
}