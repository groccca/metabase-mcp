/**
 * Unit tests for the create/update handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleCreate } from '../../src/handlers/create/index.js';
import { McpError } from '../../src/types/core.js';
import {
  mockApiClient,
  mockLogger,
  resetAllMocks,
  createMockRequest,
} from '../setup.js';

// We need to control config.METABASE_WRITE_ENABLED across tests.
// The config module uses a test path that returns a static object, so we mock it.
vi.mock('../../src/config.js', async importOriginal => {
  const original = await importOriginal<typeof import('../../src/config.js')>();
  return {
    ...original,
    config: {
      ...original.config,
      METABASE_WRITE_ENABLED: true, // default to enabled for most tests
    },
  };
});

// Helper to get logger functions without logWarn (create handler doesn't need it)
function getCreateLoggerFunctions() {
  return [mockLogger.logDebug, mockLogger.logInfo, mockLogger.logError] as const;
}

// Sample API responses
const createdCard = {
  id: 42,
  name: 'New Revenue Card',
  description: 'Revenue by month',
  database_id: 1,
  dataset_query: { type: 'native', native: { query: 'SELECT * FROM revenue' } },
  display: 'table',
  visualization_settings: {},
  collection_id: null,
  created_at: '2026-04-02T00:00:00.000Z',
  updated_at: '2026-04-02T00:00:00.000Z',
};

const updatedCard = {
  ...createdCard,
  id: 10,
  name: 'Updated Revenue Card',
};

const createdDashboard = {
  id: 99,
  name: 'New Dashboard',
  description: 'A fresh dashboard',
  collection_id: null,
  created_at: '2026-04-02T00:00:00.000Z',
  updated_at: '2026-04-02T00:00:00.000Z',
};

const updatedDashboard = {
  ...createdDashboard,
  id: 5,
  name: 'Updated Dashboard',
};

describe('handleCreate', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // ─── Write guard ──────────────────────────────────────────────────────────

  describe('METABASE_WRITE_ENABLED guard', () => {
    it('should throw McpError when METABASE_WRITE_ENABLED is false', async () => {
      // Re-mock config with writes disabled
      const { config } = await import('../../src/config.js');
      (config as any).METABASE_WRITE_ENABLED = false;

      const request = createMockRequest('create', {
        model: 'card',
        action: 'create',
        payload: { name: 'Test' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(McpError);

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow('Write operations are disabled');

      // Re-enable for subsequent tests
      (config as any).METABASE_WRITE_ENABLED = true;
    });
  });

  // ─── Validation ───────────────────────────────────────────────────────────

  describe('Parameter validation', () => {
    it('should throw when model is missing', async () => {
      const request = createMockRequest('create', {
        action: 'create',
        payload: { name: 'Test' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(McpError);
    });

    it('should throw when model is invalid', async () => {
      const request = createMockRequest('create', {
        model: 'table',
        action: 'create',
        payload: { name: 'Test' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(/Invalid or missing "model"/);
    });

    it('should throw when action is missing', async () => {
      const request = createMockRequest('create', {
        model: 'card',
        payload: { name: 'Test' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(McpError);
    });

    it('should throw when action is invalid', async () => {
      const request = createMockRequest('create', {
        model: 'card',
        action: 'delete',
        payload: { name: 'Test' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(/Invalid or missing "action"/);
    });

    it('should throw when action=update and id is missing', async () => {
      const request = createMockRequest('create', {
        model: 'card',
        action: 'update',
        payload: { name: 'Updated' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(/"id" is required for action "update"/);
    });

    it('should throw when payload is missing', async () => {
      const request = createMockRequest('create', {
        model: 'card',
        action: 'create',
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(/"payload" must be a non-null object/);
    });

    it('should throw when payload is not an object', async () => {
      const request = createMockRequest('create', {
        model: 'card',
        action: 'create',
        payload: 'not-an-object',
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(/"payload" must be a non-null object/);
    });

    it('should throw when creating a card without payload.name', async () => {
      const request = createMockRequest('create', {
        model: 'card',
        action: 'create',
        payload: { description: 'No name here' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(/"payload.name" is required to create a card/);
    });

    it('should throw when creating a dashboard without payload.name', async () => {
      const request = createMockRequest('create', {
        model: 'dashboard',
        action: 'create',
        payload: { description: 'No name here' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(/"payload.name" is required to create a dashboard/);
    });

    it('should throw when action=update with invalid (non-positive) id', async () => {
      const request = createMockRequest('create', {
        model: 'card',
        action: 'update',
        id: -1,
        payload: { name: 'Updated' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-1', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(/"id" must be a positive integer/);
    });
  });

  // ─── Card create ──────────────────────────────────────────────────────────

  describe('Card create', () => {
    it('should create a card and return formatted JSON', async () => {
      mockApiClient.createCard.mockResolvedValue(createdCard);

      const request = createMockRequest('create', {
        model: 'card',
        action: 'create',
        payload: {
          name: 'New Revenue Card',
          description: 'Revenue by month',
          dataset_query: { type: 'native', native: { query: 'SELECT * FROM revenue' } },
          display: 'table',
        },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      const result = await handleCreate(
        request,
        'req-1',
        mockApiClient as any,
        logDebug,
        logInfo,
        logError
      );

      expect(mockApiClient.createCard).toHaveBeenCalledOnce();
      expect(mockApiClient.createCard).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Revenue Card' })
      );
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(42);
      expect(parsed.name).toBe('New Revenue Card');
    });

    it('should log info on successful card create', async () => {
      mockApiClient.createCard.mockResolvedValue(createdCard);

      const request = createMockRequest('create', {
        model: 'card',
        action: 'create',
        payload: { name: 'New Revenue Card' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await handleCreate(request, 'req-2', mockApiClient as any, logDebug, logInfo, logError);

      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Successfully completed create for card',
        { requestId: 'req-2' }
      );
    });

    it('should pass the full payload to createCard', async () => {
      mockApiClient.createCard.mockResolvedValue(createdCard);

      const payload = {
        name: 'Full Payload Card',
        description: 'Desc',
        dataset_query: { type: 'native', native: { query: 'SELECT 1' } },
        display: 'bar',
        visualization_settings: { 'graph.dimensions': ['x'] },
        collection_id: 5,
      };

      const request = createMockRequest('create', {
        model: 'card',
        action: 'create',
        payload,
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await handleCreate(request, 'req-3', mockApiClient as any, logDebug, logInfo, logError);

      expect(mockApiClient.createCard).toHaveBeenCalledWith(payload);
    });
  });

  // ─── Card update ──────────────────────────────────────────────────────────

  describe('Card update', () => {
    it('should update a card and return formatted JSON', async () => {
      mockApiClient.updateCard.mockResolvedValue(updatedCard);

      const request = createMockRequest('create', {
        model: 'card',
        action: 'update',
        id: 10,
        payload: { name: 'Updated Revenue Card' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      const result = await handleCreate(
        request,
        'req-4',
        mockApiClient as any,
        logDebug,
        logInfo,
        logError
      );

      expect(mockApiClient.updateCard).toHaveBeenCalledOnce();
      expect(mockApiClient.updateCard).toHaveBeenCalledWith(10, { name: 'Updated Revenue Card' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(10);
      expect(parsed.name).toBe('Updated Revenue Card');
    });

    it('should allow updating a card without a name in the payload', async () => {
      mockApiClient.updateCard.mockResolvedValue({ ...updatedCard, description: 'New desc' });

      const request = createMockRequest('create', {
        model: 'card',
        action: 'update',
        id: 10,
        payload: { description: 'New desc' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      const result = await handleCreate(
        request,
        'req-5',
        mockApiClient as any,
        logDebug,
        logInfo,
        logError
      );

      expect(mockApiClient.updateCard).toHaveBeenCalledWith(10, { description: 'New desc' });
      expect(result.content[0].text).toContain('New desc');
    });
  });

  // ─── Dashboard create ─────────────────────────────────────────────────────

  describe('Dashboard create', () => {
    it('should create a dashboard and return formatted JSON', async () => {
      mockApiClient.createDashboard.mockResolvedValue(createdDashboard);

      const request = createMockRequest('create', {
        model: 'dashboard',
        action: 'create',
        payload: { name: 'New Dashboard', description: 'A fresh dashboard' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      const result = await handleCreate(
        request,
        'req-6',
        mockApiClient as any,
        logDebug,
        logInfo,
        logError
      );

      expect(mockApiClient.createDashboard).toHaveBeenCalledOnce();
      expect(mockApiClient.createDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Dashboard' })
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(99);
      expect(parsed.name).toBe('New Dashboard');
    });

    it('should pass collection_id when provided', async () => {
      mockApiClient.createDashboard.mockResolvedValue({ ...createdDashboard, collection_id: 3 });

      const request = createMockRequest('create', {
        model: 'dashboard',
        action: 'create',
        payload: { name: 'Scoped Dashboard', collection_id: 3 },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await handleCreate(request, 'req-7', mockApiClient as any, logDebug, logInfo, logError);

      expect(mockApiClient.createDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ collection_id: 3 })
      );
    });
  });

  // ─── Dashboard update ─────────────────────────────────────────────────────

  describe('Dashboard update', () => {
    it('should update a dashboard and return formatted JSON', async () => {
      mockApiClient.updateDashboard.mockResolvedValue(updatedDashboard);

      const request = createMockRequest('create', {
        model: 'dashboard',
        action: 'update',
        id: 5,
        payload: { name: 'Updated Dashboard' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      const result = await handleCreate(
        request,
        'req-8',
        mockApiClient as any,
        logDebug,
        logInfo,
        logError
      );

      expect(mockApiClient.updateDashboard).toHaveBeenCalledOnce();
      expect(mockApiClient.updateDashboard).toHaveBeenCalledWith(5, { name: 'Updated Dashboard' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(5);
    });

    it('should throw when dashboard update id is 0', async () => {
      const request = createMockRequest('create', {
        model: 'dashboard',
        action: 'update',
        id: 0,
        payload: { name: 'Bad' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-9', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow(/"id" must be a positive integer/);
    });
  });

  // ─── API error propagation ────────────────────────────────────────────────

  describe('API error handling', () => {
    it('should propagate errors from createCard as McpError', async () => {
      mockApiClient.createCard.mockRejectedValue(
        Object.assign(new Error('Not found'), { status: 404 })
      );

      const request = createMockRequest('create', {
        model: 'card',
        action: 'create',
        payload: { name: 'Failing Card' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-10', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow();
    });

    it('should propagate errors from updateDashboard', async () => {
      mockApiClient.updateDashboard.mockRejectedValue(new Error('Permission denied'));

      const request = createMockRequest('create', {
        model: 'dashboard',
        action: 'update',
        id: 7,
        payload: { name: 'Denied' },
      });
      const [logDebug, logInfo, logError] = getCreateLoggerFunctions();

      await expect(
        handleCreate(request, 'req-11', mockApiClient as any, logDebug, logInfo, logError)
      ).rejects.toThrow();
    });
  });
});
