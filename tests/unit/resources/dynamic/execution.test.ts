/**
 * Tests for the dynamic execution resource handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getExecutionResource,
  getExecutionResourceTemplateUri,
  getExecutionResourceTemplateMetadata,
  extractExecutionIdFromUri,
} from '../../../../src/resources/dynamic/execution.js';
import { McpError, ErrorCode } from '../../../../src/errors/index.js';
import { createMockExecution } from '../../../mocks/n8n-fixtures.js';
import { N8nApiService } from '../../../../src/api/n8n-client.js';

describe('getExecutionResource', () => {
  let mockApiService: { getExecution: jest.Mock };

  beforeEach(() => {
    mockApiService = { getExecution: jest.fn() };
  });

  it('returns formatted execution JSON with resource links', async () => {
    const execution = createMockExecution({ id: 'exec-1', workflowId: 'wf-1', status: 'success' });
    mockApiService.getExecution.mockResolvedValue(execution);

    const raw = await getExecutionResource(mockApiService as unknown as N8nApiService, 'exec-1');
    const parsed = JSON.parse(raw);

    expect(mockApiService.getExecution).toHaveBeenCalledWith('exec-1');
    expect(parsed.resourceType).toBe('execution');
    expect(parsed.id).toBe('exec-1');
    expect(parsed.workflowId).toBe('wf-1');
    expect(parsed._links.self).toBe('n8n://executions/exec-1');
    expect(parsed._links.workflow).toBe('n8n://workflows/wf-1');
    expect(typeof parsed.lastUpdated).toBe('string');
  });

  it('rethrows a NotFoundError McpError unchanged', async () => {
    const notFound = new McpError(ErrorCode.NotFoundError, 'Execution not found');
    mockApiService.getExecution.mockRejectedValue(notFound);

    await expect(
      getExecutionResource(mockApiService as unknown as N8nApiService, 'missing')
    ).rejects.toBe(notFound);
  });

  it('wraps unexpected errors in an InternalError McpError', async () => {
    mockApiService.getExecution.mockRejectedValue(new Error('boom'));

    await expect(
      getExecutionResource(mockApiService as unknown as N8nApiService, 'exec-1')
    ).rejects.toMatchObject({
      code: ErrorCode.InternalError,
    });
  });
});

describe('getExecutionResourceTemplateUri / getExecutionResourceTemplateMetadata', () => {
  it('returns the expected template URI and metadata', () => {
    expect(getExecutionResourceTemplateUri()).toBe('n8n://executions/{id}');

    const metadata = getExecutionResourceTemplateMetadata();
    expect(metadata.uriTemplate).toBe('n8n://executions/{id}');
    expect(metadata.mimeType).toBe('application/json');
  });
});

describe('extractExecutionIdFromUri', () => {
  it('extracts the id from a valid execution URI', () => {
    expect(extractExecutionIdFromUri('n8n://executions/exec-1')).toBe('exec-1');
  });

  it('returns null for a non-matching URI', () => {
    expect(extractExecutionIdFromUri('n8n://workflows/exec-1')).toBeNull();
    expect(extractExecutionIdFromUri('not-a-uri')).toBeNull();
  });
});
