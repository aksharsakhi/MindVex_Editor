import { atom } from 'nanostores';
import type { ParseMode } from './unifiedParser';
import { providersStore } from '~/lib/stores/settings';

// Default configuration
export const DEFAULT_CONFIG = {
  defaultMode: { type: 'parser-only' } as ParseMode,
  availableModels: [
    'gpt-4',
    'gpt-3.5-turbo',
    'claude-3-sonnet',
    'claude-3-haiku',
    'gemini-pro',
    'deepseek-coder',
  ],
  defaultModel: 'gpt-3.5-turbo',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
};

// Parse mode store
export const parseModeStore = atom<ParseMode>(DEFAULT_CONFIG.defaultMode);

// Sync with providersStore on every change
providersStore.subscribe((providers) => {
  const current = parseModeStore.get();
  if (current.type === 'llm-enhanced') {
    const enabledProvider = Object.values(providers).find(p => p.settings.enabled);
    if (enabledProvider) {
      const selectedModel = enabledProvider.settings.selectedModel || 
                          (enabledProvider.staticModels && enabledProvider.staticModels[0]?.name) ||
                          DEFAULT_CONFIG.defaultModel;
      
      if (current.model !== selectedModel) {
        parseModeStore.set({
          ...current,
          model: selectedModel
        });
      }
    }
  }
});

// Mode selection functions
export function setParseMode(mode: ParseMode): void {
  parseModeStore.set(mode);
}

export function setParserOnlyMode(): void {
  parseModeStore.set({ type: 'parser-only' });
}

export function setLLMEnhancedMode(model?: string, temperature?: number, maxTokens?: number): void {
  const providers = providersStore.get();
  const enabledProvider = Object.values(providers).find(p => p.settings.enabled);
  
  const defaultModel = enabledProvider 
    ? (enabledProvider.settings.selectedModel || (enabledProvider.staticModels && enabledProvider.staticModels[0]?.name))
    : DEFAULT_CONFIG.defaultModel;

  parseModeStore.set({
    type: 'llm-enhanced',
    model: model || defaultModel || DEFAULT_CONFIG.defaultModel,
    temperature: temperature || DEFAULT_CONFIG.defaultTemperature,
    maxTokens: maxTokens || DEFAULT_CONFIG.defaultMaxTokens,
  });
}

export function toggleParseMode(): void {
  const current = parseModeStore.get();
  if (current.type === 'parser-only') {
    setLLMEnhancedMode();
  } else {
    setParserOnlyMode();
  }
}

export function isParserOnlyMode(): boolean {
  return parseModeStore.get().type === 'parser-only';
}

export function isLLMEnhancedMode(): boolean {
  return parseModeStore.get().type === 'llm-enhanced';
}

export function getCurrentModel(): string | undefined {
  const mode = parseModeStore.get();
  return mode.type === 'llm-enhanced' ? mode.model : undefined;
}

export function updateModel(model: string): void {
  const current = parseModeStore.get();
  if (current.type === 'llm-enhanced') {
    parseModeStore.set({ ...current, model });
  }
}

export function updateTemperature(temperature: number): void {
  const current = parseModeStore.get();
  if (current.type === 'llm-enhanced') {
    parseModeStore.set({ ...current, temperature });
  }
}

export function updateMaxTokens(maxTokens: number): void {
  const current = parseModeStore.get();
  if (current.type === 'llm-enhanced') {
    parseModeStore.set({ ...current, maxTokens });
  }
}

// Helper functions for React components
export function useParseMode() {
  return parseModeStore.get();
}

export function getAvailableModels(): string[] {
  return DEFAULT_CONFIG.availableModels;
}

export function getDefaultModel(): string {
  return DEFAULT_CONFIG.defaultModel;
}

export function getDefaultTemperature(): number {
  return DEFAULT_CONFIG.defaultTemperature;
}

export function getDefaultMaxTokens(): number {
  return DEFAULT_CONFIG.defaultMaxTokens;
}

// Configuration management
export function resetToDefaults(): void {
  parseModeStore.set(DEFAULT_CONFIG.defaultMode);
}

export function saveConfiguration(): void {
  const currentMode = parseModeStore.get();
  localStorage.setItem('mindvex-parse-mode', JSON.stringify(currentMode));
}

export function loadConfiguration(): void {
  try {
    const saved = localStorage.getItem('mindvex-parse-mode');
    if (saved) {
      const mode = JSON.parse(saved) as ParseMode;
      parseModeStore.set(mode);
    }
  } catch (error) {
    console.error('Failed to load parse mode configuration:', error);
    resetToDefaults();
  }
}

// Initialize from localStorage on module load
loadConfiguration();