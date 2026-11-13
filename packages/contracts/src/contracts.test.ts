import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';
import { CreateTaskInput, UpdateTaskInput } from './tasks';

const task = {
  id: '4f9c2a3e-8b1d-4c6e-9a7f-2d3b5c6e7f80',
  title: 'Write docs',
  description: null,
  status: 'TODO',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('CreateTaskInput', () => {
  it('trims the title and defaults the status', () => {
    expect(CreateTaskInput.parse({ title: '  Ship it  ' })).toEqual({
      title: 'Ship it',
      status: 'TODO',
    });
  });

  it('rejects blank titles and unknown statuses', () => {
    expect(CreateTaskInput.safeParse({ title: '   ' }).success).toBe(false);
    expect(CreateTaskInput.safeParse({ title: 'x', status: 'BLOCKED' }).success).toBe(false);
  });
});

describe('UpdateTaskInput', () => {
  it('accepts partial updates', () => {
    expect(UpdateTaskInput.parse({ status: 'DONE' })).toEqual({ status: 'DONE' });
  });

  it('rejects empty updates', () => {
    expect(UpdateTaskInput.safeParse({}).success).toBe(false);
  });
});

describe('createApiClient', () => {
  it('builds URLs and validates responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([task]));
    const client = createApiClient('http://api.test/', fetchMock);

    await expect(client.tasks.list({ status: 'TODO' })).resolves.toEqual([task]);
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/tasks?status=TODO', expect.any(Object));
  });

  it('throws ApiError with the server message on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'Task not found' }, 404));
    const client = createApiClient('http://api.test', fetchMock);

    await expect(client.tasks.get(task.id)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Task not found',
    });
  });

  it('rejects responses that break the contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ...task, status: 'ARCHIVED' }));
    const client = createApiClient('http://api.test', fetchMock);

    await expect(client.tasks.get(task.id)).rejects.not.toBeInstanceOf(ApiError);
  });

  it('handles empty 204 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createApiClient('http://api.test', fetchMock);

    await expect(client.tasks.remove(task.id)).resolves.toBeUndefined();
  });
});
