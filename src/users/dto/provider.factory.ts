import { Injectable } from '@nestjs/common';
import { OpenAIProvider } from './openai/openai.provider';
import { OllamaProvider } from './ollama/ollama.provider';
import { AIProvider, ProviderType } from './interfaces/provider.interface';
@Injectable()
export class ProviderFactory {
  constructor(
    private readonly openaiProvider: OpenAIProvider,
    private readonly ollamaProvider: OllamaProvider,
  ) {}
  getProvider(type: string): AIProvider {
    switch (type) {
      case ProviderType.OPENAI:
        return this.openaiProvider;
      case ProviderType.OLLAMA:
        return this.ollamaProvider;
      default:
        throw new Error(`Unknown provider: ${type}`);
    }
  }
}