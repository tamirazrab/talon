import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TaskJob, QueueService } from './queue.service';
import { ProcessorService } from '../services/processor.service';
import { TaskRepository } from '../../database/repositories/task.repository';
import { FlowRepository } from '../../database/repositories/flow.repository';
import { ProviderFactory } from '../../providers/provider.factory';
import { EventsGateway } from '../../websocket/gateways/events.gateway';
@Processor('task-queue')
export class TaskProcessor {
  private readonly logger = new Logger(TaskProcessor.name);
  constructor(
    private readonly queueService: QueueService,
    private readonly processorService: ProcessorService,
    private readonly taskRepo: TaskRepository,
    private readonly flowRepo: FlowRepository,
    private readonly providerFactory: ProviderFactory,
    private readonly eventsGateway: EventsGateway,
  ) {}
  @Process('process-task')
  async handleTask(job: Job<TaskJob>): Promise<void> {
    const { taskId, flowId, type } = job.data;
    this.logger.log(`Processing task ${taskId} of type ${type} for flow ${flowId}`);
    // Get task and flow details
    const task = await this.taskRepo.findById(taskId);
    const flow = await this.flowRepo.findByIdWithContainer(flowId);
    // Emit task started
    this.eventsGateway.emitTaskUpdated(task);
    try {
      // Process based on type
      switch (type) {
        case 'input':
          await this.processInputTask(task, flow);
          break;
        case 'terminal':
          await this.processorService.processTerminalTask(task, flow.container.localId);
          break;
        case 'browser':
          await this.processorService.processBrowserTask(task);
          break;
        case 'code':
          await this.processorService.processCodeTask(task, flow.container.localId);
          break;
        case 'ask':
          await this.processorService.processAskTask(task);
          break;
        case 'done':
          await this.processorService.processDoneTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${type}`);
      }
      // Mark task as finished
      await this.taskRepo.updateStatus(taskId, 'finished');
      this.logger.log(`Task ${taskId} completed`);
    } catch (error) {
      this.logger.error(`Task ${taskId} failed: ${error.message}`);
      await this.taskRepo.updateStatus(taskId, 'failed');
      throw error;
    }
  }
  @OnQueueCompleted()
  async onCompleted(job: Job<TaskJob>) {
    const { flowId, type } = job.data;
    // If not done/ask, get next task
    if (type !== 'done' && type !== 'ask') {
      const flow = await this.flowRepo.findById(flowId);
      const provider = this.providerFactory.getProvider(flow.modelProvider);
      const tasks = await this.taskRepo.findByFlowId(flowId);
      const nextTask = await provider.getNextTask({
        tasks,
        dockerImage: flow.container?.image || 'debian:latest',
      });
      // Create and queue next task
      const created = await this.taskRepo.create({
        ...nextTask,
        flowId,
      });
      await this.queueService.addTask(flowId, created.id, created.type);
    }
  }
  @OnQueueFailed()
  async onFailed(job: Job<TaskJob>, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
    
    // Create ask task for user intervention
    const askTask = await this.taskRepo.create({
      type: 'ask',
      status: 'in_progress',
      args: {},
      results: {},
      message: `Task failed: ${error.message}. What should I do?`,
      flowId: job.data.flowId,
    });
    this.eventsGateway.emitTaskAdded(job.data.flowId, askTask);
  }
  private async processInputTask(task: any, flow: any) {
    // First task - initialize container if needed
    const tasks = await this.taskRepo.findByFlowId(task.flowId);
    if (tasks.length === 1) {
      // Get summary and docker image from provider
      const provider = this.providerFactory.getProvider(flow.modelProvider);
      
      const summary = await provider.getSummary(task.message, 10);
      await this.flowRepo.updateName(flow.id, summary);
      const dockerImage = await provider.getDockerImage(task.message);
      
      // Spawn container
      this.eventsGateway.sendTerminalSystemOutput(
        flow.id,
        `Initializing Docker image ${dockerImage}...`,
      );
      const { dbId, localId } = await this.dockerService.spawnContainer(
        `codel-terminal-${flow.id}`,
        dockerImage,
      );
      await this.flowRepo.updateContainer(flow.id, dbId);
      this.eventsGateway.sendTerminalSystemOutput(
        flow.id,
        'Container initialized. Ready to execute commands.',
      );
    }
  }
}