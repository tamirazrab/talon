import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
@Injectable()
export class TaskRepository {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
  ) {}
  async create(params: {
    type: string;
    status: string;
    args: Record<string, any>;
    results: Record<string, any>;
    flowId: number;
    message: string;
    toolCallId?: string;
  }): Promise<Task> {
    const task = this.repo.create(params);
    return this.repo.save(task);
  }
  async findByFlowId(flowId: number): Promise<Task[]> {
    return this.repo.find({
      where: { flowId },
      order: { createdAt: 'ASC' },
    });
  }
  async updateResults(id: number, results: Record<string, any>): Promise<Task> {
    await this.repo.update(id, { results });
    return this.repo.findOne({ where: { id } });
  }
  async updateStatus(id: number, status: string): Promise<Task> {
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id } });
  }
  async updateToolCallId(id: number, toolCallId: string): Promise<Task> {
    await this.repo.update(id, { toolCallId });
    return this.repo.findOne({ where: { id } });
  }
  async findById(id: number): Promise<Task> {
    return this.repo.findOne({ where: { id } });
  }
}