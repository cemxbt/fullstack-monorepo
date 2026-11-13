'use client';

import { CreateTaskInput, Task, TaskStatus } from '@starter/contracts';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

type State =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; tasks: Task[] };

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

/** Loads tasks and exposes optimistic mutations that roll back on failure. */
export function useTasks() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [mutationError, setMutationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', tasks: await api.tasks.list() });
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tasks = state.status === 'ready' ? state.tasks : [];
  const setTasks = (update: (tasks: Task[]) => Task[]) =>
    setState((s) => (s.status === 'ready' ? { ...s, tasks: update(s.tasks) } : s));

  const mutate = async (optimistic: (tasks: Task[]) => Task[], action: () => Promise<unknown>) => {
    const previous = tasks;
    setMutationError(null);
    setTasks(optimistic);
    try {
      await action();
    } catch (error) {
      setTasks(() => previous);
      setMutationError(errorMessage(error));
    }
  };

  return {
    state,
    mutationError,
    reload: load,
    async create(input: CreateTaskInput) {
      setMutationError(null);
      try {
        const task = await api.tasks.create(input);
        setTasks((list) => [task, ...list]);
        return true;
      } catch (error) {
        setMutationError(errorMessage(error));
        return false;
      }
    },
    move(id: string, status: TaskStatus) {
      return mutate(
        (list) => list.map((t) => (t.id === id ? { ...t, status } : t)),
        () => api.tasks.update(id, { status }),
      );
    },
    remove(id: string) {
      return mutate(
        (list) => list.filter((t) => t.id !== id),
        () => api.tasks.remove(id),
      );
    },
  };
}
