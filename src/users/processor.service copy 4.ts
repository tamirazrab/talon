import { Injectable, Logger } from '@nestjs/common';
import { DockerService } from './docker.service';
import { BrowserService } from './browser.service';
import { TaskRepository } from '../../database/repositories/task.repository';
import { EventsGateway } from '../../websocket/gateways/events.gateway';
@Injectable()
export class ProcessorService {
  private readonly logger = new Logger(ProcessorService.name);
  constructor(
    private readonly dockerService: DockerService,
    private readonly browserService: BrowserService,
    private readonly taskRepo: TaskRepository,
    private readonly eventsGateway: EventsGateway,
  ) {}
  async processBrowserTask(task: any): Promise<void> {
    const { url, action } = task.args;
    let content: string;
    let screenshot: string;
    if (action === 'read') {
      const result = await this.browserService.getContent(url);
      content = result.content;
      screenshot = result.screenshot;
    } else if (action === 'url') {
      const result = await this.browserService.getUrls(url);
      content = result.urls;
      screenshot = result.screenshot;
    }
    // Update task results
    await this.taskRepo.updateResults(task.id, { content });
    // Emit browser update via WebSocket
    this.eventsGateway.emitBrowserUpdated(task.flowId, {
      url,
      screenshotUrl: `/browser/${screenshot}`,
    });
  }
  async processTerminalTask(task: any, containerId: string): Promise<void> {
    const { input } = task.args;
    // Execute command in Docker container
    const output = await this.dockerService.execCommand(containerId, input);
    // Update task results
    await this.taskRepo.updateResults(task.id, { output });
  }
  async processCodeTask(task: any, containerId: string): Promise<void> {
    const { action, path, content } = task.args;
    let result: string;
    if (action === 'read_file') {
      result = await this.dockerService.readFile(containerId, path);
    } else if (action === 'update_file') {
      await this.dockerService.writeFile(containerId, path, content);
      result = 'File updated successfully';
    }
    // Update task results
    await this.taskRepo.updateResults(task.id, { result });
  }
  async processAskTask(task: any): Promise<void> {
    // Just mark as finished - waits for user input
    await this.taskRepo.updateStatus(task.id, 'finished');
  }
  async processDoneTask(task: any): Promise<void> {
    // Mark flow as finished
    this.eventsGateway.emitFlowUpdated(task.flowId, {
      id: task.flowId,
      status: 'finished',
    });
  }
}