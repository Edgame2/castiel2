/**
 * Webhook Validator
 * 
 * Validates webhook signatures and payloads
 */

import { createHmac } from 'crypto';

export class WebhookValidator {
  /**
   * Validate webhook signature using HMAC
   */
  validateSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
  ): boolean {
    try {
      const hmac = createHmac(algorithm, secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      
      // Compare signatures (constant-time comparison)
      return this.constantTimeCompare(signature, expectedSignature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Validate CloudEvents format
   */
  validateCloudEvent(payload: any): boolean {
    // CloudEvents 1.0 spec requires: id, source, specversion, type
    return !!(
      payload.id &&
      payload.source &&
      payload.specversion &&
      payload.type
    );
  }
}

