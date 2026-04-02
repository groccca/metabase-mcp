/**
 * Configuration management with environment variable validation
 */

import 'dotenv/config';
import { z } from 'zod';

// Environment variable schema
const envSchema = z
  .object({
    METABASE_URL: z.string().url('METABASE_URL must be a valid URL'),
    METABASE_API_KEY: z.string().optional(),
    METABASE_USER_EMAIL: z.string().email().optional(),
    METABASE_PASSWORD: z.string().min(1).optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    CACHE_TTL_MS: z
      .string()
      .default('600000')
      .transform(val => parseInt(val, 10))
      .pipe(z.number().positive()), // 10 minutes
    REQUEST_TIMEOUT_MS: z
      .string()
      .default('600000')
      .transform(val => parseInt(val, 10))
      .pipe(z.number().positive()), // 10 minutes
    // SQL_READ_ONLY_MODE controls whether non-SELECT SQL queries are blocked.
    // Accepts SQL_READ_ONLY_MODE (preferred) or legacy METABASE_READ_ONLY_MODE.
    SQL_READ_ONLY_MODE: z
      .string()
      .optional()
      .transform(val => (val !== undefined ? val.toLowerCase() === 'true' : undefined)),
    METABASE_READ_ONLY_MODE: z
      .string()
      .optional()
      .transform(val => (val !== undefined ? val.toLowerCase() === 'true' : undefined)),
    // METABASE_WRITE_ENABLED controls whether the create/update tool can make API writes.
    METABASE_WRITE_ENABLED: z
      .string()
      .default('false')
      .transform(val => val.toLowerCase() === 'true'),
  })
  .refine(data => data.METABASE_API_KEY || (data.METABASE_USER_EMAIL && data.METABASE_PASSWORD), {
    message:
      'Either METABASE_API_KEY or both METABASE_USER_EMAIL and METABASE_PASSWORD must be provided',
    path: ['METABASE_API_KEY'],
  });

// Parse and validate environment variables
function validateEnvironment() {
  try {
    const parsed = envSchema.parse(process.env);
    // SQL_READ_ONLY_MODE takes precedence; fall back to METABASE_READ_ONLY_MODE; default true
    const sqlReadOnly =
      parsed.SQL_READ_ONLY_MODE !== undefined
        ? parsed.SQL_READ_ONLY_MODE
        : parsed.METABASE_READ_ONLY_MODE !== undefined
          ? parsed.METABASE_READ_ONLY_MODE
          : true;
    return { ...parsed, SQL_READ_ONLY_MODE: sqlReadOnly };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

// Create default test config for test environment
function createTestConfig() {
  return {
    METABASE_URL: 'http://localhost:3000',
    METABASE_API_KEY: 'test-api-key',
    METABASE_USER_EMAIL: undefined,
    METABASE_PASSWORD: undefined,
    NODE_ENV: 'test' as const,
    LOG_LEVEL: 'info' as const,
    CACHE_TTL_MS: 600000,
    REQUEST_TIMEOUT_MS: 600000,
    SQL_READ_ONLY_MODE: true,
    METABASE_READ_ONLY_MODE: undefined as boolean | undefined,
    METABASE_WRITE_ENABLED: false,
  };
}

// Export validated configuration or test config
export const config =
  process.env.NODE_ENV === 'test' || process.env.VITEST
    ? createTestConfig()
    : validateEnvironment();

// Authentication method enum
export enum AuthMethod {
  SESSION = 'session',
  API_KEY = 'api_key',
}

// Logger level enum
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Determine authentication method
export const authMethod: AuthMethod = config.METABASE_API_KEY
  ? AuthMethod.API_KEY
  : AuthMethod.SESSION;

export default config;
