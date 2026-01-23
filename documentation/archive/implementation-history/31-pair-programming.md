# Pair Programming Module

**Category:** Productivity & Workflow  
**Location:** `src/core/pairing/`  
**Last Updated:** 2025-01-27

---

## Overview

The Pair Programming Module provides remote collaboration and pair programming for the Coder IDE. It includes shared editor sessions, role-based control, presence management, and integration with code reviews.

## Purpose

- Pair programming sessions
- Shared editor sessions
- Role-based control (Driver/Navigator)
- Presence management
- Async collaboration
- Code review integration
- Session recording

---

## Key Components

### 1. Pairing Session Manager (`PairingSessionManager.ts`)

**Location:** `src/core/pairing/PairingSessionManager.ts`

**Purpose:** Core pairing session management

**Features:**
- Real-time collaborative editing
- Driver/Navigator role switching
- Shared terminal
- Voice/video support
- Session recording

**Key Methods:**
```typescript
async createSession(title: string, participants: string[], options?: SessionOptions): Promise<PairingSession>
async switchRoles(sessionId: string, newDriverId: string, newNavigatorId: string): Promise<void>
async endSession(sessionId: string): Promise<void>
```

### 2. Presence Manager (`PresenceManager.ts`)

**Location:** `src/core/pairing/PresenceManager.ts`

**Purpose:** User presence management

**Features:**
- Online/offline status
- Active session tracking
- Last seen tracking

### 3. Async Collaboration Manager (`AsyncCollaborationManager.ts`)

**Location:** `src/core/pairing/AsyncCollaborationManager.ts`

**Purpose:** Async collaboration

**Features:**
- Async comments
- Code annotations
- Time-delayed collaboration

### 4. Pairing Code Review Integrator (`PairingCodeReviewIntegrator.ts`)

**Location:** `src/core/pairing/PairingCodeReviewIntegrator.ts`

**Purpose:** Integrate pairing with code reviews

**Features:**
- Create pairing from reviews
- Collaborative code review
- Review-pairing linking

### 5. Pairing History Manager (`PairingHistoryManager.ts`)

**Location:** `src/core/pairing/PairingHistoryManager.ts`

**Purpose:** Pairing history tracking

**Features:**
- Session history
- Statistics
- Analytics

### 6. Annotation Manager (`AnnotationManager.ts`)

**Location:** `src/core/pairing/AnnotationManager.ts`

**Purpose:** Code annotation management

**Features:**
- Code annotations
- Shared annotations
- Annotation threads

---

## Pairing Sessions

### Session Model

```typescript
interface PairingSession {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  sessionType: 'pairing' | 'mob' | 'async';
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  driverId?: string;
  navigatorId?: string;
  participants: string[];
  sharedEditor: boolean;
  sharedTerminal: boolean;
  voiceVideoEnabled: boolean;
  recordingEnabled: boolean;
  currentFile?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // Minutes
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Session Types

- `pairing` - Standard pair programming
- `mob` - Mob programming (3+ participants)
- `async` - Async collaboration

---

## Role-Based Control

### Driver/Navigator Pattern

- **Driver** - Controls keyboard/mouse, writes code
- **Navigator** - Reviews, guides, suggests
- **Role Switching** - Seamless role switching
- **Control Transfer** - Transfer control between participants

### Role Switching

```typescript
// Switch roles
await sessionManager.switchRoles(
  sessionId,
  newDriverId,
  newNavigatorId
);
```

---

## Shared Editor

### Real-Time Collaboration

- **Shared Cursor** - See partner's cursor
- **Shared Selection** - See partner's selection
- **Live Editing** - Real-time code changes
- **Conflict Resolution** - Automatic conflict resolution

### Shared Terminal

- **Shared Terminal** - Shared terminal session
- **Command History** - Shared command history
- **Output Sharing** - Shared output

---

## Presence Management

### User Presence

```typescript
interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  activeSessionId?: string;
  lastSeen: Date;
}
```

### Presence Tracking

- Online/offline status
- Active session indication
- Last seen timestamp
- Availability status

---

## Code Review Integration

### Pair-Review

```typescript
// Create pairing session from code review
const { sessionId, conversationId } = await integrator.createPairingFromReview(
  reviewId,
  participants,
  {
    title: 'Pair Review: Feature PR',
    sharedEditor: true,
    voiceVideoEnabled: true,
  }
);
```

---

## Usage Examples

### Create Pairing Session

```typescript
// Create pairing session
const session = await sessionManager.createSession(
  'Implement authentication',
  [userId1, userId2],
  {
    projectId: projectId,
    sessionType: 'pairing',
    sharedEditor: true,
    sharedTerminal: true,
    voiceVideoEnabled: true,
    recordingEnabled: false,
  }
);

// Start session
await sessionManager.startSession(session.id);

// Switch roles
await sessionManager.switchRoles(session.id, userId2, userId1);

// End session
await sessionManager.endSession(session.id);
```

### Async Collaboration

```typescript
// Create async comment
const comment = await asyncManager.createComment({
  filePath: 'src/components/Button.tsx',
  lineNumber: 42,
  content: 'Consider extracting this logic',
  authorId: userId,
});
```

---

## Related Modules

- **Code Reviews Module** - Pair-review integration
- **Calendar Module** - Session scheduling
- **Messaging Module** - Session communication

---

## Summary

The Pair Programming Module provides comprehensive remote collaboration and pair programming for the Coder IDE. With shared editor sessions, role-based control, presence management, and code review integration, it enables effective pair programming throughout the development workflow.
