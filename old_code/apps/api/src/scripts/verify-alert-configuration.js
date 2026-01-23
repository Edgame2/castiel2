/**
 * Alert Configuration Verification Script
 *
 * Verifies that all critical alerts are properly configured and can be deployed.
 * Checks:
 * - All required alert rules are defined
 * - Notification channels are configured
 * - Alert conditions are valid
 * - Runbooks are documented
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Required critical alerts from INTEGRATION_MONITORING.md
const REQUIRED_CRITICAL_ALERTS = [
    'High Sync Failure Rate',
    'Service Bus Queue Backlog',
    'Dead Letter Queue Accumulation',
];
const REQUIRED_WARNING_ALERTS = [
    'Slow Sync Processing',
    'High Rate Limit Hits',
];
// Required notification channels
const REQUIRED_CHANNELS = ['email', 'slack'];
/**
 * Verify alert configuration
 */
function verifyAlertConfiguration(config) {
    const errors = [];
    const warnings = [];
    // Check required critical alerts
    const alertNames = config.alerts.map(a => a.name);
    for (const requiredAlert of REQUIRED_CRITICAL_ALERTS) {
        if (!alertNames.includes(requiredAlert)) {
            errors.push(`Missing required critical alert: ${requiredAlert}`);
        }
    }
    // Check required warning alerts
    for (const requiredAlert of REQUIRED_WARNING_ALERTS) {
        if (!alertNames.includes(requiredAlert)) {
            warnings.push(`Missing recommended warning alert: ${requiredAlert}`);
        }
    }
    // Validate each alert
    for (const alert of config.alerts) {
        // Check required fields
        if (!alert.name) {
            errors.push('Alert missing name');
        }
        if (!alert.condition) {
            errors.push(`Alert "${alert.name}" missing condition`);
        }
        if (!alert.severity) {
            errors.push(`Alert "${alert.name}" missing severity`);
        }
        if (!alert.notificationChannels || alert.notificationChannels.length === 0) {
            errors.push(`Alert "${alert.name}" missing notification channels`);
        }
        if (!alert.runbook) {
            warnings.push(`Alert "${alert.name}" missing runbook`);
        }
        // Validate severity
        if (!['critical', 'warning', 'info'].includes(alert.severity)) {
            errors.push(`Alert "${alert.name}" has invalid severity: ${alert.severity}`);
        }
        // Validate notification channels exist
        for (const channel of alert.notificationChannels) {
            if (!config.notificationChannels[channel]) {
                errors.push(`Alert "${alert.name}" references non-existent notification channel: ${channel}`);
            }
            else if (!config.notificationChannels[channel].enabled) {
                warnings.push(`Alert "${alert.name}" uses disabled notification channel: ${channel}`);
            }
        }
        // Validate condition syntax (basic check)
        if (alert.condition && !alert.condition.includes('rate') && !alert.condition.includes('histogram_quantile') && !alert.condition.includes('>') && !alert.condition.includes('<')) {
            warnings.push(`Alert "${alert.name}" condition may be invalid: ${alert.condition}`);
        }
    }
    // Check required notification channels
    for (const requiredChannel of REQUIRED_CHANNELS) {
        if (!config.notificationChannels[requiredChannel]) {
            errors.push(`Missing required notification channel: ${requiredChannel}`);
        }
        else if (!config.notificationChannels[requiredChannel].enabled) {
            warnings.push(`Required notification channel is disabled: ${requiredChannel}`);
        }
    }
    // Check notification channel configuration
    for (const [channelName, channelConfig] of Object.entries(config.notificationChannels)) {
        if (channelConfig.enabled) {
            switch (channelConfig.type) {
                case 'email':
                    if (!channelConfig.recipients || channelConfig.recipients.length === 0) {
                        errors.push(`Email channel "${channelName}" missing recipients`);
                    }
                    break;
                case 'slack':
                    if (!channelConfig.webhookUrl && !channelConfig.webhookUrl?.startsWith('${')) {
                        warnings.push(`Slack channel "${channelName}" webhook URL may not be configured`);
                    }
                    break;
                case 'pagerduty':
                    if (!channelConfig.integrationKey && !channelConfig.integrationKey?.startsWith('${')) {
                        warnings.push(`PagerDuty channel "${channelName}" integration key may not be configured`);
                    }
                    break;
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
/**
 * Main function
 */
async function main() {
    console.log('🔍 Verifying alert configuration...\n');
    try {
        // Load alert configuration
        const configPath = join(__dirname, '../../../../docs/monitoring/alert-rules.json');
        const configContent = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        // Verify configuration
        const result = verifyAlertConfiguration(config);
        // Print results
        if (result.valid) {
            console.log('✅ Alert configuration is valid\n');
        }
        else {
            console.log('❌ Alert configuration has errors:\n');
            for (const error of result.errors) {
                console.log(`  - ${error}`);
            }
            console.log();
        }
        if (result.warnings.length > 0) {
            console.log('⚠️  Warnings:\n');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
            console.log();
        }
        // Print summary
        console.log('📊 Summary:');
        console.log(`  Total alerts: ${config.alerts.length}`);
        console.log(`  Critical alerts: ${config.alerts.filter(a => a.severity === 'critical').length}`);
        console.log(`  Warning alerts: ${config.alerts.filter(a => a.severity === 'warning').length}`);
        console.log(`  Info alerts: ${config.alerts.filter(a => a.severity === 'info').length}`);
        console.log(`  Notification channels: ${Object.keys(config.notificationChannels).length}`);
        console.log(`  Enabled channels: ${Object.values(config.notificationChannels).filter(c => c.enabled).length}`);
        // List all alerts
        console.log('\n📋 Configured alerts:');
        for (const alert of config.alerts) {
            const severityIcon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵';
            console.log(`  ${severityIcon} ${alert.name} (${alert.severity})`);
            console.log(`     Channels: ${alert.notificationChannels.join(', ')}`);
        }
        if (!result.valid) {
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Failed to verify alert configuration:', error);
        process.exit(1);
    }
}
main().catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
});
//# sourceMappingURL=verify-alert-configuration.js.map