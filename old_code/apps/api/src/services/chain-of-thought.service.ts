/**
 * Chain-of-Thought Reasoning Service
 * Implements step-by-step reasoning for complex queries
 * Breaks down complex questions into logical steps for better accuracy
 */

import { IMonitoringProvider } from '@castiel/monitoring';

// ============================================
// Types
// ============================================

export interface ReasoningRequest {
  tenantId: string;
  query: string;
  context: string[];
  insightType?: string;
  maxSteps?: number;
  showReasoning?: boolean;
}

export interface ReasoningStep {
  stepNumber: number;
  type: StepType;
  description: string;
  input: string;
  output: string;
  confidence: number;
  timeMs: number;
}

export type StepType =
  | 'decompose'      // Break question into sub-questions
  | 'retrieve'       // Fetch relevant context
  | 'analyze'        // Analyze data/context
  | 'synthesize'     // Combine information
  | 'calculate'      // Perform calculations
  | 'compare'        // Compare entities
  | 'conclude'       // Draw conclusions
  | 'verify';        // Verify answer

export interface ReasoningChain {
  originalQuery: string;
  steps: ReasoningStep[];
  finalAnswer: string;
  totalSteps: number;
  totalTimeMs: number;
  overallConfidence: number;
  reasoning?: string;
}

export interface ReasoningConfig {
  maxSteps: number;
  minConfidence: number;
  enableVerification: boolean;
  showReasoning: boolean;
  parallelSteps: boolean;
}

const DEFAULT_CONFIG: ReasoningConfig = {
  maxSteps: 5,
  minConfidence: 0.7,
  enableVerification: true,
  showReasoning: true,
  parallelSteps: false,
};

// ============================================
// Prompt Templates
// ============================================

const DECOMPOSITION_PROMPT = `Break down the following complex question into simpler sub-questions that can be answered independently.

Question: {query}

Context available:
{context}

Instructions:
1. Identify the main components of the question
2. Create 2-4 sub-questions that together answer the main question
3. Order them logically (dependencies first)

Output format (JSON array):
[
  {"question": "sub-question 1", "type": "retrieve|analyze|calculate|compare"},
  {"question": "sub-question 2", "type": "retrieve|analyze|calculate|compare"}
]`;

const ANALYSIS_PROMPT = `Analyze the following information to answer the question.

Question: {question}

Information:
{context}

Instructions:
1. Focus only on information relevant to the question
2. Identify key facts and data points
3. Note any uncertainties or gaps

Provide your analysis in a structured format.`;

const SYNTHESIS_PROMPT = `Synthesize the following analyses into a coherent answer.

Original Question: {query}

Analyses:
{analyses}

Instructions:
1. Combine insights from all analyses
2. Resolve any contradictions
3. Form a complete, coherent answer
4. Rate your confidence (0-1)

Output format:
Answer: [your synthesized answer]
Confidence: [0-1]
Key points: [bullet points]`;

const VERIFICATION_PROMPT = `Verify the following answer against the provided context.

Question: {query}
Proposed Answer: {answer}

Context:
{context}

Instructions:
1. Check each claim in the answer against the context
2. Identify any unsupported claims
3. Rate the accuracy (0-1)
4. Suggest corrections if needed

Output format:
Verified: [true/false]
Accuracy: [0-1]
Issues: [list any issues]
Corrected Answer: [if needed]`;

// ============================================
// Service
// ============================================

export class ChainOfThoughtService {
  private config: ReasoningConfig;

  constructor(
    private readonly llmService: {
      complete: (prompt: string, options?: any) => Promise<string>;
    },
    private readonly monitoring: IMonitoringProvider,
    config?: Partial<ReasoningConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // Main Reasoning Method
  // ============================================

  /**
   * Execute chain-of-thought reasoning for a complex query
   */
  async reason(request: ReasoningRequest): Promise<ReasoningChain> {
    const startTime = Date.now();
    const steps: ReasoningStep[] = [];
    const maxSteps = request.maxSteps || this.config.maxSteps;

    try {
      // Step 1: Decompose the question
      const decomposition = await this.decompose(request.query, request.context);
      steps.push(decomposition);

      if (!decomposition.output) {
        return this.createSimpleResponse(request, steps, startTime);
      }

      // Parse sub-questions
      const subQuestions = this.parseSubQuestions(decomposition.output);

      // Step 2-N: Process each sub-question
      const analyses: string[] = [];
      for (let i = 0; i < Math.min(subQuestions.length, maxSteps - 2); i++) {
        const subQ = subQuestions[i];
        const analysisStep = await this.analyzeSubQuestion(
          subQ.question,
          subQ.type,
          request.context,
          steps.length + 1
        );
        steps.push(analysisStep);
        analyses.push(analysisStep.output);
      }

      // Synthesis step
      const synthesis = await this.synthesize(
        request.query,
        analyses,
        steps.length + 1
      );
      steps.push(synthesis);

      // Verification step (if enabled)
      let finalAnswer = synthesis.output;
      let overallConfidence = synthesis.confidence;

      if (this.config.enableVerification && steps.length < maxSteps) {
        const verification = await this.verify(
          request.query,
          synthesis.output,
          request.context,
          steps.length + 1
        );
        steps.push(verification);

        // Update if verification suggests corrections
        if (verification.output.includes('Corrected Answer:')) {
          const corrected = this.extractCorrectedAnswer(verification.output);
          if (corrected) {
            finalAnswer = corrected;
          }
        }
        overallConfidence = Math.min(overallConfidence, verification.confidence);
      }

      const totalTimeMs = Date.now() - startTime;

      // Build reasoning explanation
      const reasoning = request.showReasoning ?? this.config.showReasoning
        ? this.buildReasoningExplanation(steps)
        : undefined;

      this.monitoring.trackEvent('chain-of-thought.complete', {
        tenantId: request.tenantId,
        stepCount: steps.length,
        confidence: overallConfidence,
        timeMs: totalTimeMs,
      });

      return {
        originalQuery: request.query,
        steps,
        finalAnswer: this.cleanAnswer(finalAnswer),
        totalSteps: steps.length,
        totalTimeMs,
        overallConfidence,
        reasoning,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'chain-of-thought.reason',
        tenantId: request.tenantId,
      });

      return this.createErrorResponse(request, steps, startTime, error.message);
    }
  }

  // ============================================
  // Step Implementations
  // ============================================

  private async decompose(query: string, context: string[]): Promise<ReasoningStep> {
    const startTime = Date.now();
    const prompt = DECOMPOSITION_PROMPT
      .replace('{query}', query)
      .replace('{context}', context.slice(0, 5).join('\n\n'));

    try {
      const output = await this.llmService.complete(prompt, {
        temperature: 0.3,
        maxTokens: 500,
      });

      return {
        stepNumber: 1,
        type: 'decompose',
        description: 'Breaking down the question into sub-questions',
        input: query,
        output,
        confidence: 0.9,
        timeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        stepNumber: 1,
        type: 'decompose',
        description: 'Breaking down the question into sub-questions',
        input: query,
        output: '',
        confidence: 0,
        timeMs: Date.now() - startTime,
      };
    }
  }

  private async analyzeSubQuestion(
    question: string,
    type: string,
    context: string[],
    stepNumber: number
  ): Promise<ReasoningStep> {
    const startTime = Date.now();
    const stepType = this.mapQuestionType(type);

    const prompt = ANALYSIS_PROMPT
      .replace('{question}', question)
      .replace('{context}', context.slice(0, 10).join('\n\n'));

    try {
      const output = await this.llmService.complete(prompt, {
        temperature: 0.3,
        maxTokens: 800,
      });

      return {
        stepNumber,
        type: stepType,
        description: `Analyzing: ${question}`,
        input: question,
        output,
        confidence: 0.85,
        timeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        stepNumber,
        type: stepType,
        description: `Analyzing: ${question}`,
        input: question,
        output: `Unable to analyze: ${error.message}`,
        confidence: 0,
        timeMs: Date.now() - startTime,
      };
    }
  }

  private async synthesize(
    originalQuery: string,
    analyses: string[],
    stepNumber: number
  ): Promise<ReasoningStep> {
    const startTime = Date.now();

    const prompt = SYNTHESIS_PROMPT
      .replace('{query}', originalQuery)
      .replace('{analyses}', analyses.map((a, i) => `Analysis ${i + 1}:\n${a}`).join('\n\n'));

    try {
      const output = await this.llmService.complete(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      const confidence = this.extractConfidence(output);

      return {
        stepNumber,
        type: 'synthesize',
        description: 'Synthesizing analyses into final answer',
        input: `${analyses.length} analyses`,
        output,
        confidence,
        timeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        stepNumber,
        type: 'synthesize',
        description: 'Synthesizing analyses into final answer',
        input: `${analyses.length} analyses`,
        output: analyses.join('\n\n'),
        confidence: 0.5,
        timeMs: Date.now() - startTime,
      };
    }
  }

  private async verify(
    query: string,
    answer: string,
    context: string[],
    stepNumber: number
  ): Promise<ReasoningStep> {
    const startTime = Date.now();

    const prompt = VERIFICATION_PROMPT
      .replace('{query}', query)
      .replace('{answer}', answer)
      .replace('{context}', context.slice(0, 10).join('\n\n'));

    try {
      const output = await this.llmService.complete(prompt, {
        temperature: 0.2,
        maxTokens: 500,
      });

      const accuracy = this.extractAccuracy(output);

      return {
        stepNumber,
        type: 'verify',
        description: 'Verifying answer against context',
        input: answer.substring(0, 200),
        output,
        confidence: accuracy,
        timeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        stepNumber,
        type: 'verify',
        description: 'Verifying answer against context',
        input: answer.substring(0, 200),
        output: 'Verification skipped due to error',
        confidence: 0.7,
        timeMs: Date.now() - startTime,
      };
    }
  }

  // ============================================
  // Helpers
  // ============================================

  private parseSubQuestions(output: string): Array<{ question: string; type: string }> {
    try {
      // Try to extract JSON array
      const jsonMatch = output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback: extract questions from text
    }

    // Fallback: simple parsing
    const questions: Array<{ question: string; type: string }> = [];
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)/);
      if (match) {
        questions.push({ question: match[1], type: 'analyze' });
      }
    }

    return questions.length > 0 ? questions : [{ question: output, type: 'analyze' }];
  }

  private mapQuestionType(type: string): StepType {
    const mapping: Record<string, StepType> = {
      retrieve: 'retrieve',
      analyze: 'analyze',
      calculate: 'calculate',
      compare: 'compare',
    };
    return mapping[type.toLowerCase()] || 'analyze';
  }

  private extractConfidence(output: string): number {
    const match = output.match(/Confidence:\s*([\d.]+)/i);
    if (match) {
      return Math.min(1, Math.max(0, parseFloat(match[1])));
    }
    return 0.8;
  }

  private extractAccuracy(output: string): number {
    const match = output.match(/Accuracy:\s*([\d.]+)/i);
    if (match) {
      return Math.min(1, Math.max(0, parseFloat(match[1])));
    }
    return 0.8;
  }

  private extractCorrectedAnswer(output: string): string | null {
    const match = output.match(/Corrected Answer:\s*(.+?)(?=\n|$)/is);
    return match ? match[1].trim() : null;
  }

  private cleanAnswer(answer: string): string {
    // Extract just the answer part if in structured format
    const answerMatch = answer.match(/Answer:\s*(.+?)(?=\nConfidence:|$)/is);
    if (answerMatch) {
      return answerMatch[1].trim();
    }
    return answer.trim();
  }

  private buildReasoningExplanation(steps: ReasoningStep[]): string {
    const lines: string[] = ['## Reasoning Process\n'];

    for (const step of steps) {
      lines.push(`### Step ${step.stepNumber}: ${this.getStepTitle(step.type)}`);
      lines.push(`*${step.description}*\n`);
      
      if (step.type !== 'verify') {
        // Truncate long outputs
        const output = step.output.length > 500
          ? step.output.substring(0, 500) + '...'
          : step.output;
        lines.push(output);
      }
      
      lines.push(`\n*Confidence: ${(step.confidence * 100).toFixed(0)}% | Time: ${step.timeMs}ms*\n`);
    }

    return lines.join('\n');
  }

  private getStepTitle(type: StepType): string {
    const titles: Record<StepType, string> = {
      decompose: 'Question Decomposition',
      retrieve: 'Information Retrieval',
      analyze: 'Analysis',
      synthesize: 'Synthesis',
      calculate: 'Calculation',
      compare: 'Comparison',
      conclude: 'Conclusion',
      verify: 'Verification',
    };
    return titles[type] || type;
  }

  private createSimpleResponse(
    request: ReasoningRequest,
    steps: ReasoningStep[],
    startTime: number
  ): ReasoningChain {
    return {
      originalQuery: request.query,
      steps,
      finalAnswer: 'Unable to process the question. Please try rephrasing.',
      totalSteps: steps.length,
      totalTimeMs: Date.now() - startTime,
      overallConfidence: 0,
    };
  }

  private createErrorResponse(
    request: ReasoningRequest,
    steps: ReasoningStep[],
    startTime: number,
    error: string
  ): ReasoningChain {
    return {
      originalQuery: request.query,
      steps,
      finalAnswer: `An error occurred during reasoning: ${error}`,
      totalSteps: steps.length,
      totalTimeMs: Date.now() - startTime,
      overallConfidence: 0,
    };
  }
}

// ============================================
// Factory
// ============================================

export function createChainOfThoughtService(
  llmService: { complete: (prompt: string, options?: any) => Promise<string> },
  monitoring: IMonitoringProvider,
  config?: Partial<ReasoningConfig>
): ChainOfThoughtService {
  return new ChainOfThoughtService(llmService, monitoring, config);
}











