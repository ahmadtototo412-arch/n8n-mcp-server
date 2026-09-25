/**
 * Tests for the delete_workflow tool handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DeleteWorkflowHandler, getDeleteWorkflowToolDefinition } from '../../../../src/tools/workflow/delete.js';
import { createMockWorkflow } from '../../../mocks/n8n-fixtures.js';

describe('DeleteWorkflowHandler', () => {
  let handler: DeleteWorkflowHandler;
  let mockApiService: { getWorkflow: jest.Mock; deleteWorkflow: jest.Mock };

  beforeEach(() => {
    process.env.N8N_API_URL = 'https://n8n.example.com/api/v1';
    process.env.N8N_API_KEY = 'test-api-key';

    handler = new DeleteWorkflowHandler();
    mockApiService = { getWorkflow: jest.fn(), deleteWorkflow: jest.fn() };
    (handler as any).apiService = mockApiService;
  });

  it('requires a workflowId', async () => {
    const result = await handler.execute({});

    expect(mockApiService.getWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required parameter: workflowId');
  });

  it('deletes the workflow and confirms with its name', async () => {
    mockApiService.getWorkflow.mockResolvedValue(createMockWorkflow({ id: 'wf-1', name: 'Doomed Workflow' }));
    mockApiService.deleteWorkflow.mockResolvedValue({ success: true });

    const result = await handler.execute({ workflowId: 'wf-1' });

    expect(mockApiService.deleteWorkflow).toHaveBeenCalledWith('wf-1');
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('"Doomed Workflow" (ID: wf-1) has been successfully deleted');
  });

  it('surfaces API errors without deleting', async () => {
    mockApiService.getWorkflow.mockRejectedValue(new Error('not found'));

    const result = await handler.execute({ workflowId: 'missing' });

    expect(mockApiService.deleteWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});

describe('getDeleteWorkflowToolDefinition', () => {
  it('describes the delete_workflow tool', () => {
    const definition = getDeleteWorkflowToolDefinition();

    expect(definition.name).toBe('delete_workflow');
    expect(definition.inputSchema.required).toEqual(['workflowId']);
  });
});
