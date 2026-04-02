/**
 * Types for the create/update handler
 */

export type CreateModel = 'card' | 'dashboard';

export interface CreateCardPayload {
  name: string;
  description?: string;
  /** Native/SQL query dataset_query */
  dataset_query?: Record<string, unknown>;
  display?: string;
  visualization_settings?: Record<string, unknown>;
  collection_id?: number | null;
}

export interface UpdateCardPayload {
  name?: string;
  description?: string;
  dataset_query?: Record<string, unknown>;
  display?: string;
  visualization_settings?: Record<string, unknown>;
  collection_id?: number | null;
}

export interface CreateDashboardPayload {
  name: string;
  description?: string;
  collection_id?: number | null;
}

export interface UpdateDashboardPayload {
  name?: string;
  description?: string;
  collection_id?: number | null;
}
