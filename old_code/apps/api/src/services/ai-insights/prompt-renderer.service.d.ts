import { IMonitoringProvider } from '@castiel/monitoring';
import { PromptTemplate } from '../../types/ai-insights/prompt.types.js';
export declare class PromptRendererService {
    private monitoring?;
    constructor(monitoring?: IMonitoringProvider | undefined);
    /**
     * Render a prompt template with variables
     */
    render(template: PromptTemplate, variables: Record<string, any>): {
        systemPrompt: string;
        userPrompt: string;
    };
    /**
     * Validate a template string and extract variables
     * Useful for checking validity during creation/update
     */
    validateTemplate(templateString: string): {
        valid: boolean;
        variables: string[];
    };
}
//# sourceMappingURL=prompt-renderer.service.d.ts.map