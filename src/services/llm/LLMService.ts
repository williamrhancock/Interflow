import { LLMConfig, LLMResponse } from '../../types/llm';
import { OpenAIProvider } from './OpenAIProvider';

export interface ILLMProvider {
  generate(prompt: string, config: LLMConfig): Promise<LLMResponse>;
}

export class LLMService {
  private providers: Map<string, ILLMProvider> = new Map();

  constructor() {
    this.providers.set('openai', new OpenAIProvider());
  }

  async generate(prompt: string, config: LLMConfig): Promise<LLMResponse> {
    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    return provider.generate(prompt, config);
  }
}

export const llmService = new LLMService();

