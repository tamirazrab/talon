import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Container } from './container.entity';
import { Task } from './task.entity';
import { Log } from './log.entity';


export enum FlowStatus {
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
}


@Entity('flows')
export class Flow {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  @Column({ nullable: true })
  name: string;
  @Column({
    type: 'enum',
    enum: FlowStatus,
    default: FlowStatus.IN_PROGRESS,
  })
  status: FlowStatus;
  @Column({ name: 'container_id', nullable: true })
  containerId: number;
  @Column({ nullable: true })
  model: string;
  @Column({ name: 'model_provider', nullable: true })
  modelProvider: string;
  // Relations
  @ManyToOne(() => Container, container => container.flows)
  @JoinColumn({ name: 'container_id' })
  container: Container;
  @OneToMany(() => Task, task => task.flow)
  tasks: Task[];
  @OneToMany(() => Log, log => log.flow)
  logs: Log[];
}