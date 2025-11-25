import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { AIProvider, ProviderType, NextTaskOptions } from '../interfaces/provider.interface';
import { TaskDto } from '../../api/tasks/dto/task.dto';
import { TemplateService } from '../template.service';
@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;
  private readonly model: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: TemplateService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
      baseURL: this.configService.get('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    });
    this.model = this.configService.get('OPENAI_MODEL', 'gpt-4');
  }
  getName(): ProviderType {
    return ProviderType.OPENAI;
  }
  async getSummary(query: string, maxWords: number): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `Summarize the following in ${maxWords} words or less`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      temperature: 0.0,
    });
    return response.choices[0]?.message?.content || '';
  }
  async getDockerImage(task: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'Choose the most appropriate Docker image for this task. Return only the image name.',
        },
        {
          role: 'user',
          content: task,
        },
      ],
      temperature: 0.0,
    });
    return response.choices[0]?.message?.content || 'debian:latest';
  }
  async getNextTask(options: NextTaskOptions): Promise<TaskDto> {
    this.logger.log('Getting next task');
    // Render prompt template
    const prompt = await this.templateService.renderPrompt('agent', {
      dockerImage: options.dockerImage,
      toolPlaceholder: 'Always use your function calling functionality',
      tasks: options.tasks,
    });
    // Check prompt length
    if (prompt.length > 30000) {
      this.logger.warn('Prompt too long');
      return this.createAskTask('My prompt is too long and I cannot process it');
    }
    // Convert tasks to messages
    const messages = this.tasksToMessages(options.tasks, prompt);
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.0,
        top_p: 0.2,
        n: 1,
        tools: this.getTools(),
        tool_choice: 'auto',
      });
      return this.toolToTask(response.choices);
    } catch (error) {
      this.logger.error('Failed to get response from OpenAI', error);
      return this.createAskTask('There was an error getting the next task');
    }
  }
  private tasksToMessages(tasks: any[], systemPrompt: string): any[] {
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
    ];
    for (const task of tasks) {
      if (task.type === 'input') {
        messages.push({
          role: 'user' as const,
          content: task.message,
        });
      }
      if (task.toolCallId) {
        messages.push({
          role: 'assistant' as const,
          content: null,
          tool_calls: [
            {
              id: task.toolCallId,
              type: 'function' as const,
              function: {
                name: task.type,
                arguments: JSON.stringify(task.args),
              },
            },
          ],
        });
        messages.push({
          role: 'tool' as const,
          tool_call_id: task.toolCallId,
          content: JSON.stringify(task.results),
        });
      }
    }
    return messages;
  }
  private getTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'terminal',
          description: 'Execute a terminal command',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Command to execute' },
              message: { type: 'string' },
            },
            required: ['input'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'browser',
          description: 'Open browser to fetch information',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              action: { type: 'string', enum: ['read', 'url'] },
              message: { type: 'string' },
            },
            required: ['url', 'action'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'code',
          description: 'Read or update code files',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['read_file', 'update_file'] },
              path: { type: 'string' },
              content: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['action', 'path'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'ask',
          description: 'Ask user for additional information',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
            required: ['message'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'done',
          description: 'Mark task as complete',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    ];
  }
  private toolToTask(choices: any[]): TaskDto {
    if (!choices || choices.length === 0) {
      return this.createAskTask('No response from AI');
    }
    const toolCalls = choices[0]?.message?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return this.createAskTask('No tool call found');
    }
    const tool = toolCalls[0];
    const args = JSON.parse(tool.function.arguments);
    return {
      type: tool.function.name,
      status: 'in_progress',
      args,
      results: {},
      message: args.message || JSON.stringify(args),
      toolCallId: tool.id,
    };
  }
  private createAskTask(message: string): TaskDto {
    return {
      type: 'ask',
      status: 'in_progress',
      args: {},
      results: {},
      message: `${message}. What should I do next?`,
      toolCallId: undefined,
    };
  }
}