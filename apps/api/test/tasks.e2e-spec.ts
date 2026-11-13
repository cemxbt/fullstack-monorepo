import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiClient, ApiError, createApiClient } from '@starter/contracts';
import { AddressInfo } from 'net';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Exercises the API through the same typed client the web and mobile apps use,
 * so these tests also verify that server and contract agree.
 */
describe('Tasks API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let client: ApiClient;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    client = createApiClient(baseUrl);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates and fetches a task', async () => {
    const created = await client.tasks.create({ title: '  Write the README  ' });
    expect(created).toMatchObject({ title: 'Write the README', status: 'TODO', description: null });
    await expect(client.tasks.get(created.id)).resolves.toEqual(created);
  });

  it('lists tasks newest first and filters by status', async () => {
    const first = await client.tasks.create({ title: 'First' });
    const second = await client.tasks.create({ title: 'Second', status: 'DONE' });

    const all = await client.tasks.list();
    expect(all.map((t) => t.id)).toEqual([second.id, first.id]);

    const done = await client.tasks.list({ status: 'DONE' });
    expect(done.map((t) => t.id)).toEqual([second.id]);
  });

  it('updates a task', async () => {
    const task = await client.tasks.create({ title: 'Move me' });
    const updated = await client.tasks.update(task.id, { status: 'IN_PROGRESS' });
    expect(updated.status).toBe('IN_PROGRESS');
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(task.updatedAt).getTime(),
    );
  });

  it('deletes a task', async () => {
    const task = await client.tasks.create({ title: 'Delete me' });
    await client.tasks.remove(task.id);
    await expect(client.tasks.get(task.id)).rejects.toMatchObject({ status: 404 });
  });

  it('returns 404 for unknown tasks', async () => {
    const id = '7b1e3c2a-1d2f-4a5b-9c8d-0e1f2a3b4c5d';
    await expect(client.tasks.update(id, { title: 'x' })).rejects.toMatchObject({ status: 404 });
    await expect(client.tasks.remove(id)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects invalid input using the shared schemas', async () => {
    const error = await client.tasks.create({ title: '' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).details).toMatchObject({
      issues: [{ path: 'title', message: 'Title is required' }],
    });

    const badStatus = await fetch(`${baseUrl}/tasks?status=ARCHIVED`);
    expect(badStatus.status).toBe(400);

    const badId = await fetch(`${baseUrl}/tasks/not-a-uuid`);
    expect(badId.status).toBe(400);
  });

  it('rejects empty updates', async () => {
    const task = await client.tasks.create({ title: 'Keep me' });
    await expect(client.tasks.update(task.id, {})).rejects.toMatchObject({ status: 400 });
  });

  it('exposes a health check', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
