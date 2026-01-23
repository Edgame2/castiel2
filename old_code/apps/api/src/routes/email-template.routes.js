/**
 * Email Template Routes
 * Route definitions for email template management
 */
import { requireAuth, requireSuperAdmin } from '../middleware/authorization.js';
export async function registerEmailTemplateRoutes(server) {
    const controller = server
        .emailTemplateController;
    if (!controller) {
        server.log.warn('⚠️  Email template routes not registered - controller missing');
        return;
    }
    if (!server.authenticate) {
        server.log.warn('⚠️  Email template routes not registered - authentication decorator missing');
        return;
    }
    // Create template
    server.post('/api/admin/email-templates', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.createTemplate(request, reply));
    // List templates
    server.get('/api/admin/email-templates', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.listTemplates(request, reply));
    // Get template by ID
    server.get('/api/admin/email-templates/:id', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.getTemplate(request, reply));
    // Get template by name and language
    server.get('/api/admin/email-templates/:name/:language', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.getTemplateByLanguage(request, reply));
    // Get all language variants
    server.get('/api/admin/email-templates/:name/languages', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.getTemplateLanguages(request, reply));
    // Update template
    server.patch('/api/admin/email-templates/:id', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.updateTemplate(request, reply));
    // Delete template
    server.delete('/api/admin/email-templates/:id', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.deleteTemplate(request, reply));
    // Test template rendering
    server.post('/api/admin/email-templates/:id/test', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.testTemplate(request, reply));
    // Update template status
    server.patch('/api/admin/email-templates/:id/status', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.updateTemplateStatus(request, reply));
    // Duplicate template to another language
    server.post('/api/admin/email-templates/:id/duplicate', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireSuperAdmin(),
        ],
    }, (request, reply) => controller.duplicateTemplate(request, reply));
    server.log.info('✅ Email template routes registered');
}
//# sourceMappingURL=email-template.routes.js.map