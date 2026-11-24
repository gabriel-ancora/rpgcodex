import React, { useEffect, useState } from 'react';
import { DmDashboardView } from './DmDashboardView';
import { PlayerDashboardView } from './PlayerDashboardView';
import { useCampaignStore } from '../../store/useCampaignStore';
import { getStoredTheme, setTheme, ThemeMode } from '../../utils/theme';
import { Settings, LogOut, Sun, Moon } from 'lucide-react';

/**
 * Painel inicial (`/campaigns`): exibido antes de entrar no gerenciamento de
 * qualquer campanha. Separa claramente as campanhas em que o usuário é Mestre
 * ("Mestrando") das campanhas em que participa como Jogador ("Jogando").
 */
export const CampaignsHome: React.FC = () => {
  const currentUser = useCampaignStore((s) => s.currentUser);
  const logoutUser = useCampaignStore((s) => s.logoutUser);
  const setIsSettingsModalOpen = useCampaignStore((s) => s.setIsSettingsModalOpen);

  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail;
      if (detail === 'light' || detail === 'dark') setThemeState(detail);
    };
    window.addEventListener('codex-theme-change', onChange);
    return () => window.removeEventListener('codex-theme-change', onChange);
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

  return (
    <div className="min-h-full flex flex-col bg-canvas">
      <header className="h-14 px-4 sm:px-6 bg-surface border-b border-line flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-accent text-accent-fg flex items-center justify-center shrink-0">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.5L14 5V11L8 14.5L2 11V5L8 1.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M8 1.5V14.5M2 5L8 8.5L14 5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-fg">Codex</span>
          <span className="hidden sm:inline text-fg-subtle">/</span>
          <span className="hidden sm:inline text-sm text-fg-muted truncate">Painel de campanhas</span>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-line">
              <div className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-[11px] font-semibold text-fg-muted shrink-0">
                {(currentUser.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm text-fg font-medium max-w-[160px] truncate">{currentUser.name}</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon"
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="btn btn-secondary btn-sm"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configurações</span>
          </button>

          <button
            type="button"
            onClick={logoutUser}
            className="btn btn-ghost btn-icon"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        <div>
          <h1 className="page-title">Suas campanhas</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Escolha uma campanha que você criou para gerenciar como Mestre, ou entre em uma mesa onde participa como Jogador.
          </p>
        </div>

        <DmDashboardView />
        <div className="divider" />
        <PlayerDashboardView />
      </div>
    </div>
  );
};
