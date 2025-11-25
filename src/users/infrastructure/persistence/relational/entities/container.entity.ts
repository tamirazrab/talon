import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Flow } from './flow.entity';


export enum ContainerStatus {
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPED = 'stopped',
  FAILED = 'failed',
  }

@Entity('containers')
export class Container {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: true })
  name: string;
  @Column({ name: 'local_id', nullable: true })
  localId: string;
  @Column({ nullable: true })
  image: string;
  @Column({
    type: 'enum',
    enum: ContainerStatus,
    default: ContainerStatus.STARTING,
  })
  status: ContainerStatus;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  // Relations
  @OneToMany(() => Flow, flow => flow.container)
  flows: Flow[];
}