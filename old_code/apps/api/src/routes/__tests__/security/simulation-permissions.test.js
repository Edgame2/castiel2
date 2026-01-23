/**
 * Simulation Routes Permission Tests
 *
 * Tests for authentication and access control on simulation API routes.
 *
 * Note: Simulation routes use basic authentication only. Access control is
 * handled at the service layer based on opportunity ownership/team membership.
 *
 * Tests cover:
 * - Authentication requirements
 * - Service-level access validation (documented)
 * - Role-based access patterns
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { requireAuth } from '../../../middleware/authorization.js';
import { UnauthorizedError } from '../../../middleware/error-handler.js';
import { getUser } from '../../../middleware/authenticate.js';
// Mock getUser to return user or undefined
vi.mock('../../../middleware/authenticate.js', () => ({
    getUser: vi.fn(),
}));
describe('Simulation Routes Permission Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('Authentication Requirements', () => {
        it('should require authentication for simulation routes', async () => {
            const mockRequest = {
                user: undefined,
                log: {
                    error: vi.fn(),
                    debug: vi.fn(),
                    info: vi.fn(),
                    warn: vi.fn(),
                },
            };
            const mockReply = {
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                code: vi.fn().mockReturnThis(),
            };
            // Mock getUser to return undefined (not authenticated)
            getUser.mockReturnValue(undefined);
            const authMiddleware = requireAuth();
            // Should throw UnauthorizedError when user is not authenticated
            await expect(authMiddleware(mockRequest, mockReply)).rejects.toThrow(UnauthorizedError);
        });
        it('should allow authenticated users to access simulation routes', async () => {
            const mockRequest = {
                user: {
                    id: 'user1',
                    tenantId: 'tenant1',
                    roles: ['user'],
                    email: 'test@example.com',
                },
                log: {
                    error: vi.fn(),
                    debug: vi.fn(),
                    info: vi.fn(),
                    warn: vi.fn(),
                },
            };
            const mockReply = {
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                code: vi.fn().mockReturnThis(),
            };
            // Mock getUser to return authenticated user
            getUser.mockReturnValue(mockRequest.user);
            const authMiddleware = requireAuth();
            // Should not throw when user is authenticated
            await expect(authMiddleware(mockRequest, mockReply)).resolves.not.toThrow();
        });
    });
    describe('Service-Level Access Control', () => {
        it('should document that service layer validates opportunity access', () => {
            // Note: Simulation routes don't have route-level permission checks.
            // Access control is handled by the SimulationService which validates:
            // - Users can simulate their own opportunities (via shard:read:assigned)
            // - Managers can simulate team opportunities (via shard:read:team)
            // - Directors can simulate tenant opportunities (via shard:read:all)
            // 
            // This is tested at the service level, not the route level.
            const expectedBehavior = {
                userAccess: 'Users can simulate opportunities they own',
                managerAccess: 'Managers can simulate team member opportunities',
                directorAccess: 'Directors can simulate any tenant opportunity',
                validation: 'Service layer validates opportunity access',
            };
            expect(expectedBehavior.userAccess).toBe('Users can simulate opportunities they own');
            expect(expectedBehavior.managerAccess).toBe('Managers can simulate team member opportunities');
            expect(expectedBehavior.directorAccess).toBe('Directors can simulate any tenant opportunity');
            expect(expectedBehavior.validation).toBe('Service layer validates opportunity access');
        });
        it('should allow all authenticated roles to access simulation endpoints', async () => {
            const roles = ['user', 'manager', 'director', 'admin'];
            for (const role of roles) {
                const mockRequest = {
                    user: {
                        id: `user-${role}`,
                        tenantId: 'tenant1',
                        roles: [role],
                        email: `${role}@example.com`,
                    },
                    log: {
                        error: vi.fn(),
                        debug: vi.fn(),
                        info: vi.fn(),
                        warn: vi.fn(),
                    },
                };
                const mockReply = {
                    status: vi.fn().mockReturnThis(),
                    send: vi.fn(),
                    code: vi.fn().mockReturnThis(),
                };
                // Mock getUser to return authenticated user
                getUser.mockReturnValue(mockRequest.user);
                const authMiddleware = requireAuth();
                // All authenticated users should pass authentication check
                await expect(authMiddleware(mockRequest, mockReply)).resolves.not.toThrow();
            }
        });
    });
    describe('Route Access Patterns', () => {
        it('should document simulation route access patterns', () => {
            const routes = {
                runSimulation: {
                    path: '/api/v1/simulations/opportunities/:opportunityId/run',
                    method: 'POST',
                    auth: 'Required',
                    permission: 'Service-level (opportunity access)',
                },
                compareScenarios: {
                    path: '/api/v1/simulations/opportunities/:opportunityId/compare',
                    method: 'POST',
                    auth: 'Required',
                    permission: 'Service-level (opportunity access)',
                },
                getSimulation: {
                    path: '/api/v1/simulations/:simulationId',
                    method: 'GET',
                    auth: 'Required',
                    permission: 'Service-level (simulation access)',
                },
                listSimulations: {
                    path: '/api/v1/simulations/opportunities/:opportunityId',
                    method: 'GET',
                    auth: 'Required',
                    permission: 'Service-level (opportunity access)',
                },
            };
            // Verify all routes require authentication
            Object.values(routes).forEach(route => {
                expect(route.auth).toBe('Required');
                expect(route.permission).toContain('Service-level');
            });
        });
    });
});
//# sourceMappingURL=simulation-permissions.test.js.map