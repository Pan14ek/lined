import { useState } from 'react';
import { X } from 'lucide-react';
import type { EventDto, LobbyDto } from '@/types';
import { useCreateEvent } from '@/hooks/useEvents';
import { toDatetimeLocal, fromDatetimeLocal } from '@/lib/calendarUtils';

interface CreateEventModalProps {
  lobbies: LobbyDto[];
  onClose: () => void;
  onCreated: (event: EventDto) => void;
}

interface FormState {
  title: string;
  lobbyId: string;
  startAt: string;
  endAt: string;
  shared: boolean;
}

export function CreateEventModal({
  lobbies,
  onClose,
  onCreated,
}: CreateEventModalProps) {
  const createEvent = useCreateEvent();

  // Default: start = now rounded to next hour, end = +1h
  const defaultStart = (() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  })();
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [form, setForm] = useState<FormState>({
    title: '',
    lobbyId: String(lobbies[0]?.id ?? ''),
    startAt: toDatetimeLocal(defaultStart),
    endAt: toDatetimeLocal(defaultEnd),
    shared: true,
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.lobbyId) return;

    const startDate = fromDatetimeLocal(form.startAt);
    const endDate = fromDatetimeLocal(form.endAt);

    createEvent.mutate(
      {
        title: form.title.trim(),
        lobbyId: Number(form.lobbyId),
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        shared: form.shared,
      },
      {
        onSuccess: (event) => {
          onCreated(event);
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
          <h2 className="text-lg font-bold text-text-primary">New Event</h2>
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

            {/* Shared toggle */}
            <ToggleRow
              label="Shared event"
              description="Visible to all lobby members"
              checked={form.shared}
              onChange={(v) => set('shared', v)}
            />
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
              disabled={createEvent.isPending}
              className="h-10 rounded-lg bg-brand-green px-6 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
            >
              {createEvent.isPending ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3.5">
      <div>
        <div className="text-sm font-medium text-text-primary">{label}</div>
        <div className="mt-0.5 text-xs text-text-secondary">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-green' : 'bg-border'
        }`}
      >
        <span
          className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-[left] ${
            checked ? 'left-[23px]' : 'left-[3px]'
          }`}
        />
      </button>
    </div>
  );
}
