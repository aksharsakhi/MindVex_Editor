import { useState } from 'react';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('usePromptEnhancement');

export function usePromptEnhancer() {
  const [enhancingPrompt] = useState(false);
  const [promptEnhanced] = useState(false);

  const resetEnhancer = () => {
    // no-op: prompt enhancement has been removed
  };

  const enhancePrompt = async (
    _input: string,
    _setInput: (value: string) => void,
    _model?: any,
    _provider?: any,
    _apiKeys?: Record<string, string>,
  ) => {
    logger.info('Prompt enhancement is disabled in this build.');
  };

  return { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer };
}
