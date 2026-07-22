import { useTranslation } from 'react-i18next';
import { LOBBY_TYPE_ICONS, LOBBY_TYPE_LABELS, LOBBY_TYPE_TAGLINES, LOBBY_TYPES } from '@/features/lobby/lib/constants';
import { useCreateMenuStore } from '@/store/createMenu';

interface DashboardHeroProps {
  username: string;
}

export const DashboardHero = ({ username }: DashboardHeroProps) => {
  const { t } = useTranslation('dashboard');
  const openCreateLobby = useCreateMenuStore((s) => s.openCreateLobby);

  return (
    <section className="flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-border bg-surface px-8 py-10 text-center">
      <span className="text-4xl leading-none">🌱</span>
      <div>
        <h2 className="text-xl font-bold text-text-primary">
          {t('hero.welcome', { username })}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">{t('hero.description')}</p>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        {LOBBY_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => openCreateLobby(type)}
            className="cursor-pointer rounded-lg border-2 border-border bg-surface px-3 py-3.5 text-center transition-colors hover:bg-surface-hover"
          >
            <div className="mb-1.5 text-xl leading-none">{LOBBY_TYPE_ICONS[type]}</div>
            <div className="text-sm font-semibold text-text-primary">
              {LOBBY_TYPE_LABELS[type]}
            </div>
            <div className="text-xs text-text-secondary">{LOBBY_TYPE_TAGLINES[type]}</div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => openCreateLobby()}
        className="h-10 rounded-lg bg-brand-green px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
      >
        {t('hero.createFirstLobby')}
      </button>
    </section>
  );
}
