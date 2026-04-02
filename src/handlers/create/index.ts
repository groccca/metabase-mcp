import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { MetabaseApiClient } from '../../api.js';
import { ErrorCode, McpError } from '../../types/core.js';
import { config } from '../../config.js';
import { handleApiError, formatJson } from '../../utils/index.js';
import { CreateModel } from './types.js';

export async function handleCreate(
  request: CallToolRequest,
  requestId: string,
  apiClient: MetabaseApiClient,
  logDebug: (message: string, data?: unknown) => void,
  logInfo: (message: string, data?: unknown) => void,
  logError: (message: string, data?: unknown) => void
) {
  // Guard: METABASE_WRITE_ENABLED must be true
  if (!config.METABASE_WRITE_ENABLED) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      'Write operations are disabled. Set METABASE_WRITE_ENABLED=true to enable create/update via the API.'
    );
  }

  const { model, action, id, payload } = request.params?.arguments || {};

  // Validate model
  const supportedModels: CreateModel[] = ['card', 'dashboard'];
  if (!model || !supportedModels.includes(model as CreateModel)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid or missing "model". Must be one of: ${supportedModels.join(', ')}`
    );
  }

  // Validate action
  if (!action || (action !== 'create' && action !== 'update')) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Invalid or missing "action". Must be "create" or "update".'
    );
  }

  // For update, id is required
  if (action === 'update' && (id === undefined || id === null)) {
    throw new McpError(ErrorCode.InvalidParams, '"id" is required for action "update".');
  }

  if (!payload || typeof payload !== 'object') {
    throw new McpError(ErrorCode.InvalidParams, '"payload" must be a non-null object.');
  }

  const safePayload = payload as Record<string, unknown>;

  logInfo(`Processing ${action} for model: ${model}`, { requestId, action, model, id });

  try {
    let result: unknown;

    if (model === 'card') {
      if (action === 'create') {
        if (!safePayload.name) {
          throw new McpError(
            ErrorCode.InvalidParams,
            '"payload.name" is required to create a card.'
          );
        }
        logDebug('Creating card', { requestId, name: safePayload.name });
        result = await apiClient.createCard(safePayload);
      } else {
        const cardId = Number(id);
        if (!Number.isInteger(cardId) || cardId <= 0) {
          throw new McpError(ErrorCode.InvalidParams, '"id" must be a positive integer.');
        }
        logDebug(`Updating card ${cardId}`, { requestId });
        result = await apiClient.updateCard(cardId, safePayload);
      }
    } else {
      // dashboard
      if (action === 'create') {
        if (!safePayload.name) {
          throw new McpError(
            ErrorCode.InvalidParams,
            '"payload.name" is required to create a dashboard.'
          );
        }
        logDebug('Creating dashboard', { requestId, name: safePayload.name });
        result = await apiClient.createDashboard(safePayload);
      } else {
        const dashboardId = Number(id);
        if (!Number.isInteger(dashboardId) || dashboardId <= 0) {
          throw new McpError(ErrorCode.InvalidParams, '"id" must be a positive integer.');
        }
        logDebug(`Updating dashboard ${dashboardId}`, { requestId });
        result = await apiClient.updateDashboard(dashboardId, safePayload);
      }
    }

    logInfo(`Successfully completed ${action} for ${model}`, { requestId });

    return {
      content: [
        {
          type: 'text',
          text: formatJson(result),
        },
      ],
    };
  } catch (error: any) {
    throw handleApiError(
      error,
      { operation: `${action} ${model}`, resourceType: model as string },
      logError
    );
  }
}
