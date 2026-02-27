import type { Template } from '~/types/template';

export const WORK_DIR_NAME = 'project';
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;
export const MODIFICATIONS_TAG_NAME = 'mindvex_file_modifications';
export const MODEL_REGEX = /^\[Model: (.*?)\]\n\n/;
export const PROVIDER_REGEX = /\[Provider: (.*?)\]\n\n/;
export const DEFAULT_MODEL = 'claude-3-5-sonnet-latest';
export const PROMPT_COOKIE_KEY = 'cachedPrompt';
export const TOOL_EXECUTION_APPROVAL = {
  APPROVE: 'Yes, approved.',
  REJECT: 'No, rejected.',
} as const;
export const TOOL_NO_EXECUTE_FUNCTION = 'Error: No execute function found on tool';
export const TOOL_EXECUTION_DENIED = 'Error: User denied access to tool execution';
export const TOOL_EXECUTION_ERROR = 'Error: An error occured while calling tool';

export const PROVIDER_LIST: any[] = [
  {
    name: 'Anthropic',
    staticModels: [
      { name: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', provider: 'Anthropic', maxTokenAllowed: 200000 },
      { name: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', provider: 'Anthropic', maxTokenAllowed: 200000 },
      { name: 'claude-3-opus-latest', label: 'Claude 3 Opus', provider: 'Anthropic', maxTokenAllowed: 200000 },
    ],
    getApiKeyLink: 'https://console.anthropic.com/settings/keys',
    labelForGetApiKey: 'Get Anthropic API Key',
  },
  {
    name: 'Google',
    staticModels: [
      { name: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro', provider: 'Google', maxTokenAllowed: 2000000 },
      { name: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash', provider: 'Google', maxTokenAllowed: 1000000 },
    ],
    getApiKeyLink: 'https://aistudio.google.com/app/apikey',
    labelForGetApiKey: 'Get Google AI Key',
  },
  {
    name: 'Groq',
    staticModels: [
      { name: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B', provider: 'Groq', maxTokenAllowed: 131072 },
      { name: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', provider: 'Groq', maxTokenAllowed: 131072 },
      { name: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', provider: 'Groq', maxTokenAllowed: 32768 },
    ],
    getApiKeyLink: 'https://console.groq.com/keys',
    labelForGetApiKey: 'Get Groq API Key',
  },
  {
    name: 'XAI',
    staticModels: [{ name: 'grok-beta', label: 'Grok Beta', provider: 'XAI', maxTokenAllowed: 131072 }],
    getApiKeyLink: 'https://console.x.ai/',
    labelForGetApiKey: 'Get xAI API Key',
  },
  {
    name: 'Ollama',
    staticModels: [],
  },
  {
    name: 'OpenAI',
    staticModels: [
      { name: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', maxTokenAllowed: 128000 },
      { name: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', maxTokenAllowed: 128000 },
    ],
    getApiKeyLink: 'https://platform.openai.com/api-keys',
    labelForGetApiKey: 'Get OpenAI API Key',
  },
];

export const DEFAULT_PROVIDER = 'Anthropic';

export const providerBaseUrlEnvKeys: Record<string, { baseUrlKey?: string; apiTokenKey?: string }> = {};

// starter Templates

export const STARTER_TEMPLATES: Template[] = [
  {
    name: 'Expo App',
    label: 'Expo App',
    description: 'Expo starter template for building cross-platform mobile apps',
    githubRepo: 'xKevIsDev/mindvex-expo-template',
    tags: ['mobile', 'expo', 'mobile-app', 'android', 'iphone'],
    icon: 'i-mindvex:expo',
  },
  {
    name: 'Basic Astro',
    label: 'Astro Basic',
    description: 'Lightweight Astro starter template for building fast static websites',
    githubRepo: 'xKevIsDev/mindvex-astro-basic-template',
    tags: ['astro', 'blog', 'performance'],
    icon: 'i-mindvex:astro',
  },
  {
    name: 'NextJS Shadcn',
    label: 'Next.js with shadcn/ui',
    description: 'Next.js starter fullstack template integrated with shadcn/ui components and styling system',
    githubRepo: 'xKevIsDev/mindvex-nextjs-shadcn-template',
    tags: ['nextjs', 'react', 'typescript', 'shadcn', 'tailwind'],
    icon: 'i-mindvex:nextjs',
  },
  {
    name: 'Vite Shadcn',
    label: 'Vite with shadcn/ui',
    description: 'Vite starter fullstack template integrated with shadcn/ui components and styling system',
    githubRepo: 'xKevIsDev/vite-shadcn',
    tags: ['vite', 'react', 'typescript', 'shadcn', 'tailwind'],
    icon: 'i-mindvex:shadcn',
  },
  {
    name: 'Qwik Typescript',
    label: 'Qwik TypeScript',
    description: 'Qwik framework starter with TypeScript for building resumable applications',
    githubRepo: 'xKevIsDev/mindvex-qwik-ts-template',
    tags: ['qwik', 'typescript', 'performance', 'resumable'],
    icon: 'i-mindvex:qwik',
  },
  {
    name: 'Remix Typescript',
    label: 'Remix TypeScript',
    description: 'Remix framework starter with TypeScript for full-stack web applications',
    githubRepo: 'xKevIsDev/mindvex-remix-ts-template',
    tags: ['remix', 'typescript', 'fullstack', 'react'],
    icon: 'i-mindvex:remix',
  },
  {
    name: 'Slidev',
    label: 'Slidev Presentation',
    description: 'Slidev starter template for creating developer-friendly presentations using Markdown',
    githubRepo: 'xKevIsDev/mindvex-slidev-template',
    tags: ['slidev', 'presentation', 'markdown'],
    icon: 'i-mindvex:slidev',
  },
  {
    name: 'Sveltekit',
    label: 'SvelteKit',
    description: 'SvelteKit starter template for building fast, efficient web applications',
    githubRepo: 'mindvex-sveltekit-template',
    tags: ['svelte', 'sveltekit', 'typescript'],
    icon: 'i-mindvex:svelte',
  },
  {
    name: 'Vanilla Vite',
    label: 'Vanilla + Vite',
    description: 'Minimal Vite starter template for vanilla JavaScript projects',
    githubRepo: 'xKevIsDev/vanilla-vite-template',
    tags: ['vite', 'vanilla-js', 'minimal'],
    icon: 'i-mindvex:vite',
  },
  {
    name: 'Vite React',
    label: 'React + Vite + typescript',
    description: 'React starter template powered by Vite for fast development experience',
    githubRepo: 'xKevIsDev/mindvex-vite-react-ts-template',
    tags: ['react', 'vite', 'frontend', 'website', 'app'],
    icon: 'i-mindvex:react',
  },
  {
    name: 'Vite Typescript',
    label: 'Vite + TypeScript',
    description: 'Vite starter template with TypeScript configuration for type-safe development',
    githubRepo: 'xKevIsDev/mindvex-vite-ts-template',
    tags: ['vite', 'typescript', 'minimal'],
    icon: 'i-mindvex:typescript',
  },
  {
    name: 'Vue',
    label: 'Vue.js',
    description: 'Vue.js starter template with modern tooling and best practices',
    githubRepo: 'xKevIsDev/mindvex-vue-template',
    tags: ['vue', 'typescript', 'frontend'],
    icon: 'i-mindvex:vue',
  },
  {
    name: 'Angular',
    label: 'Angular Starter',
    description: 'A modern Angular starter template with TypeScript support and best practices configuration',
    githubRepo: 'xKevIsDev/mindvex-angular-template',
    tags: ['angular', 'typescript', 'frontend', 'spa'],
    icon: 'i-mindvex:angular',
  },
  {
    name: 'SolidJS',
    label: 'SolidJS Tailwind',
    description: 'Lightweight SolidJS starter template for building fast static websites',
    githubRepo: 'xKevIsDev/solidjs-ts-tw',
    tags: ['solidjs'],
    icon: 'i-mindvex:solidjs',
  },
];
