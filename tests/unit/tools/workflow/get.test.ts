/**
 * Tests for the get_workflow tool handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { GetWorkflowHandler, getGetWorkflowToolDefinition } from '../../../../src/tools/workflow/get.js';
import { createMockWorkflow } from '../../../mocks/n8n-fixtures.js';

describe('GetWorkflowHandler', () => {
  let handler: GetWorkflowHandler;
  let mockApiService: { getWorkflow: jest.Mock };

  beforeEach(() => {
    process.env.N8N_API_URL = 'https://n8n.example.com/api/v1';
    process.env.N8N_API_KEY = 'test-api-key';

    handler = new GetWorkflowHandler();
    mockApiService = { getWorkflow: jest.fn() };
    (handler as any).apiService = mockApiService;
  });

  it('returns an error when workflowId is missing', async () => {
    const result = await handler.execute({});

    expect(mockApiService.getWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required parameter: workflowId');
  });

  it('retrieves and formats the workflow', async () => {
    const workflow = createMockWorkflow({ id: 'wf-1', name: 'My Workflow' });
    mockApiService.getWorkflow.mockResolvedValue(workflow);

    const result = await handler.execute({ workflowId: 'wf-1' });

    expect(mockApiService.getWorkflow).toHaveBeenCalledWith('wf-1');
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Retrieved workflow: My Workflow');
    expect(result.content[0].text).toContain('"id": "wf-1"');
  });

  it('surfaces API errors', async () => {
    mockApiService.getWorkflow.mockRejectedValue(new Error('not found'));

    const result = await handler.execute({ workflowId: 'missing' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});

describe('getGetWorkflowToolDefinition', () => {
  it('describes the get_workflow tool', () => {
    const definition = getGetWorkflowToolDefinition();

    expect(definition.name).toBe('get_workflow');
    expect(definition.inputSchema.required).toEqual(['workflowId']);
  });
});
