import { Task } from "../infrastructure/persistence/relational/entities/task.entity";

export interface AIProvider {
  getName(): ProviderType;
  getSummary(query: string, maxWords: number): Promise<string>;
  getDockerImage(task: string): Promise<string>;
  getNextTask(options: NextTaskOptions): Promise<TaskDto>;
}
export enum ProviderType {
  OPENAI = 'openai',
  OLLAMA = 'ollama',
}
export interface NextTaskOptions {
  tasks: Task[];
  dockerImage: string;
}
export interface TerminalArgs {
  input: string;
  message: string;
}
export interface BrowserArgs {
  url: string;
  action: 'read' | 'url';
  message: string;
}
export interface CodeArgs {
  action: 'read_file' | 'update_file';
  content?: string;
  path: string;
  message: string;
}
export interface AskArgs {
  message: string;
}
export interface DoneArgs {
  message: string;
}