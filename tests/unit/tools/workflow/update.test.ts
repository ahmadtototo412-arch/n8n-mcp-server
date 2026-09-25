/**
 * Tests for the update_workflow tool handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { UpdateWorkflowHandler, getUpdateWorkflowToolDefinition } from '../../../../src/tools/workflow/update.js';
import { createMockWorkflow } from '../../../mocks/n8n-fixtures.js';

describe('UpdateWorkflowHandler', () => {
  let handler: UpdateWorkflowHandler;
  let mockApiService: { getWorkflow: jest.Mock; updateWorkflow: jest.Mock };

  beforeEach(() => {
    process.env.N8N_API_URL = 'https://n8n.example.com/api/v1';
    process.env.N8N_API_KEY = 'test-api-key';

    handler = new UpdateWorkflowHandler();
    mockApiService = { getWorkflow: jest.fn(), updateWorkflow: jest.fn() };
    (handler as any).apiService = mockApiService;
  });

  it('requires a workflowId', async () => {
    const result = await handler.execute({});

    expect(mockApiService.getWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required parameter: workflowId');
  });

  it('rejects a non-array nodes parameter', async () => {
    const result = await handler.execute({ workflowId: 'wf-1', nodes: 'nope' });

    expect(mockApiService.getWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Parameter "nodes" must be an array');
  });

  it('rejects a non-object connections parameter', async () => {
    const result = await handler.execute({ workflowId: 'wf-1', connections: 'nope' });

    expect(mockApiService.getWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Parameter "connections" must be an object');
  });

  it('merges provided fields onto the current workflow and reports changes', async () => {
    const current = createMockWorkflow({
      id: 'wf-1',
      name: 'Old Name',
      nodes: [{ id: 'n1', name: 'Node 1', type: 'n8n-nodes-base.noOp', parameters: {}, position: [0, 0] }],
      connections: {},
      settings: { timezone: 'UTC' },
      staticData: undefined,
    });
    mockApiService.getWorkflow.mockResolvedValue(current);
    mockApiService.updateWorkflow.mockResolvedValue({ ...current, name: 'New Name' });

    const result = await handler.execute({ workflowId: 'wf-1', name: 'New Name' });

    expect(mockApiService.updateWorkflow).toHaveBeenCalledWith('wf-1', {
      name: 'New Name',
      nodes: current.nodes,
      connections: current.connections,
      settings: current.settings,
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Changes: name: "Old Name" → "New Name"');
  });

  it('warns when read-only fields are supplied but ignores them', async () => {
    const current = createMockWorkflow({ id: 'wf-1', name: 'Same Name' });
    mockApiService.getWorkflow.mockResolvedValue(current);
    mockApiService.updateWorkflow.mockResolvedValue(current);

    const result = await handler.execute({ workflowId: 'wf-1', active: true, tags: ['x'] });

    expect(result.content[0].text).toContain('No changes were made');
    expect(result.content[0].text).toContain('active (read-only');
    expect(result.content[0].text).toContain('tags (read-only property)');
  });

  it('surfaces API errors', async () => {
    mockApiService.getWorkflow.mockRejectedValue(new Error('boom'));

    const result = await handler.execute({ workflowId: 'wf-1' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('boom');
  });
});

describe('getUpdateWorkflowToolDefinition', () => {
  it('describes the update_workflow tool', () => {
    const definition = getUpdateWorkflowToolDefinition();

    expect(definition.name).toBe('update_workflow');
    expect(definition.inputSchema.required).toEqual(['workflowId']);
  });
});
