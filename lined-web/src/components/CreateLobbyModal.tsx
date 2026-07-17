import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { LobbyType } from '@/types';
import { useCreateLobby } from '@/hooks/useLobbies';
import { LobbyTypePicker } from '@/components/LobbyTypePicker';
import { FormField } from '@/components/FormField';
import { AuthAlert } from '@/components/AuthAlert';
import { getApiErrorMessage } from '@/lib/apiErrors';

interface CreateLobbyModalProps {
  onClose: () => void;
}

export const CreateLobbyModal = ({ onClose }: CreateLobbyModalProps) => {
  const navigate = useNavigate();
  const createLobby = useCreateLobby();

  const [name, setName] = useState('');
  const [lobbyType, setLobbyType] = useState<LobbyType>('COUPLE');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    createLobby.mutate(
      { name: name.trim(), lobbyType },
      {
        onSuccess: (lobby) => {
          onClose();
          navigate(`/lobbies/${lobby.id}`);
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
      <div className="w-[460px] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-lg font-bold text-text-primary">New Lobby</h2>
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
            {/* Name */}
            <FormField
              id="create-lobby-name"
              label="Lobby name"
              type="text"
              required
              value={name}
              onChange={setName}
              placeholder="e.g. Alex & Anastasiia, Johnson Family…"
            />

            {/* Type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Lobby type
              </label>
              <LobbyTypePicker value={lobbyType} onChange={setLobbyType} />
            </div>

            {createLobby.isError && (
              <AuthAlert message={getCreateLobbyErrorMessage(createLobby.error)} />
            )}

            {/* Hint */}
            <div className="rounded-lg bg-bg px-3.5 py-3 text-xs text-text-secondary">
              💡 You&apos;ll be the owner. Invite members right after creating the lobby.
            </div>
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
              disabled={createLobby.isPending || !name.trim()}
              className="h-10 rounded-lg bg-brand-green px-6 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
            >
              {createLobby.isPending ? 'Creating…' : 'Create Lobby'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function getCreateLobbyErrorMessage(error: unknown): string {
  return getApiErrorMessage(
    error,
    { 400: 'Enter a valid lobby name' },
    'Something went wrong — please try again',
  );
}
