import { z } from 'zod';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export const TaskStatus = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

export const Task = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Task = z.infer<typeof Task>;

export const CreateTaskInput = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(2000).optional(),
  status: TaskStatus.default('TODO'),
});
export type CreateTaskInput = z.input<typeof CreateTaskInput>;

export const UpdateTaskInput = CreateTaskInput.partial()
  .omit({ status: true })
  .extend({ status: TaskStatus.optional() })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
export type UpdateTaskInput = z.input<typeof UpdateTaskInput>;

export const ListTasksQuery = z.object({
  status: TaskStatus.optional(),
});
export type ListTasksQuery = z.infer<typeof ListTasksQuery>;
