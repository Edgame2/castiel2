/**
 * ClamAV Service
 * Streams blob content to a ClamAV (clamd) server for malware scanning.
 * Uses environment variables:
 * - CLAMAV_HOST (default: 127.0.0.1)
 * - CLAMAV_PORT (default: 3310)
 * - CLAMAV_TIMEOUT_MS (default: 60000)
 */

import { BlobClient } from '@azure/storage-blob';
import { InvocationContext } from '@azure/functions';
import type { SecurityCheckResult } from '../types/document-check.types.js';
import * as net from 'net';

export class ClamAVService {
  private readonly context: InvocationContext;
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;

  constructor(context: InvocationContext) {
    this.context = context;
    this.host = process.env.CLAMAV_HOST || '127.0.0.1';
    this.port = parseInt(process.env.CLAMAV_PORT || '3310', 10);
    this.timeoutMs = parseInt(process.env.CLAMAV_TIMEOUT_MS || '60000', 10);
  }

  /**
   * Scan the blob via clamd INSTREAM protocol over TCP.
   */
  async scanBlob(
    blobClient: BlobClient,
    documentFileName: string
  ): Promise<SecurityCheckResult> {
    try {
      const download = await blobClient.download();
      const stream = download.readableStreamBody as NodeJS.ReadableStream | null;

      if (!stream) {
        return {
          checkType: 'virus-scan',
          passed: false,
          timestamp: new Date().toISOString(),
          details: 'Unable to read blob stream for scanning',
          riskLevel: 'critical',
        };
      }

      const response = await this.scanStreamWithClamd(stream);
      this.context.log(`[ClamAV] Scan response for ${documentFileName}: ${response.trim()}`);
      const lower = response.toLowerCase();
      const infected = lower.includes('found');
      let details = response.trim();
      if (details.length === 0) {
        details = infected ? 'Malware found' : 'OK';
      }

      return {
        checkType: 'virus-scan',
        passed: !infected,
        timestamp: new Date().toISOString(),
        details: infected ? `Infected: ${details}` : 'No malware detected by ClamAV',
        riskLevel: infected ? 'critical' : 'low',
      };
    } catch (error: any) {
      this.context.error(`ClamAV scan error for ${documentFileName}: ${error.message}`);
      return {
        checkType: 'virus-scan',
        passed: false,
        timestamp: new Date().toISOString(),
        details: `ClamAV scan failed: ${error.message}`,
        riskLevel: 'critical',
      };
    }
  }

  /**
   * Implements the INSTREAM protocol.
   * Reference: clamd INSTREAM - send command, then 4-byte length + chunk, terminate with 0 length.
   */
  private scanStreamWithClamd(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let response = '';
      let timedOut = false;
      const startTime = Date.now();

      const onError = (err: any) => {
        const elapsedMs = Date.now() - startTime;
        if (!timedOut) {
          this.context.error(`[ClamAV] Connection error after ${elapsedMs}ms to ${this.host}:${this.port} - ${err.message}`);
          reject(err);
        }
        try { socket.destroy(); } catch {}
      };

      socket.setTimeout(this.timeoutMs, () => {
        timedOut = true;
        const elapsedMs = Date.now() - startTime;
        this.context.error(`[ClamAV] Timeout after ${elapsedMs}ms waiting for response from ${this.host}:${this.port}`);
        onError(new Error('ClamAV scan timed out'));
      });

      socket.on('data', (data) => {
        response += data.toString('utf8');
      });

      socket.on('error', onError);

      socket.on('close', () => {
        if (!timedOut) {
          const elapsedMs = Date.now() - startTime;
          this.context.log(`[ClamAV] Scan completed in ${elapsedMs}ms`);
          resolve(response);
        }
      });

      socket.connect(this.port, this.host, async () => {
        try {
          const connectTime = Date.now() - startTime;
          this.context.log(`[ClamAV] Connected to ${this.host}:${this.port} in ${connectTime}ms`);
          
          // Send INSTREAM command (clamd accepts either 'INSTREAM\n' or 'zINSTREAM\0' depending on version)
          // We'll use 'INSTREAM\n'
          socket.write('INSTREAM\n');

          for await (const chunk of stream as any) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            const header = Buffer.alloc(4);
            header.writeUInt32BE(buf.length, 0);
            socket.write(header);
            socket.write(buf);
          }

          // Terminate stream with zero-length chunk
          const zero = Buffer.alloc(4);
          zero.writeUInt32BE(0, 0);
          socket.write(zero);

          // End write side; wait for clamd response then close
          socket.end();
        } catch (err: any) {
          onError(err);
        }
      });
    });
  }
}

