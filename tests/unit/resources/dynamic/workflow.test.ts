/**
 * Tests for the dynamic workflow resource handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getWorkflowResource,
  getWorkflowResourceTemplateUri,
  getWorkflowResourceTemplateMetadata,
  extractWorkflowIdFromUri,
} from '../../../../src/resources/dynamic/workflow.js';
import { McpError, ErrorCode } from '../../../../src/errors/index.js';
import { createMockWorkflow } from '../../../mocks/n8n-fixtures.js';
import { N8nApiService } from '../../../../src/api/n8n-client.js';

describe('getWorkflowResource', () => {
  let mockApiService: { getWorkflow: jest.Mock };

  beforeEach(() => {
    mockApiService = { getWorkflow: jest.fn() };
  });

  it('returns formatted workflow JSON with resource links', async () => {
    const workflow = createMockWorkflow({ id: 'wf-1', name: 'My Workflow', active: true });
    mockApiService.getWorkflow.mockResolvedValue(workflow);

    const raw = await getWorkflowResource(mockApiService as unknown as N8nApiService, 'wf-1');
    const parsed = JSON.parse(raw);

    expect(mockApiService.getWorkflow).toHaveBeenCalledWith('wf-1');
    expect(parsed.resourceType).toBe('workflow');
    expect(parsed.id).toBe('wf-1');
    expect(parsed.name).toBe('My Workflow');
    expect(parsed.status).toBe('🟢 Active');
    expect(parsed._links.self).toBe('n8n://workflows/wf-1');
    expect(parsed._links.executions).toBe('n8n://executions?workflowId=wf-1');
    expect(typeof parsed.lastUpdated).toBe('string');
  });

  it('rethrows a NotFoundError McpError unchanged', async () => {
    const notFound = new McpError(ErrorCode.NotFoundError, 'Workflow not found');
    mockApiService.getWorkflow.mockRejectedValue(notFound);

    await expect(
      getWorkflowResource(mockApiService as unknown as N8nApiService, 'missing')
    ).rejects.toBe(notFound);
  });

  it('wraps unexpected errors in an InternalError McpError', async () => {
    mockApiService.getWorkflow.mockRejectedValue(new Error('boom'));

    await expect(
      getWorkflowResource(mockApiService as unknown as N8nApiService, 'wf-1')
    ).rejects.toMatchObject({
      code: ErrorCode.InternalError,
    });
  });
});

describe('getWorkflowResourceTemplateUri / getWorkflowResourceTemplateMetadata', () => {
  it('returns the expected template URI and metadata', () => {
    expect(getWorkflowResourceTemplateUri()).toBe('n8n://workflows/{id}');

    const metadata = getWorkflowResourceTemplateMetadata();
    expect(metadata.uriTemplate).toBe('n8n://workflows/{id}');
    expect(metadata.mimeType).toBe('application/json');
  });
});

describe('extractWorkflowIdFromUri', () => {
  it('extracts the id from a valid workflow URI', () => {
    expect(extractWorkflowIdFromUri('n8n://workflows/abc123')).toBe('abc123');
  });

  it('returns null for a non-matching URI', () => {
    expect(extractWorkflowIdFromUri('n8n://executions/abc123')).toBeNull();
    expect(extractWorkflowIdFromUri('not-a-uri')).toBeNull();
  });
});
