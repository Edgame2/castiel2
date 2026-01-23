/**
 * Insight Templates Library Service
 * Pre-built and customizable templates for common insight use cases
 */
import { v4 as uuid } from 'uuid';
// ============================================
// Built-in Templates
// ============================================
const SYSTEM_TEMPLATES = [
    // Sales Templates
    {
        name: 'deal_analysis',
        displayName: 'Deal Analysis',
        description: 'Comprehensive analysis of a sales opportunity including risks, recommendations, and next steps',
        category: 'sales',
        type: 'system',
        isPublic: true,
        promptTemplate: `Analyze this sales opportunity and provide insights:

Deal: {{deal_name}}
Stage: {{deal_stage}}
Value: {{deal_value}}

Context:
{{context}}

Provide:
1. Deal Health Assessment (score 1-10)
2. Key Strengths
3. Risk Factors
4. Competitive Position
5. Recommended Next Steps
6. Win Probability Estimate`,
        outputFormat: 'markdown',
        config: {
            modelPreference: 'standard',
            responseLength: 'detailed',
            includeReferences: true,
            includeSuggestions: true,
        },
        variables: [
            { name: 'deal_name', label: 'Deal Name', type: 'text', required: true },
            { name: 'deal_stage', label: 'Current Stage', type: 'select', required: true, options: [
                    { value: 'prospecting', label: 'Prospecting' },
                    { value: 'qualification', label: 'Qualification' },
                    { value: 'proposal', label: 'Proposal' },
                    { value: 'negotiation', label: 'Negotiation' },
                    { value: 'closing', label: 'Closing' },
                ] },
            { name: 'deal_value', label: 'Deal Value', type: 'text', required: false },
        ],
        requirements: {
            shardTypes: ['c_opportunity', 'c_contact', 'c_company'],
        },
        tags: ['sales', 'deals', 'analysis'],
        tenantId: undefined,
        createdBy: 'system',
    },
    {
        name: 'pipeline_summary',
        displayName: 'Pipeline Summary',
        description: 'Weekly summary of sales pipeline with trends and action items',
        category: 'sales',
        type: 'system',
        isPublic: true,
        promptTemplate: `Generate a pipeline summary for {{time_period}}:

Pipeline Data:
{{context}}

Include:
1. Total Pipeline Value
2. Stage Distribution
3. Week-over-Week Changes
4. Deals Closing Soon
5. Stalled Deals
6. Top Action Items`,
        outputFormat: 'markdown',
        config: {
            modelPreference: 'standard',
            responseLength: 'standard',
        },
        variables: [
            { name: 'time_period', label: 'Time Period', type: 'select', required: true, options: [
                    { value: 'this_week', label: 'This Week' },
                    { value: 'this_month', label: 'This Month' },
                    { value: 'this_quarter', label: 'This Quarter' },
                ] },
        ],
        requirements: {
            shardTypes: ['c_opportunity'],
            minShards: 5,
        },
        tags: ['sales', 'pipeline', 'summary'],
        tenantId: undefined,
        createdBy: 'system',
    },
    // Customer Success Templates
    {
        name: 'account_health',
        displayName: 'Account Health Check',
        description: 'Analyze customer account health with risk indicators and expansion opportunities',
        category: 'customer_success',
        type: 'system',
        isPublic: true,
        promptTemplate: `Analyze the health of this customer account:

Account: {{account_name}}

Context:
{{context}}

Provide:
1. Health Score (1-100)
2. Engagement Metrics Summary
3. Risk Indicators
4. Expansion Opportunities
5. Recommended Actions
6. 90-Day Outlook`,
        outputFormat: 'markdown',
        config: {
            modelPreference: 'standard',
            responseLength: 'detailed',
            includeReferences: true,
        },
        variables: [
            { name: 'account_name', label: 'Account Name', type: 'text', required: true },
        ],
        requirements: {
            shardTypes: ['c_company', 'c_contact', 'c_activity'],
        },
        tags: ['customer_success', 'accounts', 'health'],
        tenantId: undefined,
        createdBy: 'system',
    },
    {
        name: 'churn_risk',
        displayName: 'Churn Risk Analysis',
        description: 'Identify accounts at risk of churning with early warning signs',
        category: 'customer_success',
        type: 'system',
        isPublic: true,
        promptTemplate: `Analyze churn risk for accounts:

{{context}}

For each at-risk account, provide:
1. Account Name
2. Risk Level (High/Medium/Low)
3. Warning Signs
4. Days Since Last Engagement
5. Recommended Intervention
6. Urgency (1-5)

Format as a prioritized list starting with highest risk.`,
        outputFormat: 'table',
        config: {
            modelPreference: 'premium',
            responseLength: 'detailed',
        },
        variables: [],
        requirements: {
            shardTypes: ['c_company', 'c_activity'],
            minShards: 10,
        },
        tags: ['customer_success', 'churn', 'risk'],
        tenantId: undefined,
        createdBy: 'system',
    },
    // Marketing Templates
    {
        name: 'campaign_analysis',
        displayName: 'Campaign Performance Analysis',
        description: 'Analyze marketing campaign performance with recommendations',
        category: 'marketing',
        type: 'system',
        isPublic: true,
        promptTemplate: `Analyze marketing campaign performance:

Campaign: {{campaign_name}}
Period: {{time_period}}

Context:
{{context}}

Provide:
1. Performance Summary
2. Key Metrics vs Benchmarks
3. Best Performing Elements
4. Areas for Improvement
5. A/B Test Insights
6. Optimization Recommendations`,
        outputFormat: 'markdown',
        config: {
            modelPreference: 'standard',
            responseLength: 'detailed',
        },
        variables: [
            { name: 'campaign_name', label: 'Campaign Name', type: 'text', required: true },
            { name: 'time_period', label: 'Analysis Period', type: 'text', required: false, default: 'Last 30 days' },
        ],
        requirements: {},
        tags: ['marketing', 'campaigns', 'analysis'],
        tenantId: undefined,
        createdBy: 'system',
    },
    // General Templates
    {
        name: 'executive_summary',
        displayName: 'Executive Summary',
        description: 'Generate an executive summary of any topic or data set',
        category: 'general',
        type: 'system',
        isPublic: true,
        promptTemplate: `Generate an executive summary on: {{topic}}

Context:
{{context}}

Include:
1. Key Highlights (3-5 bullets)
2. Important Metrics
3. Trends & Patterns
4. Risks & Concerns
5. Recommendations
6. Next Steps

Keep it concise and actionable for executive review.`,
        outputFormat: 'markdown',
        config: {
            modelPreference: 'premium',
            responseLength: 'brief',
        },
        variables: [
            { name: 'topic', label: 'Summary Topic', type: 'text', required: true, placeholder: 'e.g., Q3 Performance' },
        ],
        requirements: {},
        tags: ['general', 'executive', 'summary'],
        tenantId: undefined,
        createdBy: 'system',
    },
    {
        name: 'competitive_analysis',
        displayName: 'Competitive Analysis',
        description: 'Analyze competitive landscape and positioning',
        category: 'general',
        type: 'system',
        isPublic: true,
        promptTemplate: `Analyze competitive positioning:

Our Company: {{company_name}}
Competitors: {{competitors}}

Context:
{{context}}

Provide:
1. Market Position Overview
2. Strengths vs Competition
3. Weaknesses to Address
4. Competitive Threats
5. Opportunities
6. Strategic Recommendations`,
        outputFormat: 'markdown',
        config: {
            modelPreference: 'premium',
            responseLength: 'detailed',
            includeReferences: true,
        },
        variables: [
            { name: 'company_name', label: 'Company Name', type: 'text', required: true },
            { name: 'competitors', label: 'Competitors', type: 'text', required: false, placeholder: 'Comma-separated list' },
        ],
        requirements: {
            features: ['web_search'],
        },
        tags: ['general', 'competitive', 'strategy'],
        tenantId: undefined,
        createdBy: 'system',
    },
    {
        name: 'meeting_prep',
        displayName: 'Meeting Preparation',
        description: 'Prepare for a meeting with comprehensive briefing',
        category: 'general',
        type: 'system',
        isPublic: true,
        promptTemplate: `Prepare a briefing for meeting with {{contact_name}} from {{company_name}}:

Meeting Purpose: {{meeting_purpose}}

Context:
{{context}}

Include:
1. Contact Background
2. Company Overview
3. Recent Interactions
4. Open Opportunities/Issues
5. Key Talking Points
6. Questions to Ask
7. Potential Objections & Responses`,
        outputFormat: 'markdown',
        config: {
            modelPreference: 'standard',
            responseLength: 'detailed',
        },
        variables: [
            { name: 'contact_name', label: 'Contact Name', type: 'text', required: true },
            { name: 'company_name', label: 'Company', type: 'text', required: true },
            { name: 'meeting_purpose', label: 'Meeting Purpose', type: 'text', required: false },
        ],
        requirements: {
            shardTypes: ['c_contact', 'c_company', 'c_activity'],
        },
        tags: ['general', 'meetings', 'preparation'],
        tenantId: undefined,
        createdBy: 'system',
    },
];
// ============================================
// Service
// ============================================
export class InsightTemplatesService {
    redis;
    monitoring;
    TEMPLATES_KEY = 'insight:templates:';
    USAGE_KEY = 'insight:templates:usage:';
    systemTemplatesLoaded = false;
    constructor(redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
    }
    // ============================================
    // Template Management
    // ============================================
    /**
     * Initialize system templates
     */
    async initializeSystemTemplates() {
        if (this.systemTemplatesLoaded) {
            return;
        }
        for (const template of SYSTEM_TEMPLATES) {
            const existing = await this.getTemplateByName(template.name, 'system');
            if (!existing) {
                const fullTemplate = {
                    ...template,
                    id: `tpl_${uuid()}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    usageCount: 0,
                    rating: 0,
                    ratingCount: 0,
                };
                await this.saveTemplate(fullTemplate);
            }
        }
        this.systemTemplatesLoaded = true;
    }
    /**
     * Create a custom template
     */
    async createTemplate(tenantId, userId, template) {
        const newTemplate = {
            ...template,
            id: `tpl_${uuid()}`,
            type: 'custom',
            tenantId,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            usageCount: 0,
            rating: 0,
            ratingCount: 0,
        };
        await this.saveTemplate(newTemplate);
        this.monitoring.trackEvent('template.created', {
            tenantId,
            templateId: newTemplate.id,
            category: newTemplate.category,
        });
        return newTemplate;
    }
    /**
     * Update a template
     */
    async updateTemplate(templateId, tenantId, updates) {
        const template = await this.getTemplate(templateId, tenantId);
        if (!template) {
            return null;
        }
        // Can't update system templates
        if (template.type === 'system') {
            throw new Error('Cannot modify system templates');
        }
        const updated = {
            ...template,
            ...updates,
            id: template.id,
            type: template.type,
            tenantId: template.tenantId,
            createdBy: template.createdBy,
            createdAt: template.createdAt,
            updatedAt: new Date(),
        };
        await this.saveTemplate(updated);
        return updated;
    }
    /**
     * Delete a template
     */
    async deleteTemplate(templateId, tenantId) {
        const template = await this.getTemplate(templateId, tenantId);
        if (!template || template.type === 'system') {
            return false;
        }
        const key = this.getTemplateKey(templateId, tenantId);
        await this.redis.del(key);
        return true;
    }
    /**
     * Get template by ID
     */
    async getTemplate(templateId, tenantId) {
        // Try tenant-specific first
        let key = this.getTemplateKey(templateId, tenantId);
        let data = await this.redis.get(key);
        if (!data) {
            // Try system templates
            key = this.getTemplateKey(templateId, 'system');
            data = await this.redis.get(key);
        }
        return data ? JSON.parse(data) : null;
    }
    /**
     * Get template by name
     */
    async getTemplateByName(name, tenantId) {
        const templates = await this.listTemplates(tenantId);
        return templates.find(t => t.name === name) || null;
    }
    /**
     * List templates
     */
    async listTemplates(tenantId, options) {
        await this.initializeSystemTemplates();
        const templates = [];
        // Get system templates
        const systemPattern = `${this.TEMPLATES_KEY}system:*`;
        const systemKeys = await this.redis.keys(systemPattern);
        for (const key of systemKeys) {
            const data = await this.redis.get(key);
            if (data) {
                templates.push(JSON.parse(data));
            }
        }
        // Get tenant templates
        const tenantPattern = `${this.TEMPLATES_KEY}${tenantId}:*`;
        const tenantKeys = await this.redis.keys(tenantPattern);
        for (const key of tenantKeys) {
            const data = await this.redis.get(key);
            if (data) {
                templates.push(JSON.parse(data));
            }
        }
        // Apply filters
        let filtered = templates;
        if (options?.category) {
            filtered = filtered.filter(t => t.category === options.category);
        }
        if (options?.type) {
            filtered = filtered.filter(t => t.type === options.type);
        }
        if (options?.search) {
            const search = options.search.toLowerCase();
            filtered = filtered.filter(t => t.name.toLowerCase().includes(search) ||
                t.displayName.toLowerCase().includes(search) ||
                t.description.toLowerCase().includes(search) ||
                t.tags.some(tag => tag.toLowerCase().includes(search)));
        }
        // Sort by usage count (most popular first)
        return filtered.sort((a, b) => b.usageCount - a.usageCount);
    }
    /**
     * Get templates by category
     */
    async getTemplatesByCategory(tenantId) {
        const templates = await this.listTemplates(tenantId);
        const grouped = {};
        for (const template of templates) {
            if (!grouped[template.category]) {
                grouped[template.category] = [];
            }
            grouped[template.category].push(template);
        }
        return grouped;
    }
    // ============================================
    // Template Execution
    // ============================================
    /**
     * Build the final prompt from a template
     */
    async buildPrompt(templateId, tenantId, variables, context) {
        const template = await this.getTemplate(templateId, tenantId);
        if (!template) {
            throw new Error('Template not found');
        }
        // Validate required variables
        for (const variable of template.variables) {
            if (variable.required && !(variable.name in variables)) {
                throw new Error(`Missing required variable: ${variable.label}`);
            }
        }
        // Import sanitization utility
        const { sanitizeUserInput } = await import('../utils/input-sanitization.js');
        // Replace variables in template
        let prompt = template.promptTemplate;
        for (const [name, value] of Object.entries(variables)) {
            const placeholder = `{{${name}}}`;
            // Sanitize user query if it's a query-related variable
            const sanitizedValue = (name.toLowerCase().includes('query') || name.toLowerCase().includes('question'))
                ? sanitizeUserInput(String(value))
                : String(value);
            prompt = prompt.replace(new RegExp(placeholder, 'g'), sanitizedValue);
        }
        // Replace context placeholder
        prompt = prompt.replace('{{context}}', context);
        // Track usage
        await this.recordUsage(templateId, tenantId);
        return prompt;
    }
    /**
     * Clone a template for customization
     */
    async cloneTemplate(templateId, tenantId, userId, newName) {
        const original = await this.getTemplate(templateId, tenantId);
        if (!original) {
            throw new Error('Template not found');
        }
        return this.createTemplate(tenantId, userId, {
            ...original,
            name: newName,
            displayName: `${original.displayName} (Copy)`,
            isPublic: false,
        });
    }
    // ============================================
    // Ratings & Feedback
    // ============================================
    /**
     * Rate a template
     */
    async rateTemplate(templateId, tenantId, rating) {
        const template = await this.getTemplate(templateId, tenantId);
        if (!template) {
            return;
        }
        const newRatingCount = template.ratingCount + 1;
        const newRating = ((template.rating * template.ratingCount) + rating) / newRatingCount;
        await this.updateTemplate(templateId, template.tenantId || 'system', {
            rating: Math.round(newRating * 10) / 10,
            ratingCount: newRatingCount,
        });
    }
    // ============================================
    // Private Methods
    // ============================================
    async saveTemplate(template) {
        const key = this.getTemplateKey(template.id, template.tenantId || 'system');
        await this.redis.set(key, JSON.stringify(template));
    }
    async recordUsage(templateId, tenantId) {
        const template = await this.getTemplate(templateId, tenantId);
        if (!template) {
            return;
        }
        // Update usage count
        const key = this.getTemplateKey(template.id, template.tenantId || 'system');
        const data = await this.redis.get(key);
        if (data) {
            const updated = JSON.parse(data);
            updated.usageCount++;
            await this.redis.set(key, JSON.stringify(updated));
        }
        // Track in analytics
        const usageKey = `${this.USAGE_KEY}${templateId}:${new Date().toISOString().split('T')[0]}`;
        await this.redis.incr(usageKey);
        await this.redis.expire(usageKey, 90 * 24 * 60 * 60); // 90 days
        this.monitoring.trackEvent('template.used', {
            tenantId,
            templateId,
        });
    }
    getTemplateKey(templateId, tenantId) {
        return `${this.TEMPLATES_KEY}${tenantId}:${templateId}`;
    }
}
// ============================================
// Factory
// ============================================
export function createInsightTemplatesService(redis, monitoring) {
    return new InsightTemplatesService(redis, monitoring);
}
//# sourceMappingURL=insight-templates.service.js.map