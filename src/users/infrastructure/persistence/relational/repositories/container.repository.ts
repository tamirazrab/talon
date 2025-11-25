import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Container } from '../entities/container.entity';
@Injectable()
export class ContainerRepository {
  constructor(
    @InjectRepository(Container)
    private readonly repo: Repository<Container>,
  ) {}
  async create(name: string, image: string, status = 'starting'): Promise<Container> {
    const container = this.repo.create({ name, image, status });
    return this.repo.save(container);
  }
  async findAllRunning(): Promise<Container[]> {
    return this.repo.find({
      where: { status: 'running' },
    });
  }
  async updateLocalId(id: number, localId: string): Promise<Container> {
    await this.repo.update(id, { localId });
    return this.repo.findOne({ where: { id } });
  }
  async updateStatus(id: number, status: string): Promise<Container> {
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id } });
  }
  async findById(id: number): Promise<Container> {
    return this.repo.findOne({ where: { id } });
  }
}