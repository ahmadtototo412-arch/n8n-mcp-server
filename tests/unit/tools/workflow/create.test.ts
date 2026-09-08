/**
 * Tests for the create_workflow tool handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CreateWorkflowHandler, getCreateWorkflowToolDefinition } from '../../../../src/tools/workflow/create.js';
import { createMockWorkflow } from '../../../mocks/n8n-fixtures.js';

describe('CreateWorkflowHandler', () => {
  let handler: CreateWorkflowHandler;
  let mockApiService: { createWorkflow: jest.Mock };

  beforeEach(() => {
    process.env.N8N_API_URL = 'https://n8n.example.com/api/v1';
    process.env.N8N_API_KEY = 'test-api-key';

    handler = new CreateWorkflowHandler();
    mockApiService = { createWorkflow: jest.fn() };
    (handler as any).apiService = mockApiService;
  });

  it('requires a name', async () => {
    const result = await handler.execute({});

    expect(mockApiService.createWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required parameter: name');
  });

  it('rejects a non-array nodes parameter', async () => {
    const result = await handler.execute({ name: 'My Workflow', nodes: 'not-an-array' });

    expect(mockApiService.createWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Parameter "nodes" must be an array');
  });

  it('rejects a non-object connections parameter', async () => {
    const result = await handler.execute({ name: 'My Workflow', connections: 'not-an-object' });

    expect(mockApiService.createWorkflow).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Parameter "connections" must be an object');
  });

  it('creates a workflow with the provided fields and defaults active to false', async () => {
    const created = createMockWorkflow({ id: 'wf-new', name: 'My Workflow', active: false });
    mockApiService.createWorkflow.mockResolvedValue(created);

    const result = await handler.execute({ name: 'My Workflow' });

    expect(mockApiService.createWorkflow).toHaveBeenCalledWith({
      name: 'My Workflow',
      active: false,
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Workflow created successfully');
  });

  it('passes through optional nodes, connections, and tags', async () => {
    const nodes = [{ id: 'n1', name: 'Node 1', type: 'n8n-nodes-base.noOp', parameters: {}, position: [0, 0] }];
    const connections = { n1: {} };
    const tags = ['tag-a'];
    mockApiService.createWorkflow.mockResolvedValue(createMockWorkflow({ id: 'wf-new' }));

    await handler.execute({ name: 'My Workflow', nodes, connections, active: true, tags });

    expect(mockApiService.createWorkflow).toHaveBeenCalledWith({
      name: 'My Workflow',
      active: true,
      nodes,
      connections,
      tags,
    });
  });
});

describe('getCreateWorkflowToolDefinition', () => {
  it('describes the create_workflow tool', () => {
    const definition = getCreateWorkflowToolDefinition();

    expect(definition.name).toBe('create_workflow');
    expect(definition.inputSchema.required).toEqual(['name']);
  });
});
