/**
 * Unit tests for TenantTemplateService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantTemplateService } from '../../../src/services/TenantTemplateService';
import { getContainer } from '@coder/shared';

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return { ...actual, getContainer: vi.fn() };
});

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    cosmos_db: { containers: { recommendation_config: 'recommendation_config' } },
  })),
}));

vi.mock('../../../src/services/FeedbackService', () => ({
  FeedbackService: vi.fn().mockImplementation(function (this: any) {
    this.updateTenantFeedbackConfig = vi.fn().mockResolvedValue(undefined);
  }),
}));

const mockGetContainer = vi.mocked(getContainer);

describe('TenantTemplateService', () => {
  let service: TenantTemplateService;

  beforeEach(() => {
    vi.clearAllMocks();
    const mockItem = {
      read: vi.fn().mockResolvedValue({ resource: null }),
      replace: vi.fn(),
      delete: vi.fn(),
    };
    const mockItems = {
      create: vi.fn(),
      query: vi.fn().mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      }),
    };
    mockGetContainer.mockReturnValue({
      items: mockItems,
      item: vi.fn(() => mockItem),
    } as any);
    service = new TenantTemplateService();
  });

  describe('listTemplates', () => {
    it('returns sorted templates from query', async () => {
      const templates = [
        { id: 'tenant_template_1', name: 'T1', updatedAt: '2024-01-02' },
        { id: 'tenant_template_2', name: 'T2', updatedAt: '2024-01-01' },
      ];
      const container = mockGetContainer();
      (container.items.query as ReturnType<typeof vi.fn>)()
        .fetchAll = vi.fn().mockResolvedValue({ resources: templates });
      const result = await service.listTemplates();
      expect(result).toHaveLength(2);
      expect(result[0].updatedAt).toBe('2024-01-02');
    });
  });

  describe('getTemplate', () => {
    it('returns null when not found', async () => {
      const result = await service.getTemplate('tenant_template_1');
      expect(result).toBeNull();
    });

    it('returns template when found', async () => {
      const doc = { id: 'tenant_template_1', name: 'T1', updatedAt: new Date().toISOString() };
      const container = mockGetContainer();
      (container.item as ReturnType<typeof vi.fn>)()
        .read = vi.fn().mockResolvedValue({ resource: doc });
      const result = await service.getTemplate('tenant_template_1');
      expect(result).toEqual(doc);
    });

    it('prepends prefix when id does not start with tenant_template_', async () => {
      const container = mockGetContainer();
      const itemFn = container.item as ReturnType<typeof vi.fn>;
      itemFn.mockReturnValue({ read: vi.fn().mockResolvedValue({ resource: null }) });
      await service.getTemplate('abc');
      expect(itemFn).toHaveBeenCalledWith('tenant_template_abc', '_global');
    });
  });

  describe('createTemplate', () => {
    it('creates and returns template', async () => {
      const input = {
        name: 'New Template',
        feedbackConfig: {
          activeLimit: 10,
          activeTypes: [],
          requireFeedback: false,
          allowComments: true,
          commentRequired: false,
          allowMultipleSelection: false,
          patternDetection: {},
        } as any,
      };
      const container = mockGetContainer();
      (container.items.create as ReturnType<typeof vi.fn>).mockImplementation((doc: any) =>
        Promise.resolve(doc)
      );
      const result = await service.createTemplate(input, 'user-1');
      expect(result.name).toBe(input.name);
      expect(result.id).toMatch(/^tenant_template_/);
      expect(container.items.create).toHaveBeenCalled();
    });
  });
});
