import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Flow } from './flow.entity';

export enum TaskType {
  INPUT = 'input',
  TERMINAL = 'terminal',
  BROWSER = 'browser',
  CODE = 'code',
  ASK = 'ask',
  DONE = 'done',
}

export enum TaskStatus {
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  STOPPED = 'stopped',
  FAILED = 'failed',
}

@Entity('tasks')
@Index(['flowId', 'createdAt'])  // Compound index for performance
export class Task {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  @Column({ nullable: true })
  type: TaskType;
  @Column({ nullable: true })
  status: TaskStatus;
  @Column({ type: 'jsonb', default: {} })  // PostgreSQL JSONB for better performance
  args: Record<string, any>;
  @Column({ type: 'jsonb', default: {} })
  results: Record<string, any>;
  @Column({ type: 'text', nullable: true })
  message: string;
  @Column({ name: 'flow_id', nullable: true })
  @Index()
  flowId: number;
  @Column({ name: 'tool_call_id', nullable: true })
  toolCallId: string;
  // Relations
  @ManyToOne(() => Flow, flow => flow.tasks)
  @JoinColumn({ name: 'flow_id' })
  flow: Flow;
}