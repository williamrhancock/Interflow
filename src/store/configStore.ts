import { create } from 'zustand';
import { LLMConfig } from '../types/llm';

interface ConfigState {
  theme: 'light' | 'dark';
  llmConfig: LLMConfig | null;
  setTheme: (theme: 'light' | 'dark') => void;
  setLLMConfig: (config: LLMConfig) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const STORAGE_KEY = 'inferflow_config';

const getDefaultLLMConfig = (): LLMConfig | null => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return null;

  return {
    provider: 'openai',
    apiKey,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  };
};

// Initialize theme immediately to prevent flash
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
  const theme = stored || 'dark';
  // Apply immediately
  document.documentElement.classList.toggle('dark', theme === 'dark');
  return theme;
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  theme: getInitialTheme(),
  llmConfig: getDefaultLLMConfig(),

  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  },

  setLLMConfig: (config) => {
    set({ llmConfig: config });
    get().saveToStorage();
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as LLMConfig;
        // Merge with env vars - env vars take precedence for API key
        const envConfig = getDefaultLLMConfig();
        if (envConfig && envConfig.apiKey) {
          // Use stored config but override with env API key if available
          set({ llmConfig: { ...data, apiKey: envConfig.apiKey } });
        } else {
          set({ llmConfig: data });
        }
      } else {
        // No stored config, use default from env
        const defaultConfig = getDefaultLLMConfig();
        if (defaultConfig) {
          set({ llmConfig: defaultConfig });
        }
      }
    } catch (error) {
      console.error('Failed to load config from storage:', error);
      // Fallback to env config
      const defaultConfig = getDefaultLLMConfig();
      if (defaultConfig) {
        set({ llmConfig: defaultConfig });
      }
    }
  },

  saveToStorage: () => {
    try {
      const config = get().llmConfig;
      if (config) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }
    } catch (error) {
      console.error('Failed to save config to storage:', error);
    }
  },
}));

