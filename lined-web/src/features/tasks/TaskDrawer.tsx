import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { LobbyDto } from '@/features/lobby/model';
import type { TaskDto, TaskPriority, TaskStatus, TaskUpdateDto } from '@/features/tasks/model';
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/features/tasks/hooks/useTasks';
import { useUser, useUsers } from '@/features/users/hooks/useUsers';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_OPTIONS } from '@/features/tasks/lib/constants';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { formatShortDate } from '@/features/calendar/lib/calendarUtils';
import { AuthAlert } from '@/features/auth/AuthAlert';
import { FormField } from '@/components/FormField';
import { ToggleRow } from '@/components/ToggleRow';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AssigneePicker } from '@/features/lobby/members/AssigneePicker';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';

interface TaskDrawerProps {
  lobbies: LobbyDto[];
  onClose: () => void;
  onCreated?: (task: TaskDto) => void;
  /** When set, the lobby field is locked to this id and shown as read-only. */
  lockedLobbyId?: number;
  /** Preselects the status field, e.g. when opened from a kanban column. */
  initialStatus?: TaskStatus;
  /** When set, the drawer opens in edit mode, pre-filled from this task. */
  task?: TaskDto;
}

interface TaskFormValues {
  title: string;
  description: string;
  assigneeId: number | undefined;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
}

const STATUS_OPTIONS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

const todayStr = (): string => {
  return new Date().toISOString().slice(0, 10);
}

const getTaskErrorMessage = (error: unknown, isEditMode: boolean): string => {
  return getApiErrorMessage(
    error,
    { 400: 'Enter a valid title' },
    isEditMode ? "Couldn't save changes — please try again" : "Couldn't create task — please try again",
  );
}

const getDeleteTaskErrorMessage = (error: unknown): string => {
  return getApiErrorMessage(error, {}, "Couldn't delete this task — please try again");
}

const buildTaskPatch = (task: TaskDto, form: TaskFormValues): TaskUpdateDto => {
  const patch: TaskUpdateDto = {};
  if (form.title.trim() !== task.title) patch.title = form.title.trim();
  if (form.description.trim() !== (task.description ?? '')) patch.description = form.description.trim();
  if (form.assigneeId != null && form.assigneeId !== task.assigneeId) patch.assigneeId = form.assigneeId;
  if (form.dueDate && form.dueDate !== (task.dueDate?.slice(0, 10) ?? '')) patch.dueDate = form.dueDate;
  if (form.priority !== task.priority) patch.priority = form.priority;
  if (form.status !== task.status) patch.status = form.status;
  return patch;
}

export const TaskDrawer = ({
  lobbies,
  onClose,
  onCreated,
  lockedLobbyId,
  initialStatus,
  task,
}: TaskDrawerProps) => {
  const isEditMode = task != null;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const mutation = isEditMode ? updateTask : createTask;

  const effectiveLockedLobbyId = isEditMode ? task.lobbyId : lockedLobbyId;
  const isLocked = effectiveLockedLobbyId != null;
  const lockedLobby = isLocked ? lobbies.find((l) => l.id === effectiveLockedLobbyId) : undefined;

  const [lobbyId, setLobbyId] = useState<string>(
    String(effectiveLockedLobbyId ?? lobbies[0]?.id ?? ''),
  );
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assigneeId, setAssigneeId] = useState<number | undefined>(task?.assigneeId ?? undefined);
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus ?? 'TODO');
  const [notifyAssignee, setNotifyAssignee] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const selectedLobby = isLocked ? lockedLobby : lobbies.find((l) => l.id === Number(lobbyId));
  const memberQueries = useUsers(selectedLobby?.memberIds ?? []);
  const members = memberQueries.map((q) => q.data).filter((u): u is NonNullable<typeof u> => !!u);
  const membersLoading = memberQueries.some((q) => q.isLoading);
  const { data: creator } = useUser(task?.creatorId);

  const isPastDue = dueDate !== '' && dueDate < todayStr();

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        if (isEditMode) {
          const patch = buildTaskPatch(task, { title, description, assigneeId, dueDate, priority, status });
          updateTask.mutate({ id: task.id, data: patch }, { onSuccess: () => onClose() });
          return;
        }

        if (!selectedLobby) return;
        createTask.mutate(
          {
            title: title.trim(),
            lobbyId: selectedLobby.id,
            assigneeId,
            dueDate: dueDate || undefined,
            description: description.trim() || undefined,
            priority,
            status,
            notifyAssignee,
          },
          {
            onSuccess: (created) => {
              onCreated?.(created);
              onClose();
            },
          },
        );
      }

  const handleDeleteConfirm = () => {
        if (!task) return;
        deleteTask.mutate(task.id, { onSuccess: () => onClose() });
      }

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-[420px]" side="right">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>{isEditMode ? 'Task details' : 'Add Task'}</SheetTitle>
            {isEditMode && (
              <SheetDescription>
                Created {formatShortDate(new Date(task.createdAt))}
                {creator ? ` by ${creator.username}` : ''}
                {selectedLobby ? ` · ${selectedLobby.name}` : ''}
              </SheetDescription>
            )}
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

              <div className="grid grid-cols-2 gap-4">
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
                    htmlFor="add-task-priority"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Priority
                  </label>
                  <select
                    id="add-task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary focus:border-brand-green focus:outline-none"
                  >
                    {TASK_PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {TASK_PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>
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

              {!isEditMode && (
                <ToggleRow
                  label="Notify assignee"
                  description="Send a notification when the task is assigned"
                  checked={notifyAssignee}
                  onChange={setNotifyAssignee}
                />
              )}

              {mutation.isError && (
                <AuthAlert message={getTaskErrorMessage(mutation.error, isEditMode)} />
              )}
            </div>

            <SheetFooter className="flex-row items-center gap-2.5 border-t border-border px-6 py-4">
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="h-10 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`h-10 rounded-lg border border-border bg-white px-4 text-sm text-text-secondary hover:bg-gray-50 ${
                  isEditMode ? 'ml-auto' : 'flex-1'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className={`h-10 rounded-lg bg-brand-green px-6 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60 transition-colors ${
                  isEditMode ? '' : 'flex-[2]'
                }`}
              >
                {isEditMode
                  ? mutation.isPending
                    ? 'Saving…'
                    : 'Save changes'
                  : mutation.isPending
                    ? 'Adding…'
                    : 'Add Task'}
              </button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {isConfirmingDelete &&
        task &&
        createPortal(
          <ConfirmDialog
            title="Delete task"
            message={`Delete "${task.title}"? This can't be undone.`}
            confirmLabel="Delete"
            danger
            isPending={deleteTask.isPending}
            error={deleteTask.isError ? getDeleteTaskErrorMessage(deleteTask.error) : null}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setIsConfirmingDelete(false)}
          />,
          document.body,
        )}
    </>
  );
}
