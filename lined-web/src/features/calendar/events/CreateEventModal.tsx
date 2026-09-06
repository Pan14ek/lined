import { useState } from 'react';
import { Lock, TriangleAlert, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { EventDto, EventVisibility } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { useCreateEvent, useUpdateEvent, useConflictCheck } from '@/features/calendar/hooks/useEvents';
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser';
import { toDatetimeLocal, fromDatetimeLocal } from '@/features/calendar/lib/calendarUtils';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { AuthAlert } from '@/features/auth/AuthAlert';
import { ConflictBanner } from './ConflictBanner';
import { SwitchField } from '@/components/patterns/SwitchField';
import { cn } from '@/lib/utils';

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

const VISIBILITY_OPTION_BASE_CLASS =
  'flex h-11 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors';
const VISIBILITY_OPTION_ACTIVE_CLASS =
  'border-brand-green bg-brand-green-light text-brand-green-dark dark:text-brand-green';
const VISIBILITY_OPTION_INACTIVE_CLASS = 'border-border text-text-secondary hover:bg-surface-hover';

interface FormState {
  title: string;
  lobbyId: string;
  startAt: string;
  endAt: string;
  location: string;
  visibility: EventVisibility;
  /** Create-mode only — there's no `notifyMembers` field on `EventUpdateDto`. */
  notifyMembers: boolean;
}

export const CreateEventModal = ({
  lobbies,
  onClose,
  onCreated,
  lockedLobbyId,
  event,
  onSaved,
}: CreateEventModalProps) => {
  const { t } = useTranslation('calendar');
  const isEditMode = event != null;
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const lockedLobbyIdResolved = isEditMode ? event.lobbyId : lockedLobbyId;
  const lockedLobby =
    lockedLobbyIdResolved != null
      ? lobbies.find((l) => l.id === lockedLobbyIdResolved)
      : undefined;
  // Only the event owner may see/change the visibility control; a
  // non-owner never gets to edit it, even read-only (design §17.1).
  const isOwner = !isEditMode || event.ownerId === currentUserId;
  const initialVisibility: EventVisibility = event?.visibility ?? 'SHARED';

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
          visibility: initialVisibility,
          notifyMembers: false,
        }
      : {
          title: '',
          lobbyId: String(lockedLobbyId ?? lobbies[0]?.id ?? ''),
          startAt: toDatetimeLocal(defaultStart),
          endAt: toDatetimeLocal(defaultEnd),
          location: '',
          visibility: 'SHARED',
          notifyMembers: true,
        },
  );

  const set = <K extends keyof FormState,>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
      }

  const setVisibility = (visibility: EventVisibility) => {
        setForm((prev) => ({
          ...prev,
          visibility,
          notifyMembers: visibility === 'PRIVATE' ? false : prev.notifyMembers,
        }));
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

  const handleSubmit = (e: React.FormEvent) => {
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
                visibility: form.visibility,
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
            visibility: form.visibility,
            notifyMembers: form.visibility === 'SHARED' ? form.notifyMembers : false,
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
      {/* Dialog — full-screen sheet under md, centered card at md and above */}
      <div className="flex h-full w-full flex-col overflow-y-auto bg-surface md:h-auto md:max-h-[90vh] md:w-[520px] md:max-w-[90vw] md:flex-none md:rounded-2xl md:shadow-[var(--shadow-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-lg font-bold text-text-primary">
            {isEditMode ? t('createEventModal.editTitle') : t('createEventModal.newTitle')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('createEventModal.close')}
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
                {t('createEventModal.eventTitleLabel')}
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder={t('createEventModal.eventTitlePlaceholder')}
                className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
              />
            </div>

            {/* Lobby */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                {t('createEventModal.lobbyLabel')}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  {t('createEventModal.startLabel')}
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
                  {t('createEventModal.endLabel')}
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
                {t('createEventModal.locationLabel')}
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder={t('createEventModal.locationPlaceholder')}
                className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-green focus:outline-none"
              />
            </div>

            {/* Visibility — owner-only per design §17.1 */}
            {isOwner && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  {t('createEventModal.visibility.label')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility('SHARED')}
                    aria-pressed={form.visibility === 'SHARED'}
                    className={cn(
                      VISIBILITY_OPTION_BASE_CLASS,
                      form.visibility === 'SHARED' ? VISIBILITY_OPTION_ACTIVE_CLASS : VISIBILITY_OPTION_INACTIVE_CLASS,
                    )}
                  >
                    <Users className="h-4 w-4" />
                    {t('createEventModal.visibility.shared.label')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('PRIVATE')}
                    aria-pressed={form.visibility === 'PRIVATE'}
                    className={cn(
                      VISIBILITY_OPTION_BASE_CLASS,
                      form.visibility === 'PRIVATE' ? VISIBILITY_OPTION_ACTIVE_CLASS : VISIBILITY_OPTION_INACTIVE_CLASS,
                    )}
                  >
                    <Lock className="h-4 w-4" />
                    {t('createEventModal.visibility.private.label')}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">
                  {form.visibility === 'SHARED'
                    ? t('createEventModal.visibility.shared.description')
                    : t('createEventModal.visibility.private.description')}
                </p>

                {isEditMode && initialVisibility === 'SHARED' && form.visibility === 'PRIVATE' && (
                  <div
                    role="status"
                    className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 dark:border-amber-800/60 dark:bg-amber-950/30"
                  >
                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-400" />
                    <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                      {t('createEventModal.visibility.sharedToPrivateWarning')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Notify members — create-mode only; there's no notifyMembers field on edit */}
            {!isEditMode && (
              <SwitchField
                label={t('createEventModal.notifyToggle.label')}
                description={t('createEventModal.notifyToggle.description')}
                checked={form.notifyMembers}
                onCheckedChange={(v) => set('notifyMembers', v)}
                disabled={form.visibility === 'PRIVATE'}
              />
            )}

            {mutation.isError && (
              <AuthAlert
                message={getEventErrorMessage(mutation.error, isEditMode, t)}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-border bg-surface px-4 text-sm text-text-secondary hover:bg-surface-hover"
            >
              {t('createEventModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-10 rounded-lg bg-brand-green px-6 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
            >
              {isEditMode
                ? mutation.isPending
                  ? t('createEventModal.submit.saving')
                  : hasConflicts
                    ? t('createEventModal.submit.saveAnyway')
                    : t('createEventModal.submit.saveChanges')
                : mutation.isPending
                  ? t('createEventModal.submit.creating')
                  : hasConflicts
                    ? t('createEventModal.submit.createAnyway')
                    : t('createEventModal.submit.createEvent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const getEventErrorMessage = (error: unknown, isEditMode: boolean, t: TFunction<'calendar'>): string => {
  return getApiErrorMessage(
    error,
    { 400: t('createEventModal.errors.invalidTitleTime') },
    isEditMode ? t('createEventModal.errors.saveFailed') : t('createEventModal.errors.createFailed'),
  );
}
