import { useState } from 'react';
import type { LobbyDto, TaskDto, TaskStatus } from '@/types';
import { useCreateTask } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { TASK_STATUS_LABELS } from '@/lib/constants';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { AuthAlert } from '@/components/AuthAlert';
import { FormField } from '@/components/FormField';
import { ToggleRow } from '@/components/ToggleRow';
import { AssigneePicker } from '@/components/lobby/AssigneePicker';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';

interface AddTaskDrawerProps {
  lobbies: LobbyDto[];
  onClose: () => void;
  onCreated?: (task: TaskDto) => void;
  /** When set, the lobby field is locked to this id and shown as read-only. */
  lockedLobbyId?: number;
  /** Preselects the status field, e.g. when opened from a kanban column. */
  initialStatus?: TaskStatus;
}

const STATUS_OPTIONS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCreateTaskErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, { 400: 'Enter a valid title' }, "Couldn't create task — please try again");
}

export function AddTaskDrawer({
  lobbies,
  onClose,
  onCreated,
  lockedLobbyId,
  initialStatus,
}: AddTaskDrawerProps) {
  const createTask = useCreateTask();
  const isLocked = lockedLobbyId != null;
  const lockedLobby = isLocked ? lobbies.find((l) => l.id === lockedLobbyId) : undefined;

  const [lobbyId, setLobbyId] = useState<string>(String(lockedLobbyId ?? lobbies[0]?.id ?? ''));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus ?? 'TODO');
  const [notifyAssignee, setNotifyAssignee] = useState(true);

  const selectedLobby = isLocked ? lockedLobby : lobbies.find((l) => l.id === Number(lobbyId));
  const memberQueries = useUsers(selectedLobby?.memberIds ?? []);
  const members = memberQueries.map((q) => q.data).filter((u): u is NonNullable<typeof u> => !!u);
  const membersLoading = memberQueries.some((q) => q.isLoading);

  const isPastDue = dueDate !== '' && dueDate < todayStr();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !selectedLobby) return;

    createTask.mutate(
      {
        title: title.trim(),
        lobbyId: selectedLobby.id,
        assigneeId,
        dueDate: dueDate || undefined,
        description: description.trim() || undefined,
        status,
        notifyAssignee,
      },
      {
        onSuccess: (task) => {
          onCreated?.(task);
          onClose();
        },
      },
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-[420px]" side="right">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>Add Task</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-5 px-6 py-5">
            {!isLocked && (
              <div>
                <label
                  htmlFor="add-task-lobby"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Lobby
                </label>
                <select
                  id="add-task-lobby"
                  required
                  value={lobbyId}
                  onChange={(e) => setLobbyId(e.target.value)}
                  className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary focus:border-brand-green focus:outline-none"
                >
                  {lobbies.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <FormField
              id="add-task-title"
              label="Task title"
              value={title}
              onChange={setTitle}
              placeholder="What needs to be done?"
              required
            />

            <div>
              <label
                htmlFor="add-task-description"
                className="mb-1.5 block text-xs font-medium text-text-secondary"
              >
                Description (optional)
              </label>
              <textarea
                id="add-task-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details…"
                className="w-full resize-none rounded-lg border border-border bg-input-bg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-text-secondary">
                Assign to
              </span>
              <AssigneePicker
                members={members}
                selectedId={assigneeId}
                onSelect={setAssigneeId}
                isLoading={membersLoading}
              />
            </div>

            <div>
              <FormField
                id="add-task-due-date"
                label="Due date"
                type="date"
                value={dueDate}
                onChange={setDueDate}
              />
              {isPastDue && (
                <p className="mt-1.5 text-xs text-amber-600">
                  This date is in the past — the task will start off overdue.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="add-task-status"
                className="mb-1.5 block text-xs font-medium text-text-secondary"
              >
                Status
              </label>
              <select
                id="add-task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary focus:border-brand-green focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <ToggleRow
              label="Notify assignee"
              description="Send a notification when the task is assigned"
              checked={notifyAssignee}
              onChange={setNotifyAssignee}
            />

            {createTask.isError && <AuthAlert message={getCreateTaskErrorMessage(createTask.error)} />}
          </div>

          <SheetFooter className="flex-row gap-2.5 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 flex-1 rounded-lg border border-border bg-white px-4 text-sm text-text-secondary hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTask.isPending}
              className="h-10 flex-[2] rounded-lg bg-brand-green px-6 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
            >
              {createTask.isPending ? 'Adding…' : 'Add Task'}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
