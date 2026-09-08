/**
 * Tests for the deactivate_workflow tool handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DeactivateWorkflowHandler, getDeactivateWorkflowToolDefinition } from '../../../../src/tools/workflow/deactivate.js';
import { createMockWorkflow } from '../../../mocks/n8n-fixtures.js';

describe('DeactivateWorkflowHandler', () => {
  let handler: DeactivateWorkflowHandler;
  let mockApiService: { deactivateWorkflow: jest.Mock };

  beforeEach(() => {
    process.env.N8N_API_URL = 'https://n8n.example.com/api/v1';
    process.env.N8N_API_KEY = 'test-api-key';

    handler = new DeactivateWorkflowHandler();
    mockApiService = { deactivateWorkflow: jest.fn() };
    (handler as any).apiService = mockApiService;
  });

  it('requires a workflowId', async () => {
    const result = await handler.execute({});

    expect(mockApiService.deactivateWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required parameter: workflowId');
  });

  it('deactivates the workflow', async () => {
    mockApiService.deactivateWorkflow.mockResolvedValue(
      createMockWorkflow({ id: 'wf-1', name: 'My Workflow', active: false })
    );

    const result = await handler.execute({ workflowId: 'wf-1' });

    expect(mockApiService.deactivateWorkflow).toHaveBeenCalledWith('wf-1');
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('"My Workflow" (ID: wf-1) has been successfully deactivated');
  });

  it('surfaces API errors', async () => {
    mockApiService.deactivateWorkflow.mockRejectedValue(new Error('deactivation failed'));

    const result = await handler.execute({ workflowId: 'wf-1' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('deactivation failed');
  });
});

describe('getDeactivateWorkflowToolDefinition', () => {
  it('describes the deactivate_workflow tool', () => {
    const definition = getDeactivateWorkflowToolDefinition();

    expect(definition.name).toBe('deactivate_workflow');
    expect(definition.inputSchema.required).toEqual(['workflowId']);
  });
});
