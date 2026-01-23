/**
 * JSON Schemas for MFA Request Validation
 * 
 * Used by Fastify for automatic request validation
 */

export const enrollTOTPSchema = {
  description: 'Enroll TOTP (Authenticator App)',
  tags: ['MFA'],
  response: {
    200: {
      type: 'object',
      properties: {
        secret: { type: 'string' },
        qrCodeDataUrl: { type: 'string' },
        manualEntryCode: { type: 'string' },
        otpauthUrl: { type: 'string' },
        enrollmentToken: { type: 'string' },
      },
    },
  },
};

export const verifyTOTPSchema = {
  description: 'Verify TOTP Enrollment',
  tags: ['MFA'],
  body: {
    type: 'object',
    required: ['enrollmentToken', 'code'],
    properties: {
      enrollmentToken: { type: 'string', minLength: 1 },
      code: {
        type: 'string',
        pattern: '^[0-9]{6}$',
        description: '6-digit code from authenticator app',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        method: { type: 'object' },
        recoveryCodes: {
          type: 'array',
          items: { type: 'string' },
        },
        message: { type: 'string' },
      },
    },
  },
};

export const enrollSMSSchema = {
  description: 'Enroll SMS OTP',
  tags: ['MFA'],
  body: {
    type: 'object',
    required: ['phoneNumber'],
    properties: {
      phoneNumber: {
        type: 'string',
        pattern: '^\\+[1-9]\\d{1,14}$',
        description: 'Phone number in E.164 format (e.g., +14155552671)',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        maskedPhoneNumber: { type: 'string' },
        enrollmentToken: { type: 'string' },
        expiresInSeconds: { type: 'number' },
      },
    },
  },
};

export const verifySMSSchema = {
  description: 'Verify SMS Enrollment',
  tags: ['MFA'],
  body: {
    type: 'object',
    required: ['enrollmentToken', 'code'],
    properties: {
      enrollmentToken: { type: 'string', minLength: 1 },
      code: {
        type: 'string',
        pattern: '^[0-9]{6}$',
        description: '6-digit code sent via SMS',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        method: { type: 'object' },
        message: { type: 'string' },
      },
    },
  },
};

export const enrollEmailSchema = {
  description: 'Enroll Email OTP',
  tags: ['MFA'],
  response: {
    200: {
      type: 'object',
      properties: {
        maskedEmail: { type: 'string' },
        enrollmentToken: { type: 'string' },
        expiresInSeconds: { type: 'number' },
      },
    },
  },
};

export const verifyEmailSchema = {
  description: 'Verify Email OTP Enrollment',
  tags: ['MFA'],
  body: {
    type: 'object',
    required: ['enrollmentToken', 'code'],
    properties: {
      enrollmentToken: { type: 'string', minLength: 1 },
      code: {
        type: 'string',
        pattern: '^[0-9]{6}$',
        description: '6-digit code sent via email',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        method: { type: 'object' },
        message: { type: 'string' },
      },
    },
  },
};

export const mfaChallengeSchema = {
  description: 'Complete MFA Challenge During Login',
  tags: ['MFA', 'Authentication'],
  body: {
    type: 'object',
    required: ['challengeToken', 'method', 'code'],
    properties: {
      challengeToken: { type: 'string', minLength: 1 },
      method: {
        type: 'string',
        enum: ['totp', 'sms', 'email', 'recovery'],
      },
      code: {
        type: 'string',
        minLength: 6,
        maxLength: 14,
        description: '6-digit OTP or recovery code (XXXX-XXXX-XXXX)',
      },
      trustDevice: {
        type: 'boolean',
        description: 'Whether to remember this device for 30 days',
      },
      deviceFingerprint: {
        type: 'string',
        description: 'Device fingerprint for trusted device',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'string' },
        user: { type: 'object' },
      },
    },
  },
};

export const sendMFACodeSchema = {
  description: 'Send OTP Code for SMS or Email MFA During Login Challenge',
  tags: ['MFA', 'Authentication'],
  body: {
    type: 'object',
    required: ['challengeToken', 'method'],
    properties: {
      challengeToken: { type: 'string', minLength: 1 },
      method: {
        type: 'string',
        enum: ['sms', 'email'],
        description: 'MFA method to send code for',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        method: { type: 'string' },
        message: { type: 'string' },
        expiresInSeconds: { type: 'number' },
      },
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const disableMFAMethodSchema = {
  description: 'Disable an MFA Method',
  tags: ['MFA'],
  params: {
    type: 'object',
    required: ['method'],
    properties: {
      method: {
        type: 'string',
        enum: ['totp', 'sms', 'email'],
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      password: {
        type: 'string',
        description: 'Current password for verification',
      },
      mfaCode: {
        type: 'string',
        pattern: '^[0-9]{6}$',
        description: 'Code from another active MFA method',
      },
    },
    anyOf: [{ required: ['password'] }, { required: ['mfaCode'] }],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
};

export const listMFAMethodsSchema = {
  description: 'List User MFA Methods',
  tags: ['MFA'],
  response: {
    200: {
      type: 'object',
      properties: {
        methods: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              status: { type: 'string' },
              enrolledAt: { type: 'string' },
              lastUsedAt: { type: 'string' },
              maskedInfo: { type: 'string' },
            },
          },
        },
        hasActiveMFA: { type: 'boolean' },
        recoveryCodesRemaining: { type: 'number' },
      },
    },
  },
};

export const generateRecoveryCodesSchema = {
  description: 'Generate New Recovery Codes',
  tags: ['MFA'],
  body: {
    type: 'object',
    properties: {
      password: { type: 'string' },
      mfaCode: { type: 'string', pattern: '^[0-9]{6}$' },
    },
    anyOf: [{ required: ['password'] }, { required: ['mfaCode'] }],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        recoveryCodes: {
          type: 'array',
          items: { type: 'string' },
        },
        generatedAt: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const getMFAPolicySchema = {
  description: 'Get Tenant MFA Policy',
  tags: ['MFA', 'Admin'],
  params: {
    type: 'object',
    required: ['tenantId'],
    properties: {
      tenantId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        policy: { type: 'object' },
      },
    },
  },
};

export const updateMFAPolicySchema = {
  description: 'Update Tenant MFA Policy',
  tags: ['MFA', 'Admin'],
  params: {
    type: 'object',
    required: ['tenantId'],
    properties: {
      tenantId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      enforcement: {
        type: 'string',
        enum: ['off', 'optional', 'required'],
      },
      gracePeriodDays: {
        type: 'number',
        minimum: 0,
        maximum: 90,
      },
      allowedMethods: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['totp', 'sms', 'email'],
        },
        minItems: 1,
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        policy: { type: 'object' },
      },
    },
  },
};
