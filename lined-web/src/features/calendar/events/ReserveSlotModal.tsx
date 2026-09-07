import { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { EventDto } from '@/features/calendar/model';
import type { LobbyDto } from '@/features/lobby/model';
import { useCreateEvent, useConflictCheck } from '@/features/calendar/hooks/useEvents';
import { useFreeSlotCandidates, type FreeSlotCandidate } from '@/features/dashboard/hooks/useDashboard';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser';
import type { ReserveSlotInitial } from '@/store/createMenu';
import { toDatetimeLocal, fromDatetimeLocal, formatFreeSlotRange } from '@/features/calendar/lib/calendarUtils';
import { LOBBY_TYPE_ICONS } from '@/features/lobby/lib/constants';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { AuthAlert } from '@/features/auth/AuthAlert';
import { ConflictBanner } from './ConflictBanner';
import { TextField } from '@/components/design-system/forms/TextField';
import { UserAvatar } from '@/features/users/UserAvatar';
import { SwitchField } from '@/components/patterns/SwitchField';

interface ReserveSlotModalProps {
  lobbies: LobbyDto[];
  /** null ⇒ compute candidates across the user's lobbies and let them pick (create-menu entry point). */
  initial: ReserveSlotInitial | null;
  onClose: () => void;
  onReserved?: (event: EventDto) => void;
}

/** A resolved slot ready to render as a form: a concrete or picked time window, possibly missing a lobby. */
interface ResolvedSlot {
  lobbyId: number | null;
  start: string;
  end: string;
}

export const ReserveSlotModal = ({ lobbies, initial, onClose, onReserved }: ReserveSlotModalProps) => {
  const { t } = useTranslation('calendar');
  const { candidates, isLoading: candidatesLoading } = useFreeSlotCandidates(lobbies);
  const [pickedCandidate, setPickedCandidate] = useState<FreeSlotCandidate | null>(null);

  const resolved: ResolvedSlot | null = initial
    ? { lobbyId: initial.lobbyId ?? null, start: initial.start, end: initial.end }
    : pickedCandidate
      ? { lobbyId: pickedCandidate.lobby.id, start: pickedCandidate.start, end: pickedCandidate.end }
      : null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full flex-col overflow-y-auto bg-surface md:h-auto md:max-h-[90vh] md:w-[520px] md:max-w-[90vw] md:flex-none md:rounded-2xl md:shadow-[var(--shadow-lg)]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{t('reserveSlotModal.title')}</h2>
            {resolved && (
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-green-light px-3 py-1 text-xs font-semibold text-brand-green-dark dark:text-brand-green">
                <Sparkles className="h-3 w-3" />
                {t('reserveSlotModal.bothFree', { range: formatFreeSlotRange(resolved.start, resolved.end) })}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t('reserveSlotModal.close')}
            className="text-text-muted hover:text-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {resolved ? (
            <ReserveSlotForm
              key={`${resolved.lobbyId}-${resolved.start}`}
              lobbies={lobbies}
              slot={resolved}
              onClose={onClose}
              onReserved={onReserved}
            />
          ) : (
            <CandidatePicker
              candidates={candidates}
              isLoading={candidatesLoading}
              onPick={setPickedCandidate}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ReserveSlotForm ───────────────────────────────────────────────────────────

interface ReserveSlotFormProps {
  lobbies: LobbyDto[];
  slot: ResolvedSlot;
  onClose: () => void;
  onReserved?: (event: EventDto) => void;
}

const getReserveErrorMessage = (error: unknown, t: TFunction<'calendar'>): string => {
  return getApiErrorMessage(
    error,
    { 400: t('reserveSlotModal.errors.invalidTitleTime') },
    t('reserveSlotModal.errors.reserveFailed'),
  );
}

const ReserveSlotForm = ({ lobbies, slot, onClose, onReserved }: ReserveSlotFormProps) => {
  const { t } = useTranslation('calendar');
  const createEvent = useCreateEvent();
  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const sharableLobbies = lobbies.filter((l) => l.memberIds.length > 1);
  const showLobbyPicker = slot.lobbyId == null;

  const [selectedLobbyId, setSelectedLobbyId] = useState<number | undefined>(
    slot.lobbyId ?? sharableLobbies[0]?.id,
  );
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState(() => toDatetimeLocal(new Date(slot.start)));
  const [endAt, setEndAt] = useState(() => toDatetimeLocal(new Date(slot.end)));
  const [location, setLocation] = useState('');
  const [notifyMembers, setNotifyMembers] = useState(true);

  const lobby = lobbies.find((l) => l.id === selectedLobbyId) ?? null;
  const { conflicts, suggestion } = useConflictCheck({
    lobbyId: lobby?.id ?? null,
    startAt,
    endAt,
    currentUserId,
  });
  const memberQueries = useUsers(lobby?.memberIds ?? []);
  const members = memberQueries.map((q) => q.data).filter((u): u is NonNullable<typeof u> => !!u);
  const membersLoading = memberQueries.some((q) => q.isLoading);

  const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !lobby || !startAt || !endAt) return;

        const trimmedLocation = location.trim();
        createEvent.mutate(
          {
            title: title.trim(),
            lobbyId: lobby.id,
            visibility: 'SHARED',
            startAt: fromDatetimeLocal(startAt).toISOString(),
            endAt: fromDatetimeLocal(endAt).toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            notifyMembers,
            ...(trimmedLocation ? { location: trimmedLocation } : {}),
          },
          { onSuccess: (event) => onReserved?.(event) },
        );
      }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        {showLobbyPicker ? (
          <div>
            <label
              htmlFor="reserve-slot-lobby"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              {t('reserveSlotModal.lobbyLabel')}
            </label>
            <select
              id="reserve-slot-lobby"
              required
              value={selectedLobbyId ?? ''}
              onChange={(e) => setSelectedLobbyId(Number(e.target.value))}
              className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary focus:border-brand-green focus:outline-none"
            >
              {sharableLobbies.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        ) : lobby ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-brand-green-light p-3">
            <span className="text-xl">{LOBBY_TYPE_ICONS[lobby.lobbyType]}</span>
            <div>
              <div className="text-sm font-semibold text-brand-green-dark dark:text-brand-green">
                {t('reserveSlotModal.lobbyBothFree', { lobbyName: lobby.name })}
              </div>
              <div className="mt-0.5 text-xs text-brand-green-dark dark:text-brand-green">
                {formatFreeSlotRange(slot.start, slot.end)}
              </div>
            </div>
          </div>
        ) : null}

        <TextField
          id="reserve-slot-title"
          label={t('reserveSlotModal.whatWouldYouLikeToDo')}
          value={title}
          onValueChange={setTitle}
          placeholder={t('reserveSlotModal.titlePlaceholder')}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('reserveSlotModal.startTimeLabel')}</label>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary focus:border-brand-green focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('reserveSlotModal.endTimeLabel')}</label>
            <input
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-input-bg px-4 text-sm text-text-primary focus:border-brand-green focus:outline-none"
            />
          </div>
        </div>

        <ConflictBanner
          conflicts={conflicts}
          currentUserId={currentUserId}
          suggestion={suggestion}
          onPickSuggestion={(start, end) => {
            setStartAt(toDatetimeLocal(new Date(start)));
            setEndAt(toDatetimeLocal(new Date(end)));
          }}
        />

        <TextField
          id="reserve-slot-location"
          label={t('reserveSlotModal.locationLabel')}
          value={location}
          onValueChange={setLocation}
          placeholder={t('reserveSlotModal.locationPlaceholder')}
        />

        {lobby && (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('reserveSlotModal.inviteLabel')}</span>
            {membersLoading ? (
              <div className="h-12 w-full animate-pulse rounded-lg bg-surface-hover" />
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-input-bg px-3 py-2.5">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-1.5">
                    <UserAvatar user={member} size="sm" />
                    <span className="text-sm text-text-primary">{member.username}</span>
                    {member.id === currentUserId && (
                      <span className="text-xs text-text-secondary">{t('reserveSlotModal.you')}</span>
                    )}
                  </div>
                ))}
                <Check
                  className="ml-auto h-4 w-4 flex-shrink-0 text-brand-green"
                  aria-label={t('reserveSlotModal.everyoneIncluded')}
                />
              </div>
            )}
          </div>
        )}

        <SwitchField
          label={t('reserveSlotModal.notifyToggle.label')}
          description={t('reserveSlotModal.notifyToggle.description')}
          checked={notifyMembers}
          onCheckedChange={setNotifyMembers}
        />

        {createEvent.isError && <AuthAlert message={getReserveErrorMessage(createEvent.error, t)} />}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-lg border border-border bg-surface px-4 text-sm text-text-secondary hover:bg-surface-hover"
        >
          {t('reserveSlotModal.cancel')}
        </button>
        <button
          type="submit"
          disabled={createEvent.isPending || !lobby}
          className="h-10 rounded-lg bg-brand-green px-6 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
        >
          {createEvent.isPending ? t('reserveSlotModal.submit.reserving') : t('reserveSlotModal.submit.reserveSlot')}
        </button>
      </div>
    </form>
  );
}

// ─── CandidatePicker ───────────────────────────────────────────────────────────

interface CandidatePickerProps {
  candidates: FreeSlotCandidate[];
  isLoading: boolean;
  onPick: (candidate: FreeSlotCandidate) => void;
  onClose: () => void;
}

const CandidatePicker = ({ candidates, isLoading, onPick, onClose }: CandidatePickerProps) => {
  const { t } = useTranslation('calendar');
  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="candidate-picker-loading">
        {[0, 1].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-hover" />
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center">
        <p className="py-4 text-sm text-text-secondary">
          {t('reserveSlotModal.candidatePicker.noneFound')}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-full rounded-lg border border-border bg-surface text-sm text-text-secondary hover:bg-surface-hover"
        >
          {t('reserveSlotModal.candidatePicker.close')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs font-medium text-text-secondary">{t('reserveSlotModal.candidatePicker.chooseTime')}</p>
      <ul className="flex flex-col gap-2">
        {candidates.map((candidate) => (
          <li key={candidate.lobby.id}>
            <button
              type="button"
              onClick={() => onPick(candidate)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-border px-4 py-3 text-left hover:border-brand-green hover:bg-brand-green-light/40"
            >
              <span className="text-lg">{LOBBY_TYPE_ICONS[candidate.lobby.lobbyType]}</span>
              <div>
                <div className="text-sm font-semibold text-text-primary">{candidate.lobby.name}</div>
                <div className="text-xs text-text-secondary">
                  {formatFreeSlotRange(candidate.start, candidate.end)}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
