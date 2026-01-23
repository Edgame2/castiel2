# Frontend ↔ Backend Contract Verification

**Date**: 2025-01-27  
**Gap**: I1 - Frontend ↔ Backend Contract Mismatches  
**Status**: In Progress

## Objective

Systematically verify that all IPC handlers correctly call backend API routes with matching:
- HTTP methods (GET/POST/PUT/DELETE)
- URL paths and parameters
- Request body formats
- Response formats
- Error handling

## Verification Methodology

For each IPC handler:
1. Extract the API call (URL, method, body)
2. Find the corresponding backend route
3. Verify:
   - HTTP method matches
   - URL path matches (including parameter names)
   - Request body structure matches route expectations
   - Response structure matches handler expectations
   - Error handling is consistent

## Module-by-Module Verification

### ✅ Calendar Module

**IPC Handler**: `src/main/ipc/calendarHandlers.ts`  
**Backend Routes**: `server/src/routes/calendar.ts`

| IPC Handler | HTTP Method | IPC Call | Backend Route | Status |
|------------|-------------|----------|---------------|--------|
| `calendar:listEvents` | GET | `/api/calendar/events?{filters}` | `GET /api/calendar/events` | ✅ Match |
| `calendar:getEvent` | GET | `/api/calendar/events/:eventId` | `GET /api/calendar/events/:eventId` | ✅ Match |
| `calendar:createEvent` | POST | `/api/calendar/events` | `POST /api/calendar/events` | ✅ Match |
| `calendar:updateEvent` | PUT | `/api/calendar/events/:eventId` | `PUT /api/calendar/events/:eventId` | ✅ Match |
| `calendar:deleteEvent` | DELETE | `/api/calendar/events/:eventId` | `DELETE /api/calendar/events/:eventId` | ✅ Match |
| `calendar:detectConflicts` | POST | `/api/calendar/events/:eventId/conflicts` | `POST /api/calendar/events/:eventId/conflicts` | ✅ Match |
| `calendar:listConflicts` | GET | `/api/calendar/conflicts?{filters}` | `GET /api/calendar/conflicts` | ✅ Match |
| `calendar:predictTimeline` | POST | `/api/calendar/timeline/predict` | `POST /api/calendar/timeline/predict` | ✅ Match |
| `calendar:listPredictions` | GET | `/api/calendar/timeline/predictions?{filters}` | `GET /api/calendar/timeline/predictions` | ✅ Match |
| `calendar:createEventsFromPlanStep` | POST | `/api/calendar/plan-steps/:planStepId/events` | `POST /api/calendar/plan-steps/:planStepId/events` | ✅ Match |
| `calendar:scheduleAgent` | POST | `/api/calendar/agents/:agentId/schedule` | `POST /api/calendar/agents/:agentId/schedule` | ✅ Match |

**Status**: ✅ All 11 handlers verified - Contracts match

---

### ✅ Messaging Module

**IPC Handler**: `src/main/ipc/messagingHandlers.ts`  
**Backend Routes**: `server/src/routes/messaging.ts`

| IPC Handler | HTTP Method | IPC Call | Backend Route | Status |
|------------|-------------|----------|---------------|--------|
| `messaging:listConversations` | GET | `/api/messaging/conversations?{filters}` | `GET /api/messaging/conversations` | ✅ Match |
| `messaging:getConversation` | GET | `/api/messaging/conversations/:conversationId` | `GET /api/messaging/conversations/:conversationId` | ✅ Match |
| `messaging:createConversation` | POST | `/api/messaging/conversations` | `POST /api/messaging/conversations` | ✅ Match |
| `messaging:listMessages` | GET | `/api/messaging/conversations/:conversationId/messages?{filters}` | `GET /api/messaging/conversations/:conversationId/messages` | ✅ Match |
| `messaging:getMessage` | GET | `/api/messaging/messages/:messageId` | `GET /api/messaging/messages/:messageId` | ✅ Match |
| `messaging:createMessage` | POST | `/api/messaging/messages` | `POST /api/messaging/messages` | ✅ Match |
| `messaging:updateMessage` | PUT | `/api/messaging/messages/:messageId` | `PUT /api/messaging/messages/:messageId` | ✅ Match |
| `messaging:deleteMessage` | DELETE | `/api/messaging/messages/:messageId` | `DELETE /api/messaging/messages/:messageId` | ✅ Match |
| `messaging:captureDecision` | POST | `/api/messaging/decisions` | `POST /api/messaging/decisions` | ✅ Match |
| `messaging:getDecision` | GET | `/api/messaging/decisions/:decisionId` | `GET /api/messaging/decisions/:decisionId` | ✅ Match |
| `messaging:listDecisions` | GET | `/api/messaging/conversations/:conversationId/decisions` | `GET /api/messaging/conversations/:conversationId/decisions` | ✅ Match |
| `messaging:createEscalation` | POST | `/api/messaging/escalations` | `POST /api/messaging/escalations` | ✅ Match |
| `messaging:resolveEscalation` | POST | `/api/messaging/escalations/:escalationId/resolve` | `POST /api/messaging/escalations/:escalationId/resolve` | ✅ Match |
| `messaging:listEscalations` | GET | `/api/messaging/escalations?{filters}` | `GET /api/messaging/escalations` | ✅ Match |
| `messaging:createThread` | POST | `/api/messaging/conversations/:conversationId/threads` | `POST /api/messaging/conversations/:conversationId/threads` | ✅ Match |
| `messaging:listThreads` | GET | `/api/messaging/conversations/:conversationId/threads` | `GET /api/messaging/conversations/:conversationId/threads` | ✅ Match |

**Status**: ✅ All 16 handlers verified - Contracts match

---

### ⏳ Knowledge Base Module

**IPC Handler**: `src/main/ipc/knowledgeHandlers.ts`  
**Backend Routes**: `server/src/routes/knowledge.ts`

**Verification Needed**: Check all 17 handlers match backend routes

---

### ⏳ Code Reviews Module

**IPC Handler**: `src/main/ipc/reviewHandlers.ts`  
**Backend Routes**: `server/src/routes/reviews.ts`

**Verification Needed**: Check all 12 handlers match backend routes

---

### ⏳ Incidents & RCA Module

**IPC Handler**: `src/main/ipc/incidentHandlers.ts`  
**Backend Routes**: `server/src/routes/incidents.ts`

**Verification Needed**: Check all 12 handlers match backend routes

---

### ⏳ Learning & Skills Module

**IPC Handler**: `src/main/ipc/learningHandlers.ts`  
**Backend Routes**: `server/src/routes/learning.ts`

**Verification Needed**: Check all 18 handlers match backend routes

---

### ⏳ Architecture Design Module

**IPC Handler**: `src/main/ipc/architectureHandlers.ts`  
**Backend Routes**: `server/src/routes/architecture.ts`

**Verification Needed**: Check all 17 handlers match backend routes

---

### ⏳ Release Management Module

**IPC Handler**: `src/main/ipc/releaseHandlers.ts`  
**Backend Routes**: `server/src/routes/releases.ts`

**Verification Needed**: Check all 17 handlers match backend routes

---

### ⏳ Dependency Tracking Module

**IPC Handler**: `src/main/ipc/dependencyHandlers.ts`  
**Backend Routes**: `server/src/routes/dependencies.ts`

**Verification Needed**: Check all 14 handlers match backend routes

---

### ⏳ Experimentation Module

**IPC Handler**: `src/main/ipc/experimentHandlers.ts`  
**Backend Routes**: `server/src/routes/experiments.ts`

**Verification Needed**: Check all 14 handlers match backend routes

---

### ⏳ Technical Debt Module

**IPC Handler**: `src/main/ipc/debtHandlers.ts`  
**Backend Routes**: `server/src/routes/debt.ts`

**Verification Needed**: Check all 12 handlers match backend routes

---

### ⏳ Remote Pairing Module

**IPC Handler**: `src/main/ipc/pairingHandlers.ts`  
**Backend Routes**: `server/src/routes/pairing.ts`

**Verification Needed**: Check all 15 handlers match backend routes

---

### ⏳ Capacity Planning Module

**IPC Handler**: `src/main/ipc/capacityHandlers.ts`  
**Backend Routes**: `server/src/routes/capacity.ts`

**Verification Needed**: Check all 16 handlers match backend routes

---

### ⏳ Pattern Library Module

**IPC Handler**: `src/main/ipc/patternHandlers.ts`  
**Backend Routes**: `server/src/routes/patterns.ts`

**Verification Needed**: Check all 14 handlers match backend routes

---

### ⏳ Observability Module

**IPC Handler**: `src/main/ipc/observabilityHandlers.ts`  
**Backend Routes**: `server/src/routes/observability.ts`

**Verification Needed**: Check all 12 handlers match backend routes

---

### ⏳ Compliance & Audit Module

**IPC Handler**: `src/main/ipc/complianceHandlers.ts`  
**Backend Routes**: `server/src/routes/compliance.ts`

**Verification Needed**: Check all 19 handlers match backend routes

---

### ⏳ Innovation & Ideas Module

**IPC Handler**: `src/main/ipc/innovationHandlers.ts`  
**Backend Routes**: `server/src/routes/innovation.ts`

**Verification Needed**: Check all 13 handlers match backend routes

---

### ✅ Workflow Orchestration Module

**IPC Handler**: `src/main/ipc/workflowHandlers.ts`  
**Backend Routes**: `server/src/routes/workflows.ts`

| IPC Handler | HTTP Method | IPC Call | Backend Route | Status |
|------------|-------------|----------|---------------|--------|
| `workflow:list` | GET | `/api/workflows?{filters}` | `GET /api/workflows` | ✅ Match |
| `workflow:get` | GET | `/api/workflows/:workflowId` | `GET /api/workflows/:workflowId` | ✅ Match |
| `workflow:create` | POST | `/api/workflows` | `POST /api/workflows` | ✅ Match |
| `workflow:update` | PUT | `/api/workflows/:workflowId` | `PUT /api/workflows/:workflowId` | ✅ Match |
| `workflow:delete` | DELETE | `/api/workflows/:workflowId` | `DELETE /api/workflows/:workflowId` | ✅ Match |
| `workflow:execute` | POST | `/api/workflows/:workflowId/execute` | `POST /api/workflows/:workflowId/execute` | ✅ Match |
| `workflow:listRuns` | GET | `/api/workflows/:workflowId/runs?{filters}` | `GET /api/workflows/:workflowId/runs` | ✅ Match |
| `workflow:getRun` | GET | `/api/workflows/:workflowId/runs/:runId` | `GET /api/workflows/:workflowId/runs/:runId` | ✅ Match |
| `workflow:resume` | POST | `/api/workflows/:workflowId/runs/:runId/resume` | `POST /api/workflows/:workflowId/runs/:runId/resume` | ✅ Match |
| `workflow:rollback` | POST | `/api/workflows/:workflowId/runs/:runId/rollback` | `POST /api/workflows/:workflowId/runs/:runId/rollback` | ✅ Match |
| `workflow:pause` | POST | `/api/workflows/:workflowId/runs/:runId/pause` | `POST /api/workflows/:workflowId/runs/:runId/pause` | ✅ Match |
| `workflow:cancel` | POST | `/api/workflows/:workflowId/runs/:runId/cancel` | `POST /api/workflows/:workflowId/runs/:runId/cancel` | ✅ Match |

**Status**: ✅ All 12 handlers verified - Contracts match

---

### ✅ Task Management Module

**IPC Handler**: `src/main/ipc/taskHandlers.ts`  
**Backend Routes**: `server/src/routes/tasks.ts`

| IPC Handler | HTTP Method | IPC Call | Backend Route | Status |
|------------|-------------|----------|---------------|--------|
| `task:list` | GET | `/api/tasks?{filters}` | `GET /api/tasks` | ✅ Match |
| `task:get` | GET | `/api/tasks/:taskId` | `GET /api/tasks/:taskId` | ✅ Match |
| `task:create` | POST | `/api/tasks` | `POST /api/tasks` | ✅ Match |
| `task:update` | PUT | `/api/tasks/:taskId` | `PUT /api/tasks/:taskId` | ✅ Match |
| `task:delete` | DELETE | `/api/tasks/:taskId` | `DELETE /api/tasks/:taskId` | ✅ Match |
| `task:assign` | POST | `/api/tasks/:taskId/assign` | `POST /api/tasks/:taskId/assign` | ✅ Match |
| `task:unassign` | POST | `/api/tasks/:taskId/unassign` | `POST /api/tasks/:taskId/unassign` | ✅ Match |
| `task:complete` | POST | `/api/tasks/:taskId/complete` | `POST /api/tasks/:taskId/complete` | ✅ Match |
| `task:getReattributionRecommendations` | GET | `/api/projects/:projectId/task-reattribution` | ⚠️ Not in tasks.ts (should be in projects.ts) | ⚠️ Needs verification |

**Status**: ✅ 8/9 handlers verified - 1 handler calls project route (needs verification in projects.ts)

---

### ⏳ Roadmap Management Module

**IPC Handler**: `src/main/ipc/roadmapHandlers.ts`  
**Backend Routes**: `server/src/routes/roadmaps.ts`

**Verification Needed**: Check all 15 handlers match backend routes

---

### ⏳ Module Management Module

**IPC Handler**: `src/main/ipc/moduleHandlers.ts`  
**Backend Routes**: `server/src/routes/modules.ts`

**Verification Needed**: Check all 6 handlers match backend routes

---

### ⏳ Environment Management Module

**IPC Handler**: `src/main/ipc/environmentHandlers.ts`  
**Backend Routes**: `server/src/routes/environments.ts`

**Verification Needed**: Check all 6 handlers match backend routes

---

### ⏳ Issue Management Module

**IPC Handler**: `src/main/ipc/issueHandlers.ts`  
**Backend Routes**: `server/src/routes/issues.ts`

**Verification Needed**: Check all 3 handlers match backend routes

---

## Summary

- **Total Modules**: 22
- **Verified**: 4 (Calendar, Messaging, Tasks, Workflows)
- **Pending**: 18
- **Total Handlers**: ~258+
- **Verified Handlers**: 48 (11 + 16 + 8 + 12 + 1 note)
- **Pending Handlers**: ~210+

## Next Steps

1. Systematically verify each module's IPC handlers against backend routes
2. Document any mismatches found
3. Fix mismatches before adding unit tests
4. Use verified contracts as basis for unit tests

## Notes

- Calendar module is fully verified and has unit tests
- All other modules need contract verification
- Contract verification should be done before adding unit tests to ensure tests verify correct behavior
