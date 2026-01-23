/**
 * SSO Configuration Routes
 * 
 * Admin routes for managing SSO configuration
 */

import type { FastifyInstance } from 'fastify';
import type { SSOConfigController } from '../controllers/sso-config.controller.js';

const createSSOConfigSchema = {
  body: {
    type: 'object',
    required: ['orgName', 'provider', 'samlConfig'],
    properties: {
      orgName: { type: 'string', minLength: 1 },
      provider: { type: 'string', enum: ['saml', 'azure_ad', 'okta', 'google_workspace'] },
      samlConfig: {
        type: 'object',
        required: ['entityId', 'entryPoint', 'issuer', 'callbackUrl', 'idpCert', 'attributeMapping'],
        properties: {
          entityId: { type: 'string' },
          entryPoint: { type: 'string' },
          issuer: { type: 'string' },
          callbackUrl: { type: 'string' },
          idpCert: { type: 'string' },
          privateKey: { type: 'string' },
          signatureAlgorithm: { type: 'string', enum: ['sha256', 'sha512'] },
          digestAlgorithm: { type: 'string', enum: ['sha256', 'sha512'] },
          wantAssertionsSigned: { type: 'boolean' },
          wantAuthnResponseSigned: { type: 'boolean' },
          attributeMapping: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              displayName: { type: 'string' },
              groups: { type: 'string' },
            },
          },
        },
      },
      jitProvisioning: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          autoActivate: { type: 'boolean' },
          defaultRole: { type: 'string' },
          allowedDomains: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

const updateSSOConfigSchema = {
  body: {
    type: 'object',
    properties: {
      orgName: { type: 'string', minLength: 1 },
      status: { type: 'string', enum: ['pending', 'active', 'inactive'] },
      samlConfig: {
        type: 'object',
        properties: {
          entityId: { type: 'string' },
          entryPoint: { type: 'string' },
          issuer: { type: 'string' },
          callbackUrl: { type: 'string' },
          idpCert: { type: 'string' },
          privateKey: { type: 'string' },
          signatureAlgorithm: { type: 'string', enum: ['sha256', 'sha512'] },
          digestAlgorithm: { type: 'string', enum: ['sha256', 'sha512'] },
          wantAssertionsSigned: { type: 'boolean' },
          wantAuthnResponseSigned: { type: 'boolean' },
          attributeMapping: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              displayName: { type: 'string' },
              groups: { type: 'string' },
            },
          },
        },
      },
      jitProvisioning: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          autoActivate: { type: 'boolean' },
          defaultRole: { type: 'string' },
          allowedDomains: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

export function registerSSOConfigRoutes(
  server: FastifyInstance,
  ssoConfigController: SSOConfigController
) {
  // Get config
  server.get(
    '/admin/sso/config',
    (request, reply) => ssoConfigController.getConfig(request, reply)
  );

  // Create config
  server.post(
    '/admin/sso/config',
    { schema: createSSOConfigSchema },
    (request, reply) => ssoConfigController.createConfig(request, reply)
  );

  // Update config
  server.put(
    '/admin/sso/config',
    { schema: updateSSOConfigSchema },
    (request, reply) => ssoConfigController.updateConfig(request, reply)
  );

  // Delete config
  server.delete(
    '/admin/sso/config',
    (request, reply) => ssoConfigController.deleteConfig(request, reply)
  );

  // Activate config
  server.post(
    '/admin/sso/config/activate',
    (request, reply) => ssoConfigController.activateConfig(request, reply)
  );

  // Deactivate config
  server.post(
    '/admin/sso/config/deactivate',
    (request, reply) => ssoConfigController.deactivateConfig(request, reply)
  );

  // Validate config
  server.post(
    '/admin/sso/config/validate',
    (request, reply) => ssoConfigController.validateConfig(request, reply)
  );

  // Test config
  server.post(
    '/admin/sso/config/test',
    (request, reply) => ssoConfigController.testConfig(request, reply)
  );
}

