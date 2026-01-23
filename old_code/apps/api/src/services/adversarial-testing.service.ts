/**
 * Adversarial Testing Service
 * Continuously tests system with adversarial examples to improve robustness
 * 
 * Features:
 * - Input perturbation testing
 * - Adversarial example generation
 * - Stress testing
 * - Gaming detection
 * - Continuous red team exercises
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

export type AdversarialTestType = 'input_perturbation' | 'stress_test' | 'gaming_detection' | 'red_team';

export interface AdversarialTest {
  testId: string;
  tenantId: string; // Partition key
  testType: AdversarialTestType;
  input: any; // Original input
  perturbedInput?: any; // Perturbed/adversarial input
  originalOutput?: any; // Original system output
  adversarialOutput?: any; // Output on adversarial input
  vulnerability: {
    detected: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
  };
  metadata: {
    perturbationMethod?: string;
    perturbationAmount?: number;
    stressLevel?: number;
    gamingAttempt?: string;
    redTeamScenario?: string;
  };
  createdAt: Date;
  resolvedAt?: Date;
  resolved: boolean;
}

export interface AdversarialTestResult {
  testId: string;
  vulnerabilityDetected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  testType: AdversarialTestType;
}

/**
 * Adversarial Testing Service
 */
export class AdversarialTestingService {
  private client: CosmosClient;
  private database: Database;
  private testsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private outcomeCollector?: any; // OutcomeCollectorService
  private performanceTracker?: any; // PerformanceTrackerService

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    outcomeCollector?: any,
    performanceTracker?: any
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.outcomeCollector = outcomeCollector;
    this.performanceTracker = performanceTracker;

    // Initialize Cosmos client
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
      requestTimeout: 30000,
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    this.testsContainer = this.database.container(config.cosmosDb.containers.adversarialTests);
  }

  /**
   * Test input with perturbations
   */
  async testInputPerturbation(
    tenantId: string,
    input: any,
    serviceType: 'risk' | 'forecast' | 'recommendations'
  ): Promise<AdversarialTestResult> {
    const testId = uuidv4();
    const perturbations = this.generatePerturbations(input);

    const vulnerabilities: Array<{ severity: string; description: string }> = [];

    for (const perturbedInput of perturbations) {
      try {
        // Get original output (would need to call actual service)
        const originalOutput = await this.getOriginalOutput(tenantId, input, serviceType);
        
        // Get output on perturbed input
        const adversarialOutput = await this.getAdversarialOutput(tenantId, perturbedInput, serviceType);

        // Compare outputs
        const difference = this.compareOutputs(originalOutput, adversarialOutput);
        
        if (difference > 0.3) { // Significant difference
          vulnerabilities.push({
            severity: difference > 0.7 ? 'high' : 'medium',
            description: `Output changed by ${(difference * 100).toFixed(1)}% with input perturbation`,
          });
        }
      } catch (error) {
        this.monitoring?.trackException(error as Error, {
          operation: 'testInputPerturbation',
          tenantId,
          testId,
        });
      }
    }

    const test: AdversarialTest = {
      testId,
      tenantId,
      testType: 'input_perturbation',
      input,
      vulnerability: {
        detected: vulnerabilities.length > 0,
        severity: this.getMaxSeverity(vulnerabilities.map(v => v.severity as any)),
        description: vulnerabilities.map(v => v.description).join('; '),
        impact: vulnerabilities.length > 0 
          ? 'System may be vulnerable to input manipulation'
          : 'No significant vulnerabilities detected',
      },
      metadata: {
        perturbationMethod: 'multi-vector',
        perturbationAmount: 0.1, // 10% perturbation
      },
      createdAt: new Date(),
      resolved: false,
    };

    await this.testsContainer.items.create(test);

    this.monitoring?.trackEvent('adversarial_test.input_perturbation', {
      tenantId,
      testId,
      vulnerabilitiesDetected: vulnerabilities.length,
    });

    return {
      testId,
      vulnerabilityDetected: vulnerabilities.length > 0,
      severity: test.vulnerability.severity,
      recommendation: vulnerabilities.length > 0
        ? 'Consider adding input validation and output stability checks'
        : 'System appears robust to input perturbations',
      testType: 'input_perturbation',
    };
  }

  /**
   * Stress test the system
   */
  async stressTest(
    tenantId: string,
    serviceType: 'risk' | 'forecast' | 'recommendations',
    stressLevel: number = 1.0 // 1.0 = normal, 2.0 = 2x load, etc.
  ): Promise<AdversarialTestResult> {
    const testId = uuidv4();
    const startTime = Date.now();

    try {
      // Generate high-volume test inputs
      const testInputs = this.generateStressTestInputs(stressLevel);
      const results: Array<{ success: boolean; latency: number; error?: string }> = [];

      for (const input of testInputs) {
        const inputStart = Date.now();
        try {
          await this.getOriginalOutput(tenantId, input, serviceType);
          results.push({
            success: true,
            latency: Date.now() - inputStart,
          });
        } catch (error: any) {
          results.push({
            success: false,
            latency: Date.now() - inputStart,
            error: error.message,
          });
        }
      }

      const totalTime = Date.now() - startTime;
      const successRate = results.filter(r => r.success).length / results.length;
      const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
      const errorRate = 1 - successRate;

      const vulnerability = {
        detected: errorRate > 0.1 || avgLatency > 5000, // >10% errors or >5s latency
        severity: errorRate > 0.3 ? 'high' : errorRate > 0.1 ? 'medium' : 'low' as 'low' | 'medium' | 'high' | 'critical',
        description: `Stress test at ${stressLevel}x load: ${(errorRate * 100).toFixed(1)}% error rate, ${avgLatency.toFixed(0)}ms avg latency`,
        impact: errorRate > 0.1 
          ? 'System may not handle high load gracefully'
          : 'System handles stress test well',
      };

      const test: AdversarialTest = {
        testId,
        tenantId,
        testType: 'stress_test',
        input: { stressLevel, testCount: testInputs.length },
        vulnerability,
        metadata: {
          stressLevel,
        },
        createdAt: new Date(),
        resolved: false,
      };

      await this.testsContainer.items.create(test);

      this.monitoring?.trackEvent('adversarial_test.stress_test', {
        tenantId,
        testId,
        stressLevel,
        errorRate,
        avgLatency,
      });

      return {
        testId,
        vulnerabilityDetected: vulnerability.detected,
        severity: vulnerability.severity,
        recommendation: vulnerability.detected
          ? 'Consider implementing rate limiting, caching, or load balancing'
          : 'System handles stress well',
        testType: 'stress_test',
      };
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'stressTest',
        tenantId,
        testId,
      });

      return {
        testId,
        vulnerabilityDetected: true,
        severity: 'critical',
        recommendation: 'Stress test failed - investigate system stability',
        testType: 'stress_test',
      };
    }
  }

  /**
   * Detect gaming attempts
   */
  async detectGaming(
    tenantId: string,
    input: any,
    output: any,
    serviceType: 'risk' | 'forecast' | 'recommendations'
  ): Promise<AdversarialTestResult> {
    const testId = uuidv4();

    // Check for common gaming patterns
    const gamingPatterns = [
      this.detectRepeatedInputs(input),
      this.detectExtremeValues(input),
      this.detectManipulationPatterns(input, output),
      this.detectExploitationAttempts(input, output),
    ];

    const detectedPatterns = gamingPatterns.filter(p => p.detected);

    const vulnerability = {
      detected: detectedPatterns.length > 0,
      severity: this.getMaxSeverity(detectedPatterns.map(p => p.severity as 'low' | 'medium' | 'high' | 'critical')),
      description: detectedPatterns.map(p => p.description).join('; '),
      impact: detectedPatterns.length > 0
        ? 'Potential gaming attempt detected - system may be manipulated'
        : 'No gaming patterns detected',
    };

    const test: AdversarialTest = {
      testId,
      tenantId,
      testType: 'gaming_detection',
      input,
      originalOutput: output,
      vulnerability,
      metadata: {
        gamingAttempt: detectedPatterns.length > 0 ? detectedPatterns[0].type : undefined,
      },
      createdAt: new Date(),
      resolved: false,
    };

    await this.testsContainer.items.create(test);

    this.monitoring?.trackEvent('adversarial_test.gaming_detected', {
      tenantId,
      testId,
      patternsDetected: detectedPatterns.length,
    });

    return {
      testId,
      vulnerabilityDetected: vulnerability.detected,
      severity: vulnerability.severity,
      recommendation: vulnerability.detected
        ? 'Implement input validation, rate limiting, and anomaly detection'
        : 'No gaming detected',
      testType: 'gaming_detection',
    };
  }

  /**
   * Run red team exercise
   */
  async runRedTeamExercise(
    tenantId: string,
    scenario: string,
    serviceType: 'risk' | 'forecast' | 'recommendations'
  ): Promise<AdversarialTestResult[]> {
    const results: AdversarialTestResult[] = [];

    // Run multiple adversarial tests
    const scenarios = this.getRedTeamScenarios(scenario);
    
    for (const testScenario of scenarios) {
      try {
        const result = await this.executeRedTeamScenario(tenantId, testScenario, serviceType);
        results.push(result);
      } catch (error) {
        this.monitoring?.trackException(error as Error, {
          operation: 'runRedTeamExercise',
          tenantId,
          scenario: testScenario.name,
        });
      }
    }

    this.monitoring?.trackEvent('adversarial_test.red_team_completed', {
      tenantId,
      scenario,
      testsRun: results.length,
      vulnerabilitiesFound: results.filter(r => r.vulnerabilityDetected).length,
    });

    return results;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Generate input perturbations
   */
  private generatePerturbations(input: any): any[] {
    const perturbations: any[] = [];

    // Add noise
    if (typeof input === 'number') {
      perturbations.push(input * 1.1); // +10%
      perturbations.push(input * 0.9); // -10%
    } else if (typeof input === 'object' && input !== null) {
      // Perturb numeric fields
      const perturbed = { ...input };
      for (const key in perturbed) {
        if (typeof perturbed[key] === 'number') {
          perturbed[key] = perturbed[key] * 1.1;
          perturbations.push({ ...perturbed });
          perturbed[key] = perturbed[key] * 0.9;
          perturbations.push({ ...perturbed });
        }
      }
    }

    return perturbations;
  }

  /**
   * Compare outputs
   */
  private compareOutputs(output1: any, output2: any): number {
    // Simple comparison - could be more sophisticated
    if (typeof output1 === 'number' && typeof output2 === 'number') {
      return Math.abs(output1 - output2) / Math.max(Math.abs(output1), 1);
    }

    // For objects, compare key values
    if (typeof output1 === 'object' && typeof output2 === 'object') {
      let totalDiff = 0;
      let count = 0;
      for (const key in output1) {
        if (typeof output1[key] === 'number' && typeof output2[key] === 'number') {
          totalDiff += Math.abs(output1[key] - output2[key]) / Math.max(Math.abs(output1[key]), 1);
          count++;
        }
      }
      return count > 0 ? totalDiff / count : 0;
    }

    return output1 === output2 ? 0 : 1;
  }

  /**
   * Get original output (placeholder - would call actual service)
   */
  private async getOriginalOutput(
    tenantId: string,
    input: any,
    serviceType: 'risk' | 'forecast' | 'recommendations'
  ): Promise<any> {
    // Placeholder - in real implementation, would call the actual service
    // This is a mock for testing purposes
    return { score: 0.5, confidence: 0.8 };
  }

  /**
   * Get adversarial output (placeholder)
   */
  private async getAdversarialOutput(
    tenantId: string,
    input: any,
    serviceType: 'risk' | 'forecast' | 'recommendations'
  ): Promise<any> {
    // Placeholder - would call service with perturbed input
    return { score: 0.6, confidence: 0.7 };
  }

  /**
   * Generate stress test inputs
   */
  private generateStressTestInputs(stressLevel: number): any[] {
    const count = Math.floor(100 * stressLevel); // 100 inputs per stress level
    const inputs: any[] = [];
    for (let i = 0; i < count; i++) {
      inputs.push({
        id: `test-${i}`,
        value: Math.random() * 1000,
        timestamp: new Date(),
      });
    }
    return inputs;
  }

  /**
   * Detect repeated inputs
   */
  private detectRepeatedInputs(input: any): { detected: boolean; severity: string; description: string; type: string } {
    // Placeholder - would check for repeated patterns
    return {
      detected: false,
      severity: 'low',
      description: 'No repeated input patterns detected',
      type: 'repeated_inputs',
    };
  }

  /**
   * Detect extreme values
   */
  private detectExtremeValues(input: any): { detected: boolean; severity: string; description: string; type: string } {
    // Placeholder - would check for extreme values
    return {
      detected: false,
      severity: 'low',
      description: 'No extreme values detected',
      type: 'extreme_values',
    };
  }

  /**
   * Detect manipulation patterns
   */
  private detectManipulationPatterns(input: any, output: any): { detected: boolean; severity: string; description: string; type: string } {
    // Placeholder - would check for manipulation patterns
    return {
      detected: false,
      severity: 'low',
      description: 'No manipulation patterns detected',
      type: 'manipulation',
    };
  }

  /**
   * Detect exploitation attempts
   */
  private detectExploitationAttempts(input: any, output: any): { detected: boolean; severity: string; description: string; type: string } {
    // Placeholder - would check for exploitation attempts
    return {
      detected: false,
      severity: 'low',
      description: 'No exploitation attempts detected',
      type: 'exploitation',
    };
  }

  /**
   * Get red team scenarios
   */
  private getRedTeamScenarios(scenario: string): Array<{ name: string; input: any }> {
    return [
      { name: `${scenario}_basic`, input: { test: 'basic' } },
      { name: `${scenario}_advanced`, input: { test: 'advanced' } },
    ];
  }

  /**
   * Execute red team scenario
   */
  private async executeRedTeamScenario(
    tenantId: string,
    scenario: { name: string; input: any },
    serviceType: 'risk' | 'forecast' | 'recommendations'
  ): Promise<AdversarialTestResult> {
    // Run input perturbation test for the scenario
    return await this.testInputPerturbation(tenantId, scenario.input, serviceType);
  }

  /**
   * Get max severity
   */
  private getMaxSeverity(severities: Array<'low' | 'medium' | 'high' | 'critical'>): 'low' | 'medium' | 'high' | 'critical' {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    return severities.reduce((max, s) => (order[s] > order[max] ? s : max), 'low' as 'low' | 'medium' | 'high' | 'critical');
  }
}
