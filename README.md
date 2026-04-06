# groccamb-mcp

A personal MCP server for Metabase. Not intended for public use.

## Setup

```json
{
  "command": "npx",
  "args": ["-y", "groccamb-mcp@latest"],
  "env": {
    "METABASE_URL": "https://your-metabase-instance.com",
    "METABASE_API_KEY": "your-api-key"
  }
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `METABASE_URL` | — | Metabase instance URL (required) |
| `METABASE_API_KEY` | — | API key auth (required if not using email/password) |
| `METABASE_USER_EMAIL` | — | Email for session auth |
| `METABASE_PASSWORD` | — | Password for session auth |
| `SQL_READ_ONLY_MODE` | `true` | Block non-SELECT SQL queries |
| `METABASE_WRITE_ENABLED` | `false` | Allow create/update via API |
| `CACHE_TTL_MS` | `600000` | Cache TTL in ms |
| `REQUEST_TIMEOUT_MS` | `600000` | Request timeout in ms |

## Tools

- **search** — Search across Metabase items
- **retrieve** — Fetch details for cards, dashboards, tables, databases, collections, fields
  - Supports `optimization_level`: `standard` (full detail), `aggressive` (less metadata), `minimal` (bare essentials)
- **list** — List all records for a model type
- **execute** — Run SQL queries or saved cards
- **create** — Create or update cards/dashboards (requires `METABASE_WRITE_ENABLED=true`)
- **clear_cache** — Clear internal cache

## Optimization Levels

The `retrieve` tool supports three optimization levels to control response size:

| Level | Use Case | Details |
|---|---|---|
| `standard` | Default, full context | All fields including timestamps, creator info, visualization settings |
| `aggressive` | Bulk operations, reduced metadata | Removes timestamps, strips unnecessary metadata, keeps essential relationships |
| `minimal` | Large datasets, minimal tokens | Only essential fields (IDs, names, relationships), parameters always included |

## Publishing to npm

```bash
# Build the project
npm run build

# Bump version (patch, minor, or major)
npm version patch

# Publish to npm
npm publish
```

The `package.json` is configured to publish to the public npm registry at `https://registry.npmjs.org`.

