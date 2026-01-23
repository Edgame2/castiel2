import { SchemaMigrationRepository } from '../repositories/schema-migration.repository.js';
import { MigrationStatus, MigrationStrategy, FieldChangeType, BUILT_IN_TRANSFORMATIONS, } from '../types/schema-migration.types.js';
import { isRichSchema, isJSONSchema, detectSchemaFormat, } from '../types/shard-type.types.js';
// Batch size for eager migrations
const MIGRATION_BATCH_SIZE = 50;
/**
 * Schema Migration Service
 * Handles schema evolution, change detection, and data migration
 */
export class SchemaMigrationService {
    repository;
    shardRepository;
    shardTypeRepository;
    monitoring;
    constructor(monitoring, shardRepository, shardTypeRepository) {
        this.monitoring = monitoring;
        this.repository = new SchemaMigrationRepository(monitoring);
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
    }
    /**
     * Initialize the service
     */
    async initialize() {
        await this.repository.ensureContainer();
        this.monitoring.trackEvent('schemaMigration.service.initialized');
    }
    /**
     * Detect changes between two schemas and create a diff
     */
    diffSchemas(oldSchema, newSchema, schemaFormat) {
        const changes = [];
        if (schemaFormat === 'rich') {
            // Rich schema diff
            const oldFields = isRichSchema(oldSchema) ? oldSchema.fields : [];
            const newFields = isRichSchema(newSchema) ? newSchema.fields : [];
            changes.push(...this.diffRichSchemaFields(oldFields, newFields));
        }
        else if (schemaFormat === 'jsonschema') {
            // JSON Schema diff
            const oldProps = isJSONSchema(oldSchema) ? (oldSchema.properties || {}) : {};
            const newProps = isJSONSchema(newSchema) ? (newSchema.properties || {}) : {};
            const oldRequired = isJSONSchema(oldSchema) ? (oldSchema.required || []) : [];
            const newRequired = isJSONSchema(newSchema) ? (newSchema.required || []) : [];
            changes.push(...this.diffJSONSchemaProperties(oldProps, newProps, oldRequired, newRequired));
        }
        else {
            // Legacy schema diff
            const oldFields = 'fields' in oldSchema ? (oldSchema.fields || {}) : {};
            const newFields = 'fields' in newSchema ? (newSchema.fields || {}) : {};
            changes.push(...this.diffLegacySchemaFields(oldFields, newFields));
        }
        const breakingChanges = changes.filter(c => c.isBreaking).length;
        const additiveChanges = changes.filter(c => !c.isBreaking).length;
        const requiresDataMigration = changes.some(c => c.changeType !== FieldChangeType.ADDED || c.isBreaking);
        // Determine recommended strategy
        let recommendedStrategy;
        if (breakingChanges === 0 && !requiresDataMigration) {
            recommendedStrategy = MigrationStrategy.NONE;
        }
        else if (breakingChanges <= 3) {
            recommendedStrategy = MigrationStrategy.LAZY;
        }
        else {
            recommendedStrategy = MigrationStrategy.EAGER;
        }
        const summary = this.generateDiffSummary(changes, breakingChanges, additiveChanges);
        return {
            changes,
            totalChanges: changes.length,
            breakingChanges,
            additiveChanges,
            requiresDataMigration,
            recommendedStrategy,
            summary,
        };
    }
    /**
     * Diff rich schema fields
     */
    diffRichSchemaFields(oldFields, newFields) {
        const changes = [];
        const oldFieldMap = new Map(oldFields.map(f => [f.name, f]));
        const newFieldMap = new Map(newFields.map(f => [f.name, f]));
        // Check for added fields
        for (const [name, newField] of newFieldMap) {
            if (!oldFieldMap.has(name)) {
                const isBreaking = newField.required === true && newField.config?.default === undefined;
                changes.push({
                    changeType: FieldChangeType.ADDED,
                    fieldName: name,
                    newDefinition: newField,
                    defaultValue: newField.config?.default,
                    isBreaking,
                    description: `Field '${name}' added${isBreaking ? ' (required without default)' : ''}`,
                });
            }
        }
        // Check for removed fields
        for (const [name, oldField] of oldFieldMap) {
            if (!newFieldMap.has(name)) {
                changes.push({
                    changeType: FieldChangeType.REMOVED,
                    fieldName: name,
                    oldDefinition: oldField,
                    isBreaking: true,
                    description: `Field '${name}' removed`,
                });
            }
        }
        // Check for modified fields
        for (const [name, newField] of newFieldMap) {
            const oldField = oldFieldMap.get(name);
            if (!oldField) {
                continue;
            }
            // Type changed
            if (oldField.type !== newField.type) {
                changes.push({
                    changeType: FieldChangeType.TYPE_CHANGED,
                    fieldName: name,
                    oldDefinition: oldField,
                    newDefinition: newField,
                    transformFn: this.suggestTransformation(oldField.type, newField.type),
                    isBreaking: true,
                    description: `Field '${name}' type changed from '${oldField.type}' to '${newField.type}'`,
                });
            }
            // Required changed
            if (!oldField.required && newField.required) {
                changes.push({
                    changeType: FieldChangeType.MADE_REQUIRED,
                    fieldName: name,
                    oldDefinition: oldField,
                    newDefinition: newField,
                    defaultValue: newField.config?.default,
                    isBreaking: newField.config?.default === undefined,
                    description: `Field '${name}' made required`,
                });
            }
            else if (oldField.required && !newField.required) {
                changes.push({
                    changeType: FieldChangeType.MADE_OPTIONAL,
                    fieldName: name,
                    oldDefinition: oldField,
                    newDefinition: newField,
                    isBreaking: false,
                    description: `Field '${name}' made optional`,
                });
            }
            // Config changed (check specific important changes)
            if (JSON.stringify(oldField.config) !== JSON.stringify(newField.config)) {
                const hasBreakingConfigChange = this.checkBreakingConfigChange(oldField, newField);
                if (hasBreakingConfigChange) {
                    changes.push({
                        changeType: FieldChangeType.CONFIG_CHANGED,
                        fieldName: name,
                        oldDefinition: oldField,
                        newDefinition: newField,
                        isBreaking: true,
                        description: `Field '${name}' configuration changed (may invalidate existing data)`,
                    });
                }
            }
        }
        return changes;
    }
    /**
     * Diff JSON Schema properties
     */
    diffJSONSchemaProperties(oldProps, newProps, oldRequired, newRequired) {
        const changes = [];
        // Check for added properties
        for (const [name, newProp] of Object.entries(newProps)) {
            if (!(name in oldProps)) {
                const isNowRequired = newRequired.includes(name);
                const hasDefault = newProp.default !== undefined;
                const isBreaking = isNowRequired && !hasDefault;
                changes.push({
                    changeType: FieldChangeType.ADDED,
                    fieldName: name,
                    newDefinition: newProp,
                    defaultValue: newProp.default,
                    isBreaking,
                    description: `Property '${name}' added${isBreaking ? ' (required without default)' : ''}`,
                });
            }
        }
        // Check for removed properties
        for (const name of Object.keys(oldProps)) {
            if (!(name in newProps)) {
                changes.push({
                    changeType: FieldChangeType.REMOVED,
                    fieldName: name,
                    oldDefinition: oldProps[name],
                    isBreaking: true,
                    description: `Property '${name}' removed`,
                });
            }
        }
        // Check for modified properties
        for (const [name, newProp] of Object.entries(newProps)) {
            const oldProp = oldProps[name];
            if (!oldProp) {
                continue;
            }
            // Type changed
            if (oldProp.type !== newProp.type) {
                changes.push({
                    changeType: FieldChangeType.TYPE_CHANGED,
                    fieldName: name,
                    oldDefinition: oldProp,
                    newDefinition: newProp,
                    isBreaking: true,
                    description: `Property '${name}' type changed from '${oldProp.type}' to '${newProp.type}'`,
                });
            }
            // Required changed
            const wasRequired = oldRequired.includes(name);
            const isNowRequired = newRequired.includes(name);
            if (!wasRequired && isNowRequired) {
                changes.push({
                    changeType: FieldChangeType.MADE_REQUIRED,
                    fieldName: name,
                    oldDefinition: oldProp,
                    newDefinition: newProp,
                    defaultValue: newProp.default,
                    isBreaking: newProp.default === undefined,
                    description: `Property '${name}' made required`,
                });
            }
            else if (wasRequired && !isNowRequired) {
                changes.push({
                    changeType: FieldChangeType.MADE_OPTIONAL,
                    fieldName: name,
                    oldDefinition: oldProp,
                    newDefinition: newProp,
                    isBreaking: false,
                    description: `Property '${name}' made optional`,
                });
            }
        }
        return changes;
    }
    /**
     * Diff legacy schema fields
     */
    diffLegacySchemaFields(oldFields, newFields) {
        const changes = [];
        for (const [name, newField] of Object.entries(newFields)) {
            if (!(name in oldFields)) {
                changes.push({
                    changeType: FieldChangeType.ADDED,
                    fieldName: name,
                    newDefinition: newField,
                    isBreaking: newField.required === true,
                    description: `Field '${name}' added`,
                });
            }
        }
        for (const name of Object.keys(oldFields)) {
            if (!(name in newFields)) {
                changes.push({
                    changeType: FieldChangeType.REMOVED,
                    fieldName: name,
                    oldDefinition: oldFields[name],
                    isBreaking: true,
                    description: `Field '${name}' removed`,
                });
            }
        }
        return changes;
    }
    /**
     * Check if config change is breaking
     */
    checkBreakingConfigChange(oldField, newField) {
        const oldConfig = oldField.config;
        const newConfig = newField.config;
        // Check for restrictive changes
        if (newConfig?.minLength > (oldConfig?.minLength || 0)) {
            return true;
        }
        if (newConfig?.maxLength && newConfig.maxLength < (oldConfig?.maxLength || Infinity)) {
            return true;
        }
        if (newConfig?.min > (oldConfig?.min ?? -Infinity)) {
            return true;
        }
        if (newConfig?.max < (oldConfig?.max ?? Infinity)) {
            return true;
        }
        if (newConfig?.minSelection > (oldConfig?.minSelection || 0)) {
            return true;
        }
        if (newConfig?.maxSelection && newConfig.maxSelection < (oldConfig?.maxSelection || Infinity)) {
            return true;
        }
        // Check for option list changes (removed options)
        if (oldConfig?.options && newConfig?.options) {
            const oldValues = new Set(oldConfig.options.map((o) => o.value));
            const newValues = new Set(newConfig.options.map((o) => o.value));
            for (const v of oldValues) {
                if (!newValues.has(v)) {
                    return true;
                } // Option removed
            }
        }
        return false;
    }
    /**
     * Suggest transformation function for type change
     */
    suggestTransformation(oldType, newType) {
        const typeMap = {
            text: {
                integer: BUILT_IN_TRANSFORMATIONS.STRING_TO_NUMBER,
                float: BUILT_IN_TRANSFORMATIONS.STRING_TO_NUMBER,
                boolean: BUILT_IN_TRANSFORMATIONS.STRING_TO_BOOLEAN,
            },
            integer: {
                text: BUILT_IN_TRANSFORMATIONS.NUMBER_TO_STRING,
                float: BUILT_IN_TRANSFORMATIONS.NUMBER_TO_STRING, // Keep as number
            },
            float: {
                text: BUILT_IN_TRANSFORMATIONS.NUMBER_TO_STRING,
                integer: BUILT_IN_TRANSFORMATIONS.NUMBER_TO_STRING, // Will truncate
            },
            boolean: {
                text: BUILT_IN_TRANSFORMATIONS.BOOLEAN_TO_STRING,
            },
            select: {
                multiselect: BUILT_IN_TRANSFORMATIONS.VALUE_TO_ARRAY,
            },
            multiselect: {
                select: BUILT_IN_TRANSFORMATIONS.ARRAY_TO_VALUE,
            },
        };
        return typeMap[oldType]?.[newType];
    }
    /**
     * Generate human-readable diff summary
     */
    generateDiffSummary(changes, breakingChanges, additiveChanges) {
        if (changes.length === 0) {
            return 'No schema changes detected.';
        }
        const parts = [];
        parts.push(`${changes.length} change(s) detected:`);
        const added = changes.filter(c => c.changeType === FieldChangeType.ADDED).length;
        const removed = changes.filter(c => c.changeType === FieldChangeType.REMOVED).length;
        const typeChanged = changes.filter(c => c.changeType === FieldChangeType.TYPE_CHANGED).length;
        const requiredChanged = changes.filter(c => c.changeType === FieldChangeType.MADE_REQUIRED ||
            c.changeType === FieldChangeType.MADE_OPTIONAL).length;
        if (added > 0) {
            parts.push(`${added} field(s) added`);
        }
        if (removed > 0) {
            parts.push(`${removed} field(s) removed`);
        }
        if (typeChanged > 0) {
            parts.push(`${typeChanged} field type(s) changed`);
        }
        if (requiredChanged > 0) {
            parts.push(`${requiredChanged} required status change(s)`);
        }
        parts.push(`(${breakingChanges} breaking, ${additiveChanges} additive)`);
        return parts.join(' ');
    }
    /**
     * Check schema compatibility
     */
    checkCompatibility(oldSchema, newSchema, schemaFormat) {
        const diff = this.diffSchemas(oldSchema, newSchema, schemaFormat);
        const issues = [];
        const recommendations = [];
        for (const change of diff.changes) {
            if (change.isBreaking) {
                issues.push({
                    severity: 'error',
                    field: change.fieldName,
                    message: change.description,
                    resolution: this.getResolution(change),
                });
            }
            else if (change.changeType === FieldChangeType.CONFIG_CHANGED) {
                issues.push({
                    severity: 'warning',
                    field: change.fieldName,
                    message: change.description,
                    resolution: 'Review affected Shards after migration',
                });
            }
        }
        if (diff.breakingChanges > 0) {
            recommendations.push('Consider a phased rollout with lazy migration');
            recommendations.push('Backup existing data before migration');
        }
        if (diff.changes.some(c => c.changeType === FieldChangeType.REMOVED)) {
            recommendations.push('Removed fields will lose data - export first if needed');
        }
        return {
            isCompatible: diff.breakingChanges === 0,
            requiresMigration: diff.requiresDataMigration,
            issues,
            recommendations,
        };
    }
    /**
     * Get resolution suggestion for a change
     */
    getResolution(change) {
        switch (change.changeType) {
            case FieldChangeType.REMOVED:
                return 'Export field data before removal or keep field as deprecated';
            case FieldChangeType.TYPE_CHANGED:
                return change.transformFn
                    ? `Use transformation: ${change.transformFn}`
                    : 'Provide custom transformation function';
            case FieldChangeType.MADE_REQUIRED:
                return 'Provide a default value for existing Shards';
            default:
                return 'Review and update affected Shards';
        }
    }
    /**
     * Create a migration for a schema change
     */
    async createMigration(tenantId, shardType, newSchema, userId, options) {
        const currentVersion = shardType.schemaVersion || 1;
        const newVersion = currentVersion + 1;
        const schemaFormat = detectSchemaFormat(newSchema);
        // Generate diff
        const diff = this.diffSchemas(shardType.schema, newSchema, schemaFormat);
        // Apply field mappings for renames
        if (options?.fieldMappings) {
            for (const [oldName, newName] of Object.entries(options.fieldMappings)) {
                const removeChange = diff.changes.find(c => c.changeType === FieldChangeType.REMOVED && c.fieldName === oldName);
                const addChange = diff.changes.find(c => c.changeType === FieldChangeType.ADDED && c.fieldName === newName);
                if (removeChange && addChange) {
                    // Replace with rename
                    const idx = diff.changes.indexOf(removeChange);
                    diff.changes.splice(idx, 1);
                    diff.changes.splice(diff.changes.indexOf(addChange), 1);
                    diff.changes.push({
                        changeType: FieldChangeType.RENAMED,
                        fieldName: oldName,
                        newFieldName: newName,
                        oldDefinition: removeChange.oldDefinition,
                        newDefinition: addChange.newDefinition,
                        isBreaking: false,
                        description: `Field '${oldName}' renamed to '${newName}'`,
                    });
                }
            }
        }
        // Apply default values
        if (options?.defaultValues) {
            for (const change of diff.changes) {
                if (change.changeType === FieldChangeType.MADE_REQUIRED ||
                    (change.changeType === FieldChangeType.ADDED && change.isBreaking)) {
                    if (change.fieldName in options.defaultValues) {
                        change.defaultValue = options.defaultValues[change.fieldName];
                        change.isBreaking = false;
                        change.description += ' (default value provided)';
                    }
                }
            }
        }
        const input = {
            shardTypeId: shardType.id,
            fromVersion: currentVersion,
            toVersion: newVersion,
            fromSchema: shardType.schema,
            toSchema: newSchema,
            schemaFormat,
            strategy: options?.strategy || diff.recommendedStrategy,
            createdBy: userId,
        };
        const migration = await this.repository.create(tenantId, input, diff.changes, shardType.name);
        this.monitoring.trackEvent('schemaMigration.created', {
            migrationId: migration.id,
            tenantId,
            shardTypeId: shardType.id,
            fromVersion: currentVersion,
            toVersion: newVersion,
            strategy: migration.strategy,
            breakingChanges: migration.breakingChangeCount,
        });
        return migration;
    }
    /**
     * Apply migration to a single Shard (lazy migration)
     */
    async migrateShardData(shard, migration) {
        const startTime = Date.now();
        const changesApplied = [];
        try {
            // Skip if already at target version
            if ((shard.schemaVersion || 1) >= migration.toVersion) {
                return {
                    shardId: shard.id,
                    success: true,
                    fromVersion: shard.schemaVersion || 1,
                    toVersion: migration.toVersion,
                    changesApplied: [],
                    durationMs: Date.now() - startTime,
                };
            }
            const migratedData = { ...shard.structuredData };
            for (const change of migration.changes) {
                switch (change.changeType) {
                    case FieldChangeType.ADDED:
                        if (change.defaultValue !== undefined && !(change.fieldName in migratedData)) {
                            migratedData[change.fieldName] = change.defaultValue;
                            changesApplied.push(`Added '${change.fieldName}' with default value`);
                        }
                        break;
                    case FieldChangeType.REMOVED:
                        if (change.fieldName in migratedData) {
                            delete migratedData[change.fieldName];
                            changesApplied.push(`Removed '${change.fieldName}'`);
                        }
                        break;
                    case FieldChangeType.RENAMED:
                        if (change.fieldName in migratedData && change.newFieldName) {
                            migratedData[change.newFieldName] = migratedData[change.fieldName];
                            delete migratedData[change.fieldName];
                            changesApplied.push(`Renamed '${change.fieldName}' to '${change.newFieldName}'`);
                        }
                        break;
                    case FieldChangeType.TYPE_CHANGED:
                        if (change.fieldName in migratedData && change.transformFn) {
                            const oldValue = migratedData[change.fieldName];
                            const newValue = this.applyTransformation(oldValue, change.transformFn);
                            if (newValue !== undefined) {
                                migratedData[change.fieldName] = newValue;
                                changesApplied.push(`Transformed '${change.fieldName}' type`);
                            }
                        }
                        break;
                    case FieldChangeType.MADE_REQUIRED:
                        if (!(change.fieldName in migratedData) && change.defaultValue !== undefined) {
                            migratedData[change.fieldName] = change.defaultValue;
                            changesApplied.push(`Set default for required '${change.fieldName}'`);
                        }
                        break;
                }
            }
            return {
                shardId: shard.id,
                success: true,
                fromVersion: shard.schemaVersion || 1,
                toVersion: migration.toVersion,
                changesApplied,
                migratedData,
                durationMs: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                shardId: shard.id,
                success: false,
                fromVersion: shard.schemaVersion || 1,
                toVersion: migration.toVersion,
                changesApplied,
                error: error.message,
                durationMs: Date.now() - startTime,
            };
        }
    }
    /**
     * Apply a transformation function
     */
    applyTransformation(value, transformFn) {
        switch (transformFn) {
            case BUILT_IN_TRANSFORMATIONS.STRING_TO_NUMBER:
                const num = Number(value);
                return isNaN(num) ? undefined : num;
            case BUILT_IN_TRANSFORMATIONS.NUMBER_TO_STRING:
                return String(value);
            case BUILT_IN_TRANSFORMATIONS.STRING_TO_BOOLEAN:
                return value === 'true' || value === '1' || value === 'yes';
            case BUILT_IN_TRANSFORMATIONS.BOOLEAN_TO_STRING:
                return String(value);
            case BUILT_IN_TRANSFORMATIONS.VALUE_TO_ARRAY:
                return value !== undefined ? [value] : [];
            case BUILT_IN_TRANSFORMATIONS.ARRAY_TO_VALUE:
                return Array.isArray(value) ? value[0] : value;
            case BUILT_IN_TRANSFORMATIONS.DATE_TO_ISO:
                const date = new Date(value);
                return isNaN(date.getTime()) ? undefined : date.toISOString();
            case BUILT_IN_TRANSFORMATIONS.PARSE_JSON:
                try {
                    return JSON.parse(value);
                }
                catch {
                    return undefined;
                }
            case BUILT_IN_TRANSFORMATIONS.STRINGIFY_JSON:
                return JSON.stringify(value);
            case BUILT_IN_TRANSFORMATIONS.TO_UPPERCASE:
                return typeof value === 'string' ? value.toUpperCase() : value;
            case BUILT_IN_TRANSFORMATIONS.TO_LOWERCASE:
                return typeof value === 'string' ? value.toLowerCase() : value;
            case BUILT_IN_TRANSFORMATIONS.TRIM:
                return typeof value === 'string' ? value.trim() : value;
            default:
                return value;
        }
    }
    /**
     * Run eager migration (batch process all Shards)
     */
    async runEagerMigration(migrationId, tenantId, continuationToken) {
        const migration = await this.repository.findById(migrationId, tenantId);
        if (!migration) {
            throw new Error(`Migration not found: ${migrationId}`);
        }
        if (migration.status === MigrationStatus.COMPLETED) {
            throw new Error('Migration already completed');
        }
        // Update status to in progress
        await this.repository.updateStatus(migrationId, tenantId, MigrationStatus.IN_PROGRESS);
        const results = [];
        let succeeded = 0;
        let failed = 0;
        try {
            // Query Shards that need migration
            const shardResult = await this.shardRepository.list({
                filter: {
                    tenantId,
                    shardTypeId: migration.shardTypeId,
                },
                limit: MIGRATION_BATCH_SIZE,
                continuationToken,
            });
            // Update total count on first batch
            if (!continuationToken && migration.progress.totalShards === 0) {
                // Get total count (expensive query, only do once)
                const countResult = await this.shardRepository.count(tenantId, migration.shardTypeId);
                await this.repository.updateStatus(migrationId, tenantId, MigrationStatus.IN_PROGRESS, {
                    totalShards: countResult,
                });
            }
            // Process each Shard
            for (const shard of shardResult.shards) {
                const result = await this.migrateShardData(shard, migration);
                results.push(result);
                if (result.success && result.migratedData) {
                    // Update the Shard with migrated data
                    try {
                        await this.shardRepository.update(shard.id, tenantId, {
                            structuredData: result.migratedData,
                        });
                        // Also update schemaVersion (need to add this to update method)
                        succeeded++;
                    }
                    catch (updateError) {
                        result.success = false;
                        result.error = updateError.message;
                        failed++;
                    }
                }
                else if (!result.success) {
                    failed++;
                }
                else {
                    // Skipped (already migrated)
                    succeeded++;
                }
            }
            // Update progress
            const newProgress = {
                migratedShards: migration.progress.migratedShards + succeeded,
                failedShards: migration.progress.failedShards + failed,
                lastProcessedShardId: shardResult.shards[shardResult.shards.length - 1]?.id,
                continuationToken: shardResult.continuationToken,
            };
            const hasMore = !!shardResult.continuationToken;
            // Update status
            if (!hasMore) {
                await this.repository.updateStatus(migrationId, tenantId, failed > 0 ? MigrationStatus.FAILED : MigrationStatus.COMPLETED, newProgress);
            }
            else {
                await this.repository.updateStatus(migrationId, tenantId, MigrationStatus.IN_PROGRESS, newProgress);
            }
            this.monitoring.trackEvent('schemaMigration.batchProcessed', {
                migrationId,
                tenantId,
                processed: results.length,
                succeeded,
                failed,
                hasMore,
            });
            return {
                migrationId,
                processed: results.length,
                succeeded,
                failed,
                results,
                continuationToken: shardResult.continuationToken,
                hasMore,
            };
        }
        catch (error) {
            await this.repository.updateStatus(migrationId, tenantId, MigrationStatus.FAILED, undefined, error.message);
            throw error;
        }
    }
    /**
     * Get migrations for a ShardType
     */
    async getMigrationsForShardType(tenantId, shardTypeId) {
        const result = await this.repository.list({
            tenantId,
            shardTypeId,
        });
        return result.migrations;
    }
    /**
     * Get migration by ID
     */
    async getMigration(id, tenantId) {
        return this.repository.findById(id, tenantId);
    }
    /**
     * Get migration path from one version to another
     */
    async getMigrationPath(tenantId, shardTypeId, fromVersion, toVersion) {
        return this.repository.findMigrationPath(tenantId, shardTypeId, fromVersion, toVersion);
    }
    /**
     * Cancel a pending migration
     */
    async cancelMigration(id, tenantId) {
        const migration = await this.repository.findById(id, tenantId);
        if (!migration) {
            throw new Error(`Migration not found: ${id}`);
        }
        if (migration.status !== MigrationStatus.PENDING && migration.status !== MigrationStatus.IN_PROGRESS) {
            throw new Error(`Cannot cancel migration in status: ${migration.status}`);
        }
        return this.repository.updateStatus(id, tenantId, MigrationStatus.CANCELLED);
    }
    /**
     * Get repository for direct access
     */
    getRepository() {
        return this.repository;
    }
}
//# sourceMappingURL=schema-migration.service.js.map