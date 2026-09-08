# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **n8n-mcp-server**, a Model Context Protocol (MCP) server that lets AI assistants manage n8n
workflows and executions through natural-language tool calls. It speaks stdio MCP (via
`@modelcontextprotocol/sdk`) and proxies requests to a running n8n instance's REST API (`/api/v1`).

- **Language**: TypeScript (ES modules, Node.js 20+)
- **Entry point**: `src/index.ts` → compiled to `build/index.js` (the published `bin`)
- **Package**: `@leonardsellem/n8n-mcp-server`

## Common Commands

```bash
npm install        # install dependencies
npm run build       # tsc compile to build/, chmod +x build/index.js
npm run dev          # tsc --watch
npm start            # node build/index.js
npm test             # node --experimental-vm-modules run-tests.js (wraps Jest, ESM-aware)
npm run test:watch
npm run test:coverage
npm run lint         # eslint --ext .ts src/
```

Copy `.env.example` to `.env` and set `N8N_API_URL`, `N8N_API_KEY` (required) and
`N8N_WEBHOOK_USERNAME` / `N8N_WEBHOOK_PASSWORD` (only required for the `run_webhook` tool).

## Architecture

```
src/
├── index.ts                 # process entry point: loads env, builds server, connects stdio transport
├── config/
│   ├── environment.ts        # loadEnvironmentVariables()/getEnvConfig() — validates N8N_* env vars
│   └── server.ts              # configureServer() — wires tool/resource handlers into the MCP Server
├── api/
│   ├── client.ts               # N8nApiClient — thin axios wrapper over n8n's REST API
│   └── n8n-client.ts            # N8nApiService — higher-level facade used by tools/resources
├── tools/
│   ├── workflow/                # list/get/create/update/delete/activate/deactivate handlers + index.ts
│   └── execution/                # list/get/delete/run(webhook) handlers + index.ts
├── resources/
│   ├── static/                    # workflows list + execution-stats aggregate resources
│   ├── dynamic/                    # per-id workflow/execution resource templates (n8n://workflows/{id}, n8n://executions/{id})
│   └── index.ts                     # setupResourceHandlers() registers List/ListTemplates/Read handlers
├── errors/                          # McpError re-export, N8nApiError, handleAxiosError()
├── types/                            # ToolDefinition, ToolCallResult, Workflow, Execution
└── utils/                             # execution-formatter.ts, resource-formatter.ts (display formatting only)
```

### Request flow

`src/index.ts` → `configureServer()` (src/config/server.ts) creates the MCP `Server`, verifies
connectivity to n8n via `N8nApiService.checkConnectivity()`, then registers:

- `ListToolsRequestSchema` → combines `setupWorkflowTools()` + `setupExecutionTools()` tool definitions.
- `CallToolRequestSchema` → dynamically imports the workflow/execution handler modules and dispatches
  by `request.params.name` to the matching `*Handler` class's `execute(args)`.
- Resource handlers (`setupResourceHandlers`) for `ListResourcesRequestSchema`,
  `ListResourceTemplatesRequestSchema`, and `ReadResourceRequestSchema`.

Every tool handler extends a `Base*ToolHandler` (`tools/workflow/base-handler.ts`,
`tools/execution/base-handler.ts`) that owns the `apiService` instance and provides
`formatSuccess`/`formatError`/`handleExecution` helpers so individual tool files stay focused on
argument validation and the n8n API call they need to make.

### Real n8n API surface (see `n8n-openapi.yml`)

n8n's public REST API does **not** expose an endpoint to trigger a workflow run directly, nor one to
stop an in-progress execution — only `/workflows/{id}/activate`, `/workflows/{id}/deactivate`,
`/executions`, and `/executions/{id}` exist for execution-adjacent operations. The only supported way
to *start* a workflow from this server is the `run_webhook` tool, which calls the workflow's n8n
webhook URL directly (requires `N8N_WEBHOOK_USERNAME`/`N8N_WEBHOOK_PASSWORD`). Keep this in mind before
adding an "execute workflow via API" or "stop execution" tool — the underlying REST call doesn't exist
in current n8n versions, so `N8nApiService.executeWorkflow()`/`N8nApiClient.executeWorkflow()` (present
for potential future n8n API support) are intentionally unused by any tool today.

## Testing

Tests live under `tests/unit/`, mirroring the `src/` layout, and use Jest with `ts-jest`'s ESM preset
(see `jest.config.cjs`, `tests/tsconfig.json`). Mocking real ESM modules with `jest.mock()` has proven
fragile in this setup (see the `.bak` files under `tests/unit/api` and `tests/unit/config`); the
established pattern instead is:

- For pure functions/classes with no external deps (formatters, dynamic resource handlers): call them
  directly with a hand-built fake `apiService` object.
- For tool handlers (which construct their own `apiService` in a base-class field): set
  `N8N_API_URL`/`N8N_API_KEY` in `beforeEach`, construct the handler, then override
  `(handler as any).apiService = mockApiService` before calling `execute()`.

Shared fixtures/mocks live in `tests/mocks/` (`n8n-fixtures.ts`, `axios-mock.ts`).

## Notes for future contributors

- Tool names registered with the MCP server are the `snake_case` names in each tool's
  `getXxxToolDefinition()` (e.g. `list_workflows`, `run_webhook`) — these are the actual protocol-level
  names AI assistants call, not the prose names used in README section headings (e.g. "Workflow
  Management").
- `src/tools/workflow/update.ts` intentionally strips `active`/`tags` from update payloads (n8n's
  `PUT /workflows/{id}` treats them as read-only) and reports that in its response message rather than
  silently dropping them.
