import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Flow } from './flow.entity';
@Entity('logs')
@Index(['flowId', 'createdAt'])
export class Log {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'text' })
  message: string;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @Column({ name: 'flow_id', nullable: true })
  @Index()
  flowId: number;
  @Column()
  type: string;
  // Relations
  @ManyToOne(() => Flow, flow => flow.logs)
  @JoinColumn({ name: 'flow_id' })
  flow: Flow;
}