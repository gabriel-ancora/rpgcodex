import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCampaignStore } from '../../store/useCampaignStore';
import { getStoredTheme, setTheme, ThemeMode } from '../../utils/theme';
import { Menu, Calendar, Sun, Moon, ChevronRight } from 'lucide-react';

interface TopCommandBarProps {
  onOpenMobileSidebar?: () => void;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  onOpenMobileSidebar,
}) => {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const sessionToken = useCampaignStore((s) => s.sessionToken);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const currentRoute = useCampaignStore((s) => s.currentRoute);
  const setCurrentRoute = useCampaignStore((s) => s.setCurrentRoute);
  const activeModule = useCampaignStore((s) => s.activeModule);
  const worldSubTab = useCampaignStore((s) => s.worldSubTab);
  const plotSubTab = useCampaignStore((s) => s.plotSubTab);
  const portalSubTab = useCampaignStore((s) => s.portalSubTab);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const setViewRole = useCampaignStore((s) => s.setViewRole);
  const calendar = useCampaignStore((s) => s.calendar);

  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());

  // Mantém o estado local sincronizado se o tema for alterado em outro lugar.
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

  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);
  const campaignName = activeCamp?.title || '';
  const canDmActiveCamp = Boolean(activeCampaignId && activeCamp?.isDm !== false);

  const dbStatus = useQuery(
    api.campaign.getStatus,
    activeCampaignId && sessionToken ? { campaignId: activeCampaignId, sessionToken } : 'skip'
  );

  const currentMonth =
    calendar.months[calendar.currentMonthIndex]?.name ||
    calendar.months[0]?.name ||
    'Mês 1';

  const getSectionTitle = (): string => {
    if (currentRoute === '/campaigns') return 'Campanhas';
    if (currentRoute === '/campaign/player-view') return 'Visão da mesa';
    if (activeModule === 'session') return 'Sessão';
    if (activeModule === 'worldbuilding') {
      if (worldSubTab === 'wiki') return 'Códice';
      if (worldSubTab === 'graph') return 'Relações';
      if (worldSubTab === 'maps') return 'Mapas';
      return 'Cronologia';
    }
    if (activeModule === 'plots') {
      if (plotSubTab === 'fronts') return 'Frentes e relógios';
      if (plotSubTab === 'flowchart') return 'Cenas e pistas';
      return 'Oráculo';
    }
    if (portalSubTab === 'secrets') return 'Segredos';
    if (portalSubTab === 'quests') return 'Missões';
    return 'Diário e espólio';
  };

  return (
    <header className="h-14 px-4 lg:px-6 bg-surface border-b border-line flex items-center justify-between gap-3 z-30 shrink-0">
      {/* Esquerda: menu mobile + trilha */}
      <div className="flex items-center gap-2 min-w-0">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden btn btn-ghost btn-icon -ml-1"
            aria-label="Abrir navegação"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <nav aria-label="Trilha" className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-fg-muted truncate max-w-[140px] sm:max-w-[260px]">
            {campaignName || 'Codex'}
          </span>
          <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0" />
          <span className="text-fg font-medium truncate">{getSectionTitle()}</span>
        </nav>
      </div>

      {/* Direita: data, sincronização, modo de visão, tema */}
      <div className="flex items-center gap-2">
        {activeCampaignId && (
          <span
            className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-line text-[13px] text-fg-muted"
            title="Data no calendário da campanha"
          >
            <Calendar className="w-4 h-4 text-fg-subtle" />
            <span className="tabular-nums">
              {calendar.currentDay} {currentMonth}, {calendar.currentYear}
            </span>
          </span>
        )}

        {activeCampaignId && (
          <span
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2 text-[13px] text-fg-muted"
            title={
              dbStatus?.connected
                ? `Sincronizado (${dbStatus.entityCount} entidades, ${dbStatus.sheetCount} fichas)`
                : 'Conectando ao servidor'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dbStatus?.connected ? 'bg-success' : 'bg-fg-subtle'
              }`}
              aria-hidden="true"
            />
            <span className="hidden xl:inline">
              {dbStatus?.connected ? 'Sincronizado' : 'Conectando'}
            </span>
          </span>
        )}

        {canDmActiveCamp && (
          <div className="segmented" role="group" aria-label="Visão">
            <button
              onClick={() => {
                setViewRole('gm');
                if (currentRoute === '/campaign/player-view') {
                  setCurrentRoute('/campaign/session');
                }
              }}
              aria-pressed={viewRole === 'gm'}
              className={`segmented-item ${viewRole === 'gm' ? 'segmented-item-active' : ''}`}
              title="Exibir controles e segredos do mestre"
            >
              Mestre
            </button>
            <button
              onClick={() => setViewRole('player')}
              aria-pressed={viewRole === 'player'}
              className={`segmented-item ${
                viewRole === 'player' ? 'segmented-item-active' : ''
              }`}
              title="Ver como os jogadores veem"
            >
              <span className="sm:hidden">Jogador</span>
              <span className="hidden sm:inline">Visão do jogador</span>
            </button>
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
      </div>
    </header>
  );
};
