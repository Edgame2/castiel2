// @ts-nocheck
import Mustache from 'mustache';
import { IMonitoringProvider } from '@castiel/monitoring';
import { PromptTemplate } from '../../types/ai-insights/prompt.types.js';

export class PromptRendererService {
    constructor(private monitoring?: IMonitoringProvider) {}

    /**
     * Render a prompt template with variables
     */
    render(
        template: PromptTemplate,
        variables: Record<string, any>
    ): { systemPrompt: string; userPrompt: string } {
        // Validation: Check for missing variables defined in the template
        if (template.variables) {
            const missingVars = template.variables.filter(
                (v) => variables[v] === undefined || variables[v] === null
            );

            if (missingVars.length > 0) {
                // Warning only - we might want to strict fail in production depending on config
                this.monitoring?.trackEvent('prompt-renderer.missing-variables', { 
                    missingVars: missingVars.join(', '),
                    templateId: template.id 
                });
            }
        }

        // Render System Prompt - disable HTML escaping
        const systemPrompt = template.systemPrompt
            ? Mustache.render(template.systemPrompt, variables, {}, { escape: (text) => text })
            : '';

        // Render User Prompt - disable HTML escaping
        const userPrompt = template.userPrompt
            ? Mustache.render(template.userPrompt, variables, {}, { escape: (text) => text })
            : '';

        return { systemPrompt, userPrompt };
    }

    /**
     * Validate a template string and extract variables
     * Useful for checking validity during creation/update
     */
    validateTemplate(templateString: string): { valid: boolean; variables: string[] } {
        try {
            const tokens = Mustache.parse(templateString);
            const variables = tokens
                .filter((token) => token[0] === 'name' || token[0] === '#')
                .map((token) => token[1]);

            return {
                valid: true,
                variables: Array.from(new Set(variables)) // Deduplicate
            };
        } catch (error) {
            return { valid: false, variables: [] };
        }
    }
}
