/**
 * Logger Adapter
 * 
 * Adapts IMonitoringProvider to work as InvocationContext for orchestrator services
 * This allows us to reuse orchestrator services from functions without Azure Functions dependencies
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import type { InvocationContext } from '@azure/functions';

/**
 * Simple logger adapter that mimics InvocationContext's logging interface
 * Can be cast to InvocationContext for use with orchestrator services
 */
export class LoggerAdapter implements Partial<InvocationContext> {
  constructor(private monitoring: IMonitoringProvider) {}

  log(message: string, ...args: any[]): void {
    const fullMessage = args.length > 0 ? `${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}` : message;
    console.log(fullMessage);
    this.monitoring.trackEvent('worker.log', {
      message: fullMessage,
    });
  }

  warn(message: string, ...args: any[]): void {
    const fullMessage = args.length > 0 ? `${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}` : message;
    console.warn(fullMessage);
    this.monitoring.trackEvent('worker.warn', {
      message: fullMessage,
    });
  }

  error(message: string, ...args: any[]): void {
    const fullMessage = args.length > 0 ? `${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}` : message;
    console.error(fullMessage);
    this.monitoring.trackException(new Error(fullMessage), {
      context: 'LoggerAdapter',
    });
  }

  info(message: string, ...args: any[]): void {
    this.log(message, ...args);
  }
}

