import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import { ContainerRepository } from '../../database/repositories/container.repository';
import { FlowRepository } from '../../database/repositories/flow.repository';
@Injectable()
export class DockerService implements OnModuleInit {
  private readonly logger = new Logger(DockerService.name);
  private docker: Docker;
  constructor(
    private readonly configService: ConfigService,
    private readonly containerRepo: ContainerRepository,
    private readonly flowRepo: FlowRepository,
  ) {}
  async onModuleInit() {
    const socketPath = this.configService.get('DOCKER_HOST') || '/var/run/docker.sock';
    this.docker = new Docker({ socketPath });
    const info = await this.docker.info();
    this.logger.log(`Docker initialized: ${info.Name}, API version: ${info.ServerVersion}`);
  }
  async spawnContainer(
    name: string,
    image: string,
    cmd?: string[],
  ): Promise<{ dbId: number; localId: string }> {
    this.logger.log(`Spawning container '${name}' with image '${image}'`);
    // Create DB entry
    const dbContainer = await this.containerRepo.create(name, image, 'starting');
    let containerId: string;
    try {
      // Check if image exists locally
      const images = await this.docker.listImages({
        filters: { reference: [image] },
      });
      if (images.length === 0) {
        this.logger.log(`Pulling image ${image}...`);
        await this.pullImage(image);
      }
      // Create container
      const container = await this.docker.createContainer({
        name,
        Image: image,
        Cmd: cmd || ['tail', '-f', '/dev/null'],
        Tty: true,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        OpenStdin: true,
      });
      containerId = container.id;
      // Start container
      await container.start();
      this.logger.log(`Container '${name}' started`);
      // Update DB
      await this.containerRepo.updateLocalId(dbContainer.id, containerId);
      await this.containerRepo.updateStatus(dbContainer.id, 'running');
      return {
        dbId: dbContainer.id,
        localId: containerId,
      };
    } catch (error) {
      this.logger.error(`Failed to spawn container: ${error.message}`);
      await this.containerRepo.updateStatus(dbContainer.id, 'failed');
      throw error;
    }
  }
  async execCommand(containerId: string, command: string): Promise<string> {
    const container = this.docker.getContainer(containerId);
    // Create exec instance
    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
    });
    // Start execution
    const stream = await exec.start({ Detach: false });
    // Collect output
    return new Promise((resolve, reject) => {
      let output = '';
      stream.on('data', (chunk) => {
        output += chunk.toString();
      });
      stream.on('end', () => {
        resolve(output);
      });
      stream.on('error', reject);
    });
  }
  async stopContainer(containerId: string, dbId: number): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
      await this.containerRepo.updateStatus(dbId, 'stopped');
      this.logger.log(`Container ${containerId} stopped`);
    } catch (error) {
      if (error.statusCode === 404) {
        this.logger.warn(`Container ${containerId} not found`);
        await this.containerRepo.updateStatus(dbId, 'stopped');
      } else {
        throw error;
      }
    }
  }
  async deleteContainer(containerId: string, dbId: number): Promise<void> {
    await this.stopContainer(containerId, dbId);
    
    const container = this.docker.getContainer(containerId);
    await container.remove();
    
    this.logger.log(`Container ${containerId} removed`);
  }
  async writeFile(containerId: string, filePath: string, content: string): Promise<void> {
    const command = `cat > ${filePath} << 'EOF'\n${content}\nEOF`;
    await this.execCommand(containerId, command);
  }
  async readFile(containerId: string, filePath: string): Promise<string> {
    return this.execCommand(containerId, `cat ${filePath}`);
  }
  private async pullImage(image: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.docker.pull(image, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        this.docker.modem.followProgress(stream, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
  async cleanup(): Promise<void> {
    const containers = await this.containerRepo.findAllRunning();
    for (const container of containers) {
      try {
        if (container.localId) {
          await this.deleteContainer(container.localId, container.id);
        }
      } catch (error) {
        this.logger.error(`Failed to cleanup container ${container.id}: ${error.message}`);
      }
    }
  }
}