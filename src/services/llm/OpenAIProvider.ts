import OpenAI from 'openai';
import { LLMConfig, LLMResponse } from '../../types/llm';
import { ILLMProvider } from './LLMService';

export class OpenAIProvider implements ILLMProvider {
  async generate(prompt: string, config: LLMConfig): Promise<LLMResponse> {
    if (config.provider !== 'openai') {
      throw new Error('OpenAIProvider only supports OpenAI');
    }

    const openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true, // For client-side usage
    });

    try {
      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      });

      const content = response.choices[0]?.message?.content || '';
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      return { content, usage };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }
}

