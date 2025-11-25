import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
export interface TaskJob {
  taskId: number;
  flowId: number;
  type: string;
}
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<number, boolean>();
  constructor(
    @InjectQueue('task-queue')
    private taskQueue: Queue<TaskJob>,
  ) {}
  async addQueue(flowId: number): Promise<void> {
    this.queues.set(flowId, true);
    this.logger.log(`Queue initialized for flow ${flowId}`);
  }
  async addTask(flowId: number, taskId: number, type: string): Promise<void> {
    if (!this.queues.has(flowId)) {
      await this.addQueue(flowId);
    }
    await this.taskQueue.add(
      'process-task',
      {
        taskId,
        flowId,
        type,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(`Task ${taskId} added to queue for flow ${flowId}`);
  }
  async cleanQueue(flowId: number): Promise<void> {
    // Remove all jobs for this flow
    const jobs = await this.taskQueue.getJobs(['waiting', 'active', 'delayed']);
    
    for (const job of jobs) {
      if (job.data.flowId === flowId) {
        await job.remove();
      }
    }
    this.queues.delete(flowId);
    this.logger.log(`Queue cleaned for flow ${flowId}`);
  }
  async pauseQueue(flowId: number): Promise<void> {
    await this.taskQueue.pause();
    this.logger.log(`Queue paused for flow ${flowId}`);
  }
  async resumeQueue(flowId: number): Promise<void> {
    await this.taskQueue.resume();
    this.logger.log(`Queue resumed for flow ${flowId}`);
  }
}