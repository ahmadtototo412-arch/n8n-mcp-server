/**
 * Tests for the activate_workflow tool handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ActivateWorkflowHandler, getActivateWorkflowToolDefinition } from '../../../../src/tools/workflow/activate.js';
import { createMockWorkflow } from '../../../mocks/n8n-fixtures.js';

describe('ActivateWorkflowHandler', () => {
  let handler: ActivateWorkflowHandler;
  let mockApiService: { activateWorkflow: jest.Mock };

  beforeEach(() => {
    process.env.N8N_API_URL = 'https://n8n.example.com/api/v1';
    process.env.N8N_API_KEY = 'test-api-key';

    handler = new ActivateWorkflowHandler();
    mockApiService = { activateWorkflow: jest.fn() };
    (handler as any).apiService = mockApiService;
  });

  it('requires a workflowId', async () => {
    const result = await handler.execute({});

    expect(mockApiService.activateWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required parameter: workflowId');
  });

  it('activates the workflow', async () => {
    mockApiService.activateWorkflow.mockResolvedValue(
      createMockWorkflow({ id: 'wf-1', name: 'My Workflow', active: true })
    );

    const result = await handler.execute({ workflowId: 'wf-1' });

    expect(mockApiService.activateWorkflow).toHaveBeenCalledWith('wf-1');
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('"My Workflow" (ID: wf-1) has been successfully activated');
  });

  it('surfaces API errors', async () => {
    mockApiService.activateWorkflow.mockRejectedValue(new Error('activation failed'));

    const result = await handler.execute({ workflowId: 'wf-1' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('activation failed');
  });
});

describe('getActivateWorkflowToolDefinition', () => {
  it('describes the activate_workflow tool', () => {
    const definition = getActivateWorkflowToolDefinition();

    expect(definition.name).toBe('activate_workflow');
    expect(definition.inputSchema.required).toEqual(['workflowId']);
  });
});
