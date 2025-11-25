import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flow } from '../entities/flow.entity';
@Injectable()
export class FlowRepository {
  constructor(
    @InjectRepository(Flow)
    private readonly repo: Repository<Flow>,
  ) {}
  async create(modelProvider: string, model: string): Promise<Flow> {
    const flow = this.repo.create({
      modelProvider,
      model,
      status: 'in_progress',
    });
    return this.repo.save(flow);
  }
  async findAll(): Promise<Flow[]> {
    return this.repo.find({
      relations: ['container'],
      order: { createdAt: 'DESC' },
    });
  }
  async findById(id: number): Promise<Flow> {
    return this.repo.findOne({
      where: { id },
      relations: ['container', 'tasks', 'logs'],
    });
  }
  async findByIdWithContainer(id: number): Promise<Flow> {
    return this.repo.findOne({
      where: { id },
      relations: ['container'],
    });
  }
  async updateName(id: number, name: string): Promise<Flow> {
    await this.repo.update(id, { name });
    return this.findById(id);
  }
  async updateStatus(id: number, status: string): Promise<Flow> {
    await this.repo.update(id, { status });
    return this.findById(id);
  }
  async updateContainer(id: number, containerId: number): Promise<Flow> {
    await this.repo.update(id, { containerId });
    return this.findById(id);
  }
}