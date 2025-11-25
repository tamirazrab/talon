import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private connections = new Map<number, Socket>();
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from connections map
    for (const [flowId, socket] of this.connections.entries()) {
      if (socket.id === client.id) {
        this.connections.delete(flowId);
      }
    }
  }
  @SubscribeMessage('subscribeToFlow')
  handleSubscribeToFlow(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { flowId: number },
  ) {
    client.join(`flow:${data.flowId}`);
    this.connections.set(data.flowId, client);
    this.logger.log(`Client ${client.id} subscribed to flow ${data.flowId}`);
    return { event: 'subscribed', data: { flowId: data.flowId } };
  }
  @SubscribeMessage('terminalInput')
  handleTerminalInput(@MessageBody() data: { flowId: number; input: string }) {
    // Broadcast terminal input to flow room
    this.server.to(`flow:${data.flowId}`).emit('terminalOutput', {
      text: this.formatTerminalInput(data.input),
    });
  }
  // Emit flow updated
  emitFlowUpdated(flowId: number, flow: any) {
    this.server.to(`flow:${flowId}`).emit('flowUpdated', flow);
  }
  // Emit task added
  emitTaskAdded(flowId: number, task: any) {
    this.server.to(`flow:${flowId}`).emit('taskAdded', task);
  }
  // Emit task updated
  emitTaskUpdated(task: any) {
    this.server.to(`flow:${task.flowId}`).emit('taskUpdated', task);
  }
  // Emit browser updated
  emitBrowserUpdated(flowId: number, browser: any) {
    this.server.to(`flow:${flowId}`).emit('browserUpdated', browser);
  }
  // Emit terminal logs
  emitTerminalLog(flowId: number, log: any) {
    this.server.to(`flow:${flowId}`).emit('terminalLogAdded', log);
  }
  // Send terminal output to specific flow
  sendTerminalOutput(flowId: number, output: string) {
    this.server.to(`flow:${flowId}`).emit('terminalOutput', {
      text: output,
    });
  }
  sendTerminalSystemOutput(flowId: number, message: string) {
    this.sendTerminalOutput(flowId, this.formatTerminalSystemOutput(message));
  }
  private formatTerminalInput(text: string): string {
    const yellow = '\x1b[33m';
    const reset = '\x1b[0m';
    return `$ ${yellow}${text}${reset}\r\n`;
  }
  private formatTerminalSystemOutput(text: string): string {
    const blue = '\x1b[34m';
    const reset = '\x1b[0m';
    return `${blue}${text}${reset}\r\n`;
  }
}