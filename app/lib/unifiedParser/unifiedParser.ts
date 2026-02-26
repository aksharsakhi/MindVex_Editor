import type { TreeSitterParser, SupportedLanguage, ParseResult } from './treeSitterParser';
import { AIClient } from './aiClient';
import { z } from 'zod';

// Parse mode configuration
export interface ParseMode {
  type: 'parser-only' | 'llm-enhanced';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// LLM Analysis result
export interface LLMAnalysis {
  summary: string;
  patterns: CodePattern[];
  recommendations: string[];
  complexity: {
    score: number;
    factors: string[];
  };
  architecture: {
    type: string;
    patterns: string[];
    issues: string[];
  };
  quality: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  graph?: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; type: string; strength?: number }>;
  };
}

export interface CodePattern {
  type: string;
  name: string;
  line: number;
  description: string;
  severity: 'info' | 'warning' | 'error';
}

// Enhanced parse result with LLM analysis
export interface EnhancedParseResult extends ParseResult {
  llmAnalysis?: LLMAnalysis;
  analysisTime?: number;
}

// Project analysis result
export interface ProjectAnalysis {
  files: EnhancedParseResult[];
  projectMetadata: {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    totalClasses: number;
    languages: Record<SupportedLanguage, number>;
    dependencies: string[];
    complexity: {
      average: number;
      highest: number;
      lowest: number;
    };
  };
  llmAnalysis?: LLMAnalysis;
}

// Zod schemas for LLM analysis
const CodePatternSchema = z.object({
  type: z.string(),
  name: z.string(),
  line: z.number(),
  description: z.string(),
  severity: z.enum(['info', 'warning', 'error']),
});

const LLMAnalysisSchema = z.object({
  summary: z.string(),
  patterns: z.array(CodePatternSchema),
  recommendations: z.array(z.string()),
  complexity: z.object({
    score: z.number(),
    factors: z.array(z.string()),
  }),
  architecture: z.object({
    type: z.string(),
    patterns: z.array(z.string()),
    issues: z.array(z.string()),
  }),
  quality: z.object({
    score: z.number(),
    issues: z.array(z.string()),
    strengths: z.array(z.string()),
  }),
  graph: z.object({
    nodes: z.array(z.object({
      id: z.string(),
      label: z.string(),
      type: z.string(),
    })),
    edges: z.array(z.object({
      source: z.string(),
      target: z.string(),
      type: z.string(),
      strength: z.number().optional(),
    })),
  }).optional(),
});

export class UnifiedParserService {
  private parser: TreeSitterParser;
  private mode: ParseMode = { type: 'parser-only' };
  private aiClient: AIClient;

  constructor(parser: TreeSitterParser) {
    this.parser = parser;
    this.aiClient = new AIClient();
  }

  setMode(mode: ParseMode): void {
    this.mode = mode;
  }

  getMode(): ParseMode {
    return this.mode;
  }

  async parseCode(code: string, filePath: string): Promise<EnhancedParseResult> {
    const language = this.parser.getLanguageFromExtension(filePath);
    if (!language) {
      throw new Error(`Unsupported file type: ${filePath}`);
    }

    const startTime = Date.now();
    
    // Parse with tree-sitter
    const parseResult = await this.parser.parse(code, language, filePath);
    
    let llmAnalysis: LLMAnalysis | undefined;
    
    // Perform LLM analysis if in LLM-enhanced mode
    if (this.mode.type === 'llm-enhanced') {
      llmAnalysis = await this.performLLMAnalysis(code, parseResult.metadata, filePath, language);
    }

    const analysisTime = Date.now() - startTime;

    return {
      ...parseResult,
      llmAnalysis,
      analysisTime,
    };
  }

  async parseProject(files: Array<{ path: string; content: string }>): Promise<ProjectAnalysis> {
    const startTime = Date.now();
    const results: EnhancedParseResult[] = [];
    
    // Parse all files
    for (const file of files) {
      try {
        const result = await this.parseCode(file.content, file.path);
        results.push(result);
      } catch (error) {
        console.error(`Failed to parse ${file.path}:`, error);
      }
    }

    // Calculate project metadata
    const projectMetadata = this.calculateProjectMetadata(results);
    
    let llmAnalysis: LLMAnalysis | undefined;
    
    // Perform project-level LLM analysis if in LLM-enhanced mode
    if (this.mode.type === 'llm-enhanced') {
      llmAnalysis = await this.performProjectLLMAnalysis(results, projectMetadata);
    }

    return {
      files: results,
      projectMetadata,
      llmAnalysis,
    };
  }

  private calculateProjectMetadata(results: EnhancedParseResult[]): ProjectAnalysis['projectMetadata'] {
    const languages: Record<SupportedLanguage, number> = {} as Record<SupportedLanguage, number>;
    let totalLines = 0;
    let totalFunctions = 0;
    let totalClasses = 0;
    const complexities: number[] = [];
    const dependencies = new Set<string>();

    results.forEach(result => {
      // Count languages
      languages[result.language] = (languages[result.language] || 0) + 1;
      
      // Count lines and code elements
      totalLines += result.metadata.linesOfCode;
      totalFunctions += result.metadata.functions.length;
      totalClasses += result.metadata.classes.length;
      
      // Collect complexity scores
      result.metadata.functions.forEach(func => {
        complexities.push(func.complexity);
      });
      
      // Collect dependencies
      result.metadata.imports.forEach(imp => {
        dependencies.add(imp.module);
      });
    });

    const complexityValues = complexities.length > 0 ? complexities : [0];
    
    return {
      totalFiles: results.length,
      totalLines,
      totalFunctions,
      totalClasses,
      languages,
      dependencies: Array.from(dependencies),
      complexity: {
        average: complexityValues.reduce((a, b) => a + b, 0) / complexityValues.length,
        highest: Math.max(...complexityValues),
        lowest: Math.min(...complexityValues),
      },
    };
  }

  private async performLLMAnalysis(code: string, metadata: ParseResult['metadata'], filePath: string, language: string): Promise<LLMAnalysis> {
    if (this.mode.type !== 'llm-enhanced') {
      throw new Error('LLM analysis not available in parser-only mode');
    }

    try {
      const context = `File: ${filePath}
Language: ${language}
Functions: ${metadata.functions.length}
Classes: ${metadata.classes.length}
Imports: ${metadata.imports.length}
Lines: ${metadata.linesOfCode}`;

      const system = `You are an expert code analyzer. Your task is to analyze the provided code and metadata and return a JSON object that matches this schema:
{
  "summary": "string",
  "patterns": [{ "type": "string", "name": "string", "line": number, "description": "string", "severity": "info" | "warning" | "error" }],
  "recommendations": ["string"],
  "complexity": { "score": number, "factors": ["string"] },
  "architecture": { "type": "string", "patterns": ["string"], "issues": ["string"] },
  "quality": { "score": number, "issues": ["string"], "strengths": ["string"] }
}
Only return the JSON object, no other text.`;

      const response = await this.aiClient.analyzeCode(code, context, { 
        system,
        model: this.mode.model,
        temperature: this.mode.temperature,
        maxTokens: this.mode.maxTokens
      });
      
      try {
        // Clean the response text to extract only JSON
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return LLMAnalysisSchema.parse(analysis);
        }
        throw new Error('No JSON found in AI response');
      } catch (e) {
        console.warn('AI response parsing failed, using mock data:', e);
        return this.generateMockLLMAnalysis(code, metadata, filePath);
      }
    } catch (error) {
      console.error('LLM analysis failed:', error);
      return this.generateFallbackLLMAnalysis(metadata);
    }
  }

  private async performProjectLLMAnalysis(results: EnhancedParseResult[], projectMetadata: ProjectAnalysis['projectMetadata']): Promise<LLMAnalysis> {
    if (this.mode.type !== 'llm-enhanced') {
      throw new Error('LLM analysis not available in parser-only mode');
    }

    try {
      const fileList = results.map(r => r.filePath).join('\n');
      
      // Extract relationships found by AST parser to guide the LLM
      const astRelationships = results.flatMap(r => 
        r.metadata.imports.map(imp => {
          const target = results.find(f => f.filePath.includes(imp.module) || imp.module.includes(f.filePath));
          return target ? `${r.filePath} -> ${target.filePath} (${imp.symbols.join(', ')})` : null;
        })
      ).filter(Boolean).join('\n');

      const context = `Project Summary:
Files: ${projectMetadata.totalFiles}
Total Lines: ${projectMetadata.totalLines}
Functions: ${projectMetadata.totalFunctions}
Classes: ${projectMetadata.totalClasses}
Languages: ${Object.keys(projectMetadata.languages).join(', ')}
Dependencies: ${projectMetadata.dependencies.length}

File List:
${fileList}

Detected AST Relationships:
${astRelationships || 'None detected yet'}

TASK:
1. Provide an architectural summary.
2. Identify design patterns.
3. CRITICAL: Generate a JSON "graph" object representing the REAL dependencies between these files. 
   - Use the Detected AST Relationships as a baseline, but enhance them with your semantic understanding (e.g., if a controller uses a service via dependency injection that wasn't caught by simple import parsing).
   - Each node MUST be one of the files in the File List.
   - Each edge MUST have a valid "source" and "target" from the File List.
   - Do not invent files. Use the full paths provided.`;

      const system = `You are a static code architecture analyzer. 

Your task is to generate a COMPLETE architectural knowledge graph of the project in JSON format.

STRICT REQUIREMENTS:
1. You MUST include:
   - ALL files from the File List as nodes.
   - ALL detected and inferred relationships as edges.

2. Edge types MUST include:
   - import (strength: 1)
   - dependency_injection (strength: 3)
   - implements (strength: 2)
   - extends (strength: 2)
   - calls (strength: 2)
   - references (strength: 1)
   - controller_service_link (strength: 4)
   - service_repository_link (strength: 4)

3. Every edge MUST contain:
   { 
     "source": "<exact full file path from File List>", 
     "target": "<exact full file path from File List>", 
     "type": "<relationship type>", 
     "strength": <number>
   }

4. DO NOT omit edges even if uncertain. If File A logically depends on File B (e.g., Controller -> Service -> Entity), you MUST infer and include these links to ensure the graph is connected.
5. Every node MUST have the exact ID from the File List.
6. The graph should form architectural clusters. Isolated nodes should be connected via logical relationships if possible.
7. Output STRICT VALID JSON only.

JSON Schema:
{
  "summary": "string",
  "patterns": [{ "type": "string", "name": "string", "line": number, "description": "string", "severity": "info" | "warning" | "error" }],
  "recommendations": ["string"],
  "complexity": { "score": number, "factors": ["string"] },
  "architecture": { "type": "string", "patterns": ["string"], "issues": ["string"] },
  "quality": { "score": number, "issues": ["string"], "strengths": ["string"] },
  "graph": {
    "nodes": [{ "id": "string", "label": "string", "type": "file" | "module" }],
    "edges": [{ "source": "string", "target": "string", "type": "string", "strength": number }]
  }
}

Only return JSON.`;

      const response = await this.aiClient.generate({ 
        prompt: context, 
        system,
        model: this.mode.model,
        temperature: 0.1, // Lower temperature for more consistent JSON
        maxTokens: this.mode.maxTokens
      });
      
      console.log('AI Project Analysis Response:', response.text);
      
      try {
        // Clean the response text to extract only JSON
        let jsonStr = response.text.trim();
        if (jsonStr.includes('```json')) {
          jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
        } else if (jsonStr.includes('```')) {
          jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
        }

        const analysis = JSON.parse(jsonStr);
        console.log('Parsed AI Analysis:', analysis);
        
        const validated = LLMAnalysisSchema.parse(analysis);
        console.log('Validated AI Analysis:', validated);

        return validated;
      } catch (e) {
        console.error('Project AI response parsing failed:', e, 'Response was:', response.text);
        return this.generateMockProjectLLMAnalysis(results, projectMetadata);
      }
    } catch (error) {
      console.error('Project LLM analysis failed:', error);
      return this.generateFallbackProjectLLMAnalysis(projectMetadata);
    }
  }

  private generateMockLLMAnalysis(code: string, metadata: ParseResult['metadata'], filePath: string): LLMAnalysis {
    const complexityScore = Math.min(100, metadata.functions.reduce((sum, func) => sum + func.complexity, 0) / Math.max(1, metadata.functions.length) * 10);
    
    return {
      summary: `Analysis of ${filePath} reveals a ${metadata.functions.length > 0 ? 'well-structured' : 'simple'} codebase with ${metadata.functions.length} functions and ${metadata.classes.length} classes.`,
      patterns: [
        {
          type: 'structure',
          name: 'Function Organization',
          line: 1,
          description: `File contains ${metadata.functions.length} functions with average complexity ${complexityScore.toFixed(1)}`,
          severity: complexityScore > 50 ? 'warning' : 'info',
        },
      ],
      recommendations: [
        'Consider adding more documentation to complex functions',
        'Review function complexity and consider refactoring if above 10',
      ],
      complexity: {
        score: complexityScore,
        factors: [
          `Average function complexity: ${complexityScore.toFixed(1)}`,
          `Total functions: ${metadata.functions.length}`,
          `Lines of code: ${metadata.linesOfCode}`,
        ],
      },
      architecture: {
        type: metadata.classes.length > 0 ? 'Object-oriented' : 'Procedural',
        patterns: metadata.classes.length > 0 ? ['Class-based design'] : ['Function-based design'],
        issues: complexityScore > 50 ? ['High complexity detected'] : [],
      },
      quality: {
        score: Math.max(0, 100 - complexityScore),
        issues: complexityScore > 50 ? ['Complex functions may need refactoring'] : [],
        strengths: [
          `Well-organized with ${metadata.imports.length} imports`,
          `${metadata.commentLines} lines of comments`,
        ],
      },
    };
  }

  private generateMockProjectLLMAnalysis(results: EnhancedParseResult[], projectMetadata: ProjectAnalysis['projectMetadata']): LLMAnalysis {
    const complexityScore = projectMetadata.complexity.average * 10;
    const languageCount = Object.keys(projectMetadata.languages).length;
    
    return {
      summary: `Project analysis shows ${projectMetadata.totalFiles} files across ${languageCount} languages with ${projectMetadata.totalFunctions} functions and ${projectMetadata.totalClasses} classes.`,
      patterns: [
        {
          type: 'project',
          name: 'Multi-language Support',
          line: 1,
          description: `Project uses ${languageCount} different programming languages`,
          severity: 'info',
        },
      ],
      recommendations: [
        'Consider standardizing coding patterns across languages',
        'Review dependency usage and consider consolidation',
      ],
      complexity: {
        score: complexityScore,
        factors: [
          `Average complexity: ${projectMetadata.complexity.average.toFixed(1)}`,
          `Total functions: ${projectMetadata.totalFunctions}`,
          `Total lines: ${projectMetadata.totalLines}`,
        ],
      },
      architecture: {
        type: projectMetadata.totalClasses > projectMetadata.totalFunctions / 2 ? 'Object-oriented' : 'Mixed',
        patterns: projectMetadata.totalClasses > 0 ? ['Class-based components'] : ['Function-based modules'],
        issues: complexityScore > 50 ? ['High average complexity'] : [],
      },
      quality: {
        score: Math.max(0, 100 - complexityScore),
        issues: complexityScore > 50 ? ['Consider refactoring complex functions'] : [],
        strengths: [
          `Multi-language support with ${languageCount} languages`,
          `${projectMetadata.totalFiles} files analyzed`,
        ],
      },
    };
  }

  private generateFallbackLLMAnalysis(metadata: ParseResult['metadata']): LLMAnalysis {
    return {
      summary: 'Basic code analysis completed',
      patterns: [],
      recommendations: ['Enable LLM mode for detailed analysis'],
      complexity: {
        score: 0,
        factors: ['LLM analysis not available'],
      },
      architecture: {
        type: 'Unknown',
        patterns: [],
        issues: ['LLM analysis disabled'],
      },
      quality: {
        score: 0,
        issues: ['LLM analysis not performed'],
        strengths: ['Basic parsing completed successfully'],
      },
    };
  }

  private generateFallbackProjectLLMAnalysis(projectMetadata: ProjectAnalysis['projectMetadata']): LLMAnalysis {
    return {
      summary: 'Project analysis completed with basic parsing',
      patterns: [],
      recommendations: ['Enable LLM mode for detailed project analysis'],
      complexity: {
        score: 0,
        factors: ['Project-level LLM analysis not available'],
      },
      architecture: {
        type: 'Unknown',
        patterns: [],
        issues: ['LLM analysis disabled'],
      },
      quality: {
        score: 0,
        issues: ['Project-level LLM analysis not performed'],
        strengths: [`${projectMetadata.totalFiles} files parsed successfully`],
      },
    };
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return this.parser.getSupportedLanguages();
  }

  isLanguageSupported(language: string): language is SupportedLanguage {
    return this.parser.isLanguageSupported(language);
  }
}

let unifiedParserService: UnifiedParserService | null = null;

export async function getUnifiedParser(): Promise<UnifiedParserService> {
  if (!unifiedParserService) {
    const { getTreeSitterParser } = await import('./treeSitterParser');
    const parser = await getTreeSitterParser();
    unifiedParserService = new UnifiedParserService(parser);
  }
  return unifiedParserService;
}
