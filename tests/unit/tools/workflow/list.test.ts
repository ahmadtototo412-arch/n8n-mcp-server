/**
 * Tests for the list_workflows tool handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ListWorkflowsHandler, getListWorkflowsToolDefinition } from '../../../../src/tools/workflow/list.js';
import { createMockWorkflows } from '../../../mocks/n8n-fixtures.js';

describe('ListWorkflowsHandler', () => {
  let handler: ListWorkflowsHandler;
  let mockApiService: { getWorkflows: jest.Mock };

  beforeEach(() => {
    process.env.N8N_API_URL = 'https://n8n.example.com/api/v1';
    process.env.N8N_API_KEY = 'test-api-key';

    handler = new ListWorkflowsHandler();
    mockApiService = { getWorkflows: jest.fn() };
    (handler as any).apiService = mockApiService;
  });

  it('returns a formatted, trimmed list of workflows', async () => {
    const workflows = createMockWorkflows(2);
    mockApiService.getWorkflows.mockResolvedValue(workflows);

    const result = await handler.execute({});

    expect(mockApiService.getWorkflows).toHaveBeenCalledTimes(1);
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Found 2 workflow(s)');

    const jsonPart = result.content[0].text.split('\n\n')[1];
    const parsed = JSON.parse(jsonPart);
    expect(parsed).toHaveLength(2);
    expect(Object.keys(parsed[0]).sort()).toEqual(['active', 'id', 'name', 'updatedAt'].sort());
  });

  it('reports zero workflows without erroring', async () => {
    mockApiService.getWorkflows.mockResolvedValue([]);

    const result = await handler.execute({});

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Found 0 workflow(s)');
  });

  it('returns an error result when the API call fails', async () => {
    mockApiService.getWorkflows.mockRejectedValue(new Error('network down'));

    const result = await handler.execute({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('network down');
  });
});

describe('getListWorkflowsToolDefinition', () => {
  it('describes the list_workflows tool', () => {
    const definition = getListWorkflowsToolDefinition();

    expect(definition.name).toBe('list_workflows');
    expect(definition.inputSchema.required).toEqual([]);
  });
});
