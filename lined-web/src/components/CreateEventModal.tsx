import { useState } from 'react';
import { X } from 'lucide-react';
import type { EventDto, LobbyDto } from '@/types';
import { useCreateEvent, useUpdateEvent, useConflictCheck } from '@/hooks/useEvents';
import { useAuthStore } from '@/store/auth';
import { toDatetimeLocal, fromDatetimeLocal } from '@/lib/calendarUtils';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { AuthAlert } from '@/components/AuthAlert';
import { ConflictBanner } from '@/components/ConflictBanner';
import { ToggleRow } from '@/components/ToggleRow';

interface CreateEventModalProps {
  lobbies: LobbyDto[];
  onClose: () => void;
  /** Called after a successful create. Required unless `event` is set (edit mode). */
  onCreated?: (event: EventDto) => void;
  /** When set, the lobby field is locked to this id and shown as read-only. */
  lockedLobbyId?: number;
  /** When set, the modal opens in edit mode, pre-filled from this event. */
  event?: EventDto;
  /** Called after a successful edit-mode save. Required when `event` is set. */
  onSaved?: (event: EventDto) => void;
}

interface FormState {
  title: string;
  lobbyId: string;
  startAt: string;
  endAt: string;
  location: string;
  shared: boolean;
}

export function CreateEventModal({
  lobbies,
  onClose,
  onCreated,
  lockedLobbyId,
  event,
  onSaved,
}: CreateEventModalProps) {
  const isEditMode = event != null;
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const currentUserId = useAuthStore((s) => s.userId);
  const lockedLobbyIdResolved = isEditMode ? event.lobbyId : lockedLobbyId;
  const lockedLobby =
    lockedLobbyIdResolved != null
      ? lobbies.find((l) => l.id === lockedLobbyIdResolved)
      : undefined;

  // Default: start = now rounded to next hour, end = +1h
  const defaultStart = (() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  })();
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const initialLocation = event?.location ?? '';
  const [form, setForm] = useState<FormState>(() =>
    event
      ? {
          title: event.title,
          lobbyId: String(event.lobbyId),
          startAt: toDatetimeLocal(new Date(event.startAt)),
          endAt: toDatetimeLocal(new Date(event.endAt)),
          location: initialLocation,
          shared: event.shared,
        }
      : {
          title: '',
          lobbyId: String(lockedLobbyId ?? lobbies[0]?.id ?? ''),
          startAt: toDatetimeLocal(defaultStart),
          endAt: toDatetimeLocal(defaultEnd),
          location: '',
          shared: true,
        },
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const mutation = isEditMode ? updateEvent : createEvent;

  const { conflicts, suggestion } = useConflictCheck({
    lobbyId: form.lobbyId ? Number(form.lobbyId) : null,
    startAt: form.startAt,
    endAt: form.endAt,
    currentUserId,
    excludeEventId: event?.id,
  });
  const hasConflicts = conflicts.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.lobbyId) return;

    const startDate = fromDatetimeLocal(form.startAt);
    const endDate = fromDatetimeLocal(form.endAt);
    const trimmedLocation = form.location.trim();

    if (isEditMode) {
      updateEvent.mutate(
        {
          id: event.id,
          data: {
            title: form.title.trim(),
            startAt: startDate.toISOString(),
            endAt: endDate.toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            shared: form.shared,
            // Only send location if it changed — omitting preserves the current value.
            ...(trimmedLocation !== initialLocation ? { location: trimmedLocation } : {}),
          },
        },
        { onSuccess: (updated) => onSaved?.(updated) },
      );
      return;
    }

    createEvent.mutate(
      {
        title: form.title.trim(),
        lobbyId: Number(form.lobbyId),
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        shared: form.shared,
        ...(trimmedLocation ? { location: trimmedLocation } : {}),
      },
      {
        onSuccess: (createdEvent) => {
          onCreated?.(createdEvent);
        },
      },
    );
  }

  return (
    /* Backdrop */
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog */}
      <div className="w-[520px] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-lg font-bold text-text-primary">
            {isEditMode ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Event title
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Movie night, Doctor appointment…"
                className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
              />
            </div>

            {/* Lobby */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Lobby
              </label>
              {lockedLobby ? (
                <div className="flex h-12 w-full items-center rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary">
                  {lockedLobby.name}
                </div>
              ) : (
                <select
                  required
                  value={form.lobbyId}
                  onChange={(e) => set('lobbyId', e.target.value)}
                  className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary focus:border-brand-green focus:outline-none"
                >
                  {lobbies.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Start / End */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Start
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.startAt}
                  onChange={(e) => set('startAt', e.target.value)}
                  className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary focus:border-brand-green focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  End
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.endAt}
                  onChange={(e) => set('endAt', e.target.value)}
                  className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary focus:border-brand-green focus:outline-none"
                />
              </div>
            </div>

            <ConflictBanner
              conflicts={conflicts}
              currentUserId={currentUserId}
              suggestion={suggestion}
              onPickSuggestion={(start, end) => {
                set('startAt', toDatetimeLocal(new Date(start)));
                set('endAt', toDatetimeLocal(new Date(end)));
              }}
            />

            {/* Location */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Location (optional)
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. Home, Central Park…"
                className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
              />
            </div>

            {/* Shared toggle */}
            <ToggleRow
              label="Shared event"
              description="Visible to all lobby members"
              checked={form.shared}
              onChange={(v) => set('shared', v)}
            />

            {mutation.isError && (
              <AuthAlert
                message={getEventErrorMessage(mutation.error, isEditMode)}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-border bg-white px-4 text-sm text-text-secondary hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-10 rounded-lg bg-brand-green px-6 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
            >
              {isEditMode
                ? mutation.isPending
                  ? 'Saving…'
                  : hasConflicts
                    ? 'Save Anyway'
                    : 'Save changes'
                : mutation.isPending
                  ? 'Creating…'
                  : hasConflicts
                    ? 'Create Anyway'
                    : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getEventErrorMessage(error: unknown, isEditMode: boolean): string {
  return getApiErrorMessage(
    error,
    { 400: 'Enter a valid title and time range' },
    isEditMode ? "Couldn't save changes — please try again" : "Couldn't create event — please try again",
  );
}
