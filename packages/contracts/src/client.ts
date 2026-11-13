import { z } from 'zod';
import { CreateTaskInput, ListTasksQuery, Task, UpdateTaskInput } from './tasks';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Fetch = typeof fetch;

/**
 * Typed client for the tasks API. Responses are validated with the same schemas the
 * API uses, so a contract change surfaces as a compile error in every app and as a
 * clear runtime error if a deployed client and server ever drift apart.
 */
export function createApiClient(baseUrl: string, fetchImpl: Fetch = fetch) {
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T>(schema: z.ZodType<T>, path: string, init?: RequestInit): Promise<T> {
    const response = await fetchImpl(`${root}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      const message =
        body && typeof body === 'object' && 'message' in body
          ? String((body as { message: unknown }).message)
          : `Request failed with status ${response.status}`;
      throw new ApiError(response.status, message, body);
    }

    const data = response.status === 204 ? undefined : await response.json();
    return schema.parse(data);
  }

  return {
    tasks: {
      list(query: ListTasksQuery = {}) {
        const params = new URLSearchParams();
        if (query.status) params.set('status', query.status);
        const search = params.size > 0 ? `?${params}` : '';
        return request(z.array(Task), `/tasks${search}`);
      },
      get(id: string) {
        return request(Task, `/tasks/${encodeURIComponent(id)}`);
      },
      create(input: CreateTaskInput) {
        return request(Task, '/tasks', { method: 'POST', body: JSON.stringify(input) });
      },
      update(id: string, input: UpdateTaskInput) {
        return request(Task, `/tasks/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      remove(id: string) {
        return request(z.undefined(), `/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
