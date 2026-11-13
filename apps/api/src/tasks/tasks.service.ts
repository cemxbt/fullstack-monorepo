import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskInput, ListTasksQuery, Task, UpdateTaskInput } from '@starter/contracts';
import { z } from 'zod';
import { Prisma, Task as TaskRecord } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Maps a database row to the public contract (dates become ISO strings). */
const toContract = (task: TaskRecord): Task => ({
  ...task,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
});

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTasksQuery): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      where: { status: query.status },
      orderBy: { createdAt: 'desc' },
    });
    return tasks.map(toContract);
  }

  async get(id: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return toContract(task);
  }

  async create(input: z.output<typeof CreateTaskInput>): Promise<Task> {
    return toContract(await this.prisma.task.create({ data: input }));
  }

  async update(id: string, input: z.output<typeof UpdateTaskInput>): Promise<Task> {
    try {
      return toContract(await this.prisma.task.update({ where: { id }, data: input }));
    } catch (error) {
      throw this.notFoundOr(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.task.delete({ where: { id } });
    } catch (error) {
      throw this.notFoundOr(error);
    }
  }

  private notFoundOr(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
      ? new NotFoundException('Task not found')
      : error;
  }
}

export type { CreateTaskInput, UpdateTaskInput };
