import { Injectable, NotFoundException } from '@nestjs/common';
import { FlowRepository } from '../../database/repositories/flow.repository';
import { TaskRepository } from '../../database/repositories/task.repository';
import { CreateFlowDto } from './dto/create-flow.dto';
import { FlowResponseDto } from './dto/flow-response.dto';
import { QueueService } from '../../executor/queue/queue.service';
@Injectable()
export class FlowsService {
  constructor(
    private readonly flowRepo: FlowRepository,
    private readonly taskRepo: TaskRepository,
    private readonly queueService: QueueService,
  ) {}
  async create(dto: CreateFlowDto): Promise<FlowResponseDto> {
    // Create flow
    const flow = await this.flowRepo.create(dto.modelProvider, dto.modelId);
    // Initialize queue for this flow
    await this.queueService.addQueue(flow.id);
    return this.mapToDto(flow);
  }
  async findAll(): Promise<FlowResponseDto[]> {
    const flows = await this.flowRepo.findAll();
    return flows.map(flow => this.mapToDto(flow));
  }
  async findOne(id: number): Promise<FlowResponseDto> {
    const flow = await this.flowRepo.findById(id);
    
    if (!flow) {
      throw new NotFoundException(`Flow with ID ${id} not found`);
    }
    return this.mapToDto(flow);
  }
  async finish(id: number): Promise<FlowResponseDto> {
    const flow = await this.flowRepo.updateStatus(id, 'finished');
    
    // Clean up queue
    await this.queueService.cleanQueue(id);
    return this.mapToDto(flow);
  }
  async getTasks(id: number) {
    return this.taskRepo.findByFlowId(id);
  }
  private mapToDto(flow: any): FlowResponseDto {
    return {
      id: flow.id,
      name: flow.name,
      status: flow.status,
      modelProvider: flow.modelProvider,
      model: flow.model,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
      container: flow.container ? {
        id: flow.container.id,
        name: flow.container.name,
        image: flow.container.image,
        status: flow.container.status,
      } : undefined,
    };
  }
}