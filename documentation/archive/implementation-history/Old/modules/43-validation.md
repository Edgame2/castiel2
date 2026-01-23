# Validation Module

**Category:** Shared & Common  
**Location:** `src/core/validation/`  
**Last Updated:** 2025-01-27

---

## Overview

The Validation Module provides data validation and sanitization utilities for the Coder IDE application. It includes validation schemas, sanitization functions, and validation pipelines using Zod and custom validators.

## Purpose

- Input validation
- Data sanitization
- Schema validation
- Type validation
- Security validation
- Invariant validation

---

## Key Components

### 1. Validation Schemas

**Location:** Various validation files

**Purpose:** Define validation rules

**Technologies:**
- Zod schemas
- Custom validators
- Type guards

### 2. Invariant System (`InvariantSystem.ts`, `InvariantValidator.ts`, `InvariantProver.ts`)

**Location:** `src/core/validation/InvariantSystem.ts`, etc.

**Purpose:** Invariant validation

**Features:**
- Invariant definition
- Invariant checking
- Invariant proving
- Invariant violation detection

### 3. Version Validation (`VersionValidator.ts`, `VersionDetector.ts`)

**Location:** `src/core/validation/VersionValidator.ts`, etc.

**Purpose:** Version validation

**Features:**
- Version format validation
- Version comparison
- Version compatibility checking

### 4. Feature Availability Matrix (`FeatureAvailabilityMatrix.ts`)

**Location:** `src/core/validation/FeatureAvailabilityMatrix.ts`

**Purpose:** Feature availability validation

**Features:**
- Feature availability checking
- Feature dependency validation
- Feature compatibility

---

## Validation Patterns

### Zod Schemas

```typescript
import { z } from 'zod';

// Define schema
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150).optional(),
});

// Validate
const result = userSchema.safeParse(data);
if (result.success) {
  const user = result.data; // Type-safe
} else {
  const errors = result.error.errors;
}
```

### Custom Validators

```typescript
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhoneNumber(phone: string): boolean {
  // E.164 format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}
```

---

## Input Sanitization

### String Sanitization

```typescript
function sanitizeString(input: string): string {
  // Remove dangerous characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
}
```

### HTML Sanitization

```typescript
function sanitizeHTML(html: string): string {
  // Remove script tags
  // Remove event handlers
  // Allow safe HTML only
  return sanitize(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    allowedAttributes: {},
  });
}
```

### URL Validation

```typescript
function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

---

## Invariant Validation

### Invariant Definition

```typescript
interface Invariant {
  name: string;
  condition: (data: any) => boolean;
  message: string;
}

// Example: Task dependencies must be acyclic
const acyclicDependencyInvariant: Invariant = {
  name: 'acyclic-dependencies',
  condition: (task: Task) => {
    // Check for cycles in dependencies
    return !hasCycle(task.dependencies);
  },
  message: 'Task dependencies must be acyclic',
};
```

### Invariant Checking

```typescript
const invariantSystem = new InvariantSystem();

// Register invariants
invariantSystem.register(acyclicDependencyInvariant);

// Check invariants
const violations = await invariantSystem.check(task);

if (violations.length > 0) {
  throw new Error(`Invariant violations: ${violations.map(v => v.message).join(', ')}`);
}
```

---

## Version Validation

### Version Format

```typescript
interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

// Parse version
const version = parseVersion('1.2.3');

// Compare versions
const comparison = compareVersions('1.2.3', '1.2.4'); // -1, 0, or 1

// Check compatibility
const isCompatible = isVersionCompatible('1.2.3', '^1.2.0'); // true
```

---

## Feature Availability

### Feature Matrix

```typescript
const featureMatrix = new FeatureAvailabilityMatrix();

// Check feature availability
const isAvailable = featureMatrix.isFeatureAvailable(
  'feature-name',
  {
    organizationTier: 'enterprise',
    userRole: 'admin',
  }
);

// Check feature dependencies
const dependencies = featureMatrix.getDependencies('feature-name');
```

---

## Validation Pipelines

### Pipeline Pattern

```typescript
async function validateData(data: any): Promise<ValidationResult> {
  // Step 1: Type validation
  const typeResult = validateType(data);
  if (!typeResult.valid) return typeResult;

  // Step 2: Schema validation
  const schemaResult = validateSchema(data);
  if (!schemaResult.valid) return schemaResult;

  // Step 3: Business rule validation
  const businessResult = validateBusinessRules(data);
  if (!businessResult.valid) return businessResult;

  // Step 4: Invariant validation
  const invariantResult = validateInvariants(data);
  if (!invariantResult.valid) return invariantResult;

  return { valid: true };
}
```

---

## Security Validation

### Input Validation

- SQL injection prevention
- XSS prevention
- Command injection prevention
- Path traversal prevention

### Sanitization

```typescript
function sanitizeInput(input: string): string {
  // Remove SQL injection patterns
  input = input.replace(/['";\\]/g, '');
  
  // Remove XSS patterns
  input = input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // Remove command injection patterns
  input = input.replace(/[;&|`$(){}[\]]/g, '');
  
  return input;
}
```

---

## Usage Examples

### Validate User Input

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase'),
});

// Validate
const result = createUserSchema.safeParse(userData);
if (!result.success) {
  return { error: result.error.errors };
}

const validatedData = result.data;
```

### Validate with Invariants

```typescript
const invariantSystem = new InvariantSystem();

// Register task invariants
invariantSystem.register({
  name: 'no-circular-dependencies',
  condition: (task: Task) => !hasCircularDependency(task),
  message: 'Task cannot have circular dependencies',
});

// Validate task
const violations = await invariantSystem.check(task);
if (violations.length > 0) {
  throw new ValidationError(violations);
}
```

---

## Related Modules

- **Shared Types Module** - Types used in validation
- **Middleware Module** - Uses validation
- **API Server Module** - Request validation

---

## Summary

The Validation Module provides comprehensive data validation and sanitization for the Coder IDE application. With Zod schemas, custom validators, invariant checking, and security validation, it ensures data integrity and security throughout the application.
