'use client';

import { CreateTaskInput, TASK_STATUSES, TASK_STATUS_LABELS, Task } from '@starter/contracts';
import { FormEvent, useState } from 'react';
import { useTasks } from '../lib/use-tasks';

export function Board() {
  const { state, mutationError, reload, create, move, remove } = useTasks();

  if (state.status === 'loading') return <p className="muted">Loading tasks…</p>;
  if (state.status === 'error') {
    return (
      <div className="alert" role="alert">
        <p>Could not load tasks: {state.message}</p>
        <button onClick={() => void reload()}>Try again</button>
      </div>
    );
  }

  return (
    <>
      <NewTaskForm onCreate={create} />
      {mutationError && (
        <p className="alert" role="alert">
          {mutationError}
        </p>
      )}
      <section className="columns">
        {TASK_STATUSES.map((status) => {
          const column = state.tasks.filter((t) => t.status === status);
          return (
            <div key={status} className="column">
              <h2>
                {TASK_STATUS_LABELS[status]} <span className="count">{column.length}</span>
              </h2>
              {column.length === 0 && <p className="muted">Nothing here yet.</p>}
              {column.map((task) => (
                <TaskCard key={task.id} task={task} onMove={move} onRemove={remove} />
              ))}
            </div>
          );
        })}
      </section>
    </>
  );
}

function NewTaskForm({ onCreate }: { onCreate: (input: CreateTaskInput) => Promise<boolean> }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Validate with the same schema the API uses before making a request.
    const parsed = CreateTaskInput.safeParse({ title });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid task');
      return;
    }
    setError(null);
    setSubmitting(true);
    if (await onCreate(parsed.data)) setTitle('');
    setSubmitting(false);
  }

  return (
    <form className="new-task" onSubmit={handleSubmit} noValidate>
      <input
        aria-label="Task title"
        placeholder="What needs doing?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />
      <button type="submit" disabled={submitting}>
        Add task
      </button>
      {error && <p className="field-error">{error}</p>}
    </form>
  );
}

function TaskCard({
  task,
  onMove,
  onRemove,
}: {
  task: Task;
  onMove: (id: string, status: Task['status']) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <article className="card">
      <p className="card-title">{task.title}</p>
      <div className="card-actions">
        <select
          aria-label={`Status of ${task.title}`}
          value={task.status}
          onChange={(e) => void onMove(task.id, e.target.value as Task['status'])}
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button className="link" onClick={() => void onRemove(task.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}
