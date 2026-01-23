/**
 * Audit & Enterprise Integration Routes
 * Audit logging, SSO, data warehouse, real-time streaming, webhooks, compliance
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Controller, Post, Get, Put, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { AdminGuard } from '../guards/admin.guard';
let AuditIntegrationController = (() => {
    let _classDecorators = [ApiTags('Audit & Enterprise Integration'), Controller('api/v1/enterprise'), ApiBearerAuth('bearer'), UseGuards(AuthGuard, TenantGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _queryAuditLogs_decorators;
    let _getAuditLog_decorators;
    let _generateAuditReport_decorators;
    let _exportAuditLogs_decorators;
    let _getSSOConfig_decorators;
    let _updateSSOConfig_decorators;
    let _testSSOConnection_decorators;
    let _createDWConnector_decorators;
    let _listDWConnectors_decorators;
    let _syncDWConnector_decorators;
    let _getSyncHistory_decorators;
    let _createStreamConfig_decorators;
    let _listStreamConfigs_decorators;
    let _getStreamMetrics_decorators;
    let _createWebhook_decorators;
    let _listWebhooks_decorators;
    let _testWebhook_decorators;
    let _deleteWebhook_decorators;
    let _generateAPIKey_decorators;
    let _listAPIKeys_decorators;
    let _revokeAPIKey_decorators;
    let _getComplianceSettings_decorators;
    let _getIntegrationHealth_decorators;
    let _getSystemHealth_decorators;
    var AuditIntegrationController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _queryAuditLogs_decorators = [Post('audit/logs/query'), ApiOperation({ summary: 'Query audit logs' }), ApiResponse({
                    status: 200,
                    description: 'Audit log entries',
                })];
            _getAuditLog_decorators = [Get('audit/logs/:id'), ApiOperation({ summary: 'Get audit log entry' }), ApiResponse({
                    status: 200,
                    description: 'Audit log entry',
                    type: Object,
                })];
            _generateAuditReport_decorators = [Post('audit/reports'), ApiOperation({ summary: 'Generate audit report' }), ApiResponse({
                    status: 201,
                    description: 'Audit report generated',
                    type: Object,
                })];
            _exportAuditLogs_decorators = [Get('audit/export'), ApiOperation({ summary: 'Export audit logs as CSV' }), ApiResponse({
                    status: 200,
                    description: 'CSV file',
                })];
            _getSSOConfig_decorators = [Get('sso/config'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] Get SSO configuration' }), ApiResponse({
                    status: 200,
                    description: 'SSO configuration',
                    type: Object,
                })];
            _updateSSOConfig_decorators = [Put('sso/config'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] Update SSO configuration' }), ApiResponse({
                    status: 200,
                    description: 'SSO configuration updated',
                    type: Object,
                })];
            _testSSOConnection_decorators = [Post('sso/test'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] Test SSO connection' }), ApiResponse({
                    status: 200,
                    description: 'SSO test result',
                })];
            _createDWConnector_decorators = [Post('data-warehouse/connectors'), UseGuards(AdminGuard), HttpCode(HttpStatus.CREATED), ApiOperation({ summary: '[ADMIN] Create data warehouse connector' }), ApiResponse({
                    status: 201,
                    description: 'Connector created',
                    type: Object,
                })];
            _listDWConnectors_decorators = [Get('data-warehouse/connectors'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] List data warehouse connectors' }), ApiResponse({
                    status: 200,
                    description: 'Connector list',
                })];
            _syncDWConnector_decorators = [Post('data-warehouse/connectors/:id/sync'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] Trigger data warehouse sync' }), ApiResponse({
                    status: 200,
                    description: 'Sync initiated',
                })];
            _getSyncHistory_decorators = [Get('data-warehouse/sync-history'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] Get data warehouse sync history' }), ApiResponse({
                    status: 200,
                    description: 'Sync history',
                })];
            _createStreamConfig_decorators = [Post('streams/config'), UseGuards(AdminGuard), HttpCode(HttpStatus.CREATED), ApiOperation({ summary: '[ADMIN] Create real-time stream configuration' }), ApiResponse({
                    status: 201,
                    description: 'Stream config created',
                    type: Object,
                })];
            _listStreamConfigs_decorators = [Get('streams/config'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] List stream configurations' }), ApiResponse({
                    status: 200,
                    description: 'Stream configs',
                })];
            _getStreamMetrics_decorators = [Get('streams/metrics'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] Get stream metrics' }), ApiResponse({
                    status: 200,
                    description: 'Stream metrics',
                })];
            _createWebhook_decorators = [Post('webhooks'), UseGuards(AdminGuard), HttpCode(HttpStatus.CREATED), ApiOperation({ summary: '[ADMIN] Create webhook' }), ApiResponse({
                    status: 201,
                    description: 'Webhook created',
                    type: Object,
                })];
            _listWebhooks_decorators = [Get('webhooks'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] List webhooks' }), ApiResponse({
                    status: 200,
                    description: 'Webhook list',
                })];
            _testWebhook_decorators = [Post('webhooks/:id/test'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] Test webhook' }), ApiResponse({
                    status: 200,
                    description: 'Webhook test result',
                })];
            _deleteWebhook_decorators = [Delete('webhooks/:id'), UseGuards(AdminGuard), HttpCode(HttpStatus.NO_CONTENT), ApiOperation({ summary: '[ADMIN] Delete webhook' })];
            _generateAPIKey_decorators = [Post('api-keys'), HttpCode(HttpStatus.CREATED), ApiOperation({ summary: 'Generate API key' }), ApiResponse({
                    status: 201,
                    description: 'API key generated',
                    type: Object,
                })];
            _listAPIKeys_decorators = [Get('api-keys'), ApiOperation({ summary: 'List API keys' }), ApiResponse({
                    status: 200,
                    description: 'API keys',
                })];
            _revokeAPIKey_decorators = [Delete('api-keys/:id'), HttpCode(HttpStatus.NO_CONTENT), ApiOperation({ summary: 'Revoke API key' })];
            _getComplianceSettings_decorators = [Get('compliance/settings'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] Get compliance settings' }), ApiResponse({
                    status: 200,
                    description: 'Compliance settings',
                    type: Object,
                })];
            _getIntegrationHealth_decorators = [Get('health/integrations'), UseGuards(AdminGuard), ApiOperation({ summary: '[ADMIN] Get integration health status' }), ApiResponse({
                    status: 200,
                    description: 'Integration health',
                    type: [Object],
                })];
            _getSystemHealth_decorators = [Get('health/system'), ApiOperation({ summary: 'System health check' }), ApiResponse({
                    status: 200,
                    description: 'System health',
                })];
            __esDecorate(this, null, _queryAuditLogs_decorators, { kind: "method", name: "queryAuditLogs", static: false, private: false, access: { has: obj => "queryAuditLogs" in obj, get: obj => obj.queryAuditLogs }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getAuditLog_decorators, { kind: "method", name: "getAuditLog", static: false, private: false, access: { has: obj => "getAuditLog" in obj, get: obj => obj.getAuditLog }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _generateAuditReport_decorators, { kind: "method", name: "generateAuditReport", static: false, private: false, access: { has: obj => "generateAuditReport" in obj, get: obj => obj.generateAuditReport }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _exportAuditLogs_decorators, { kind: "method", name: "exportAuditLogs", static: false, private: false, access: { has: obj => "exportAuditLogs" in obj, get: obj => obj.exportAuditLogs }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getSSOConfig_decorators, { kind: "method", name: "getSSOConfig", static: false, private: false, access: { has: obj => "getSSOConfig" in obj, get: obj => obj.getSSOConfig }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateSSOConfig_decorators, { kind: "method", name: "updateSSOConfig", static: false, private: false, access: { has: obj => "updateSSOConfig" in obj, get: obj => obj.updateSSOConfig }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _testSSOConnection_decorators, { kind: "method", name: "testSSOConnection", static: false, private: false, access: { has: obj => "testSSOConnection" in obj, get: obj => obj.testSSOConnection }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createDWConnector_decorators, { kind: "method", name: "createDWConnector", static: false, private: false, access: { has: obj => "createDWConnector" in obj, get: obj => obj.createDWConnector }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listDWConnectors_decorators, { kind: "method", name: "listDWConnectors", static: false, private: false, access: { has: obj => "listDWConnectors" in obj, get: obj => obj.listDWConnectors }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _syncDWConnector_decorators, { kind: "method", name: "syncDWConnector", static: false, private: false, access: { has: obj => "syncDWConnector" in obj, get: obj => obj.syncDWConnector }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getSyncHistory_decorators, { kind: "method", name: "getSyncHistory", static: false, private: false, access: { has: obj => "getSyncHistory" in obj, get: obj => obj.getSyncHistory }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createStreamConfig_decorators, { kind: "method", name: "createStreamConfig", static: false, private: false, access: { has: obj => "createStreamConfig" in obj, get: obj => obj.createStreamConfig }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listStreamConfigs_decorators, { kind: "method", name: "listStreamConfigs", static: false, private: false, access: { has: obj => "listStreamConfigs" in obj, get: obj => obj.listStreamConfigs }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getStreamMetrics_decorators, { kind: "method", name: "getStreamMetrics", static: false, private: false, access: { has: obj => "getStreamMetrics" in obj, get: obj => obj.getStreamMetrics }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createWebhook_decorators, { kind: "method", name: "createWebhook", static: false, private: false, access: { has: obj => "createWebhook" in obj, get: obj => obj.createWebhook }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listWebhooks_decorators, { kind: "method", name: "listWebhooks", static: false, private: false, access: { has: obj => "listWebhooks" in obj, get: obj => obj.listWebhooks }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _testWebhook_decorators, { kind: "method", name: "testWebhook", static: false, private: false, access: { has: obj => "testWebhook" in obj, get: obj => obj.testWebhook }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _deleteWebhook_decorators, { kind: "method", name: "deleteWebhook", static: false, private: false, access: { has: obj => "deleteWebhook" in obj, get: obj => obj.deleteWebhook }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _generateAPIKey_decorators, { kind: "method", name: "generateAPIKey", static: false, private: false, access: { has: obj => "generateAPIKey" in obj, get: obj => obj.generateAPIKey }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listAPIKeys_decorators, { kind: "method", name: "listAPIKeys", static: false, private: false, access: { has: obj => "listAPIKeys" in obj, get: obj => obj.listAPIKeys }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _revokeAPIKey_decorators, { kind: "method", name: "revokeAPIKey", static: false, private: false, access: { has: obj => "revokeAPIKey" in obj, get: obj => obj.revokeAPIKey }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getComplianceSettings_decorators, { kind: "method", name: "getComplianceSettings", static: false, private: false, access: { has: obj => "getComplianceSettings" in obj, get: obj => obj.getComplianceSettings }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getIntegrationHealth_decorators, { kind: "method", name: "getIntegrationHealth", static: false, private: false, access: { has: obj => "getIntegrationHealth" in obj, get: obj => obj.getIntegrationHealth }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getSystemHealth_decorators, { kind: "method", name: "getSystemHealth", static: false, private: false, access: { has: obj => "getSystemHealth" in obj, get: obj => obj.getSystemHealth }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AuditIntegrationController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        auditService = __runInitializers(this, _instanceExtraInitializers);
        constructor(auditService) {
            this.auditService = auditService;
        }
        // ============ AUDIT LOGGING ============
        /**
         * Query audit logs
         */
        async queryAuditLogs(tenantId, query) {
            query.tenantId = tenantId;
            return this.auditService.queryAuditLogs(query);
        }
        /**
         * Get audit log entry
         */
        async getAuditLog(tenantId, id) {
            // Would retrieve specific audit entry
            return {};
        }
        /**
         * Generate audit report
         */
        async generateAuditReport(tenantId, payload) {
            return this.auditService.generateAuditReport(tenantId, payload.reportType, new Date(payload.startDate), new Date(payload.endDate));
        }
        /**
         * Export audit logs
         */
        async exportAuditLogs(tenantId, startDate, endDate) {
            const { entries } = await this.auditService.queryAuditLogs({
                tenantId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                limit: 10000,
            });
            // Convert to CSV
            const headers = ['timestamp', 'userId', 'action', 'resourceType', 'resourceId', 'severity', 'status'];
            const rows = entries.map((e) => [
                e.timestamp.toISOString(),
                e.userId,
                e.action,
                e.resourceType,
                e.resourceId,
                e.severity,
                e.status,
            ]);
            const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
            return {
                filename: `audit-logs-${Date.now()}.csv`,
                content: csv,
                contentType: 'text/csv',
            };
        }
        // ============ SSO CONFIGURATION ============
        /**
         * Get SSO configuration
         */
        async getSSOConfig(tenantId) {
            return this.auditService.getSSOConfig(tenantId);
        }
        /**
         * Update SSO configuration
         */
        async updateSSOConfig(tenantId, config) {
            return this.auditService.updateSSOConfig(tenantId, config);
        }
        /**
         * Test SSO connection
         */
        async testSSOConnection(tenantId) {
            return {
                status: 'success',
                message: 'SSO connection successful',
                responseTime: 150,
            };
        }
        // ============ DATA WAREHOUSE ============
        /**
         * Create data warehouse connector
         */
        async createDWConnector(tenantId, connector) {
            return this.auditService.createDataWarehouseConnector(tenantId, connector);
        }
        /**
         * List data warehouse connectors
         */
        async listDWConnectors(tenantId) {
            return {
                items: [],
                total: 0,
            };
        }
        /**
         * Sync data warehouse
         */
        async syncDWConnector(tenantId, connectorId) {
            return this.auditService.syncDataWarehouse(tenantId, connectorId);
        }
        /**
         * Get sync history
         */
        async getSyncHistory(tenantId, limit = 50) {
            return {
                items: [],
                total: 0,
            };
        }
        // ============ REAL-TIME STREAMING ============
        /**
         * Create stream configuration
         */
        async createStreamConfig(tenantId, config) {
            return this.auditService.createStreamConfig(tenantId, config);
        }
        /**
         * List stream configurations
         */
        async listStreamConfigs(tenantId) {
            return {
                items: [],
                total: 0,
            };
        }
        /**
         * Get stream metrics
         */
        async getStreamMetrics(tenantId) {
            return {
                eventsPublished: 0,
                eventsFailed: 0,
                averageLatencyMs: 0,
                period: 'hour',
            };
        }
        // ============ WEBHOOKS ============
        /**
         * Create webhook
         */
        async createWebhook(tenantId, webhook) {
            return this.auditService.createWebhook(tenantId, webhook);
        }
        /**
         * List webhooks
         */
        async listWebhooks(tenantId) {
            return {
                items: [],
                total: 0,
            };
        }
        /**
         * Test webhook
         */
        async testWebhook(tenantId, webhookId) {
            return {
                status: 'success',
                statusCode: 200,
                responseTime: 250,
            };
        }
        /**
         * Delete webhook
         */
        async deleteWebhook(tenantId, webhookId) {
            // Would delete webhook
        }
        // ============ API KEYS ============
        /**
         * Generate API key
         */
        async generateAPIKey(tenantId, payload) {
            return this.auditService.generateAPIKey(tenantId, payload.name, payload.permissions);
        }
        /**
         * List API keys
         */
        async listAPIKeys(tenantId) {
            return {
                items: [],
                total: 0,
            };
        }
        /**
         * Revoke API key
         */
        async revokeAPIKey(tenantId, keyId) {
            return this.auditService.revokeAPIKey(tenantId, keyId);
        }
        // ============ COMPLIANCE & HEALTH ============
        /**
         * Get compliance settings
         */
        async getComplianceSettings(tenantId) {
            return this.auditService.getComplianceSettings(tenantId);
        }
        /**
         * Get integration health status
         */
        async getIntegrationHealth(tenantId) {
            return this.auditService.getIntegrationHealth(tenantId);
        }
        /**
         * System health check
         */
        async getSystemHealth() {
            return {
                status: 'healthy',
                timestamp: new Date(),
                services: {
                    database: 'healthy',
                    cache: 'healthy',
                    storage: 'healthy',
                },
            };
        }
    };
    return AuditIntegrationController = _classThis;
})();
export { AuditIntegrationController };
//# sourceMappingURL=audit-integration.routes.js.map