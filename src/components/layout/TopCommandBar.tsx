import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCampaignStore } from '../../store/useCampaignStore';
import { Menu, Calendar } from 'lucide-react';

interface TopCommandBarProps {
  onOpenMobileSidebar?: () => void;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  onOpenMobileSidebar,
}) => {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const campaignName = useCampaignStore((s) => s.campaignName);
  const currentRoute = useCampaignStore((s) => s.currentRoute);
  const workspaceMode = useCampaignStore((s) => s.workspaceMode);
  const activeModule = useCampaignStore((s) => s.activeModule);
  const worldSubTab = useCampaignStore((s) => s.worldSubTab);
  const plotSubTab = useCampaignStore((s) => s.plotSubTab);
  const portalSubTab = useCampaignStore((s) => s.portalSubTab);
  const calendar = useCampaignStore((s) => s.calendar);

  const dbStatus = useQuery(
    api.campaign.getStatus,
    activeCampaignId ? { campaignId: activeCampaignId } : 'skip'
  );

  const currentMonth =
    calendar.months[calendar.currentMonthIndex]?.name ||
    calendar.months[0]?.name ||
    'Mês 1';

  const getSectionTitle = (): string => {
    if (currentRoute === '/dm-dashboard') return 'Campanhas';
    if (currentRoute === '/player-dashboard') return 'Personagens';
    if (currentRoute === '/campaign/player-view') return 'Visão da Mesa';
    if (activeModule === 'session') return 'Mesa ao Vivo';
    if (activeModule === 'worldbuilding') {
      if (worldSubTab === 'wiki') return 'Códice & Wiki';
      if (worldSubTab === 'graph') return 'Grafo de Relações';
      if (worldSubTab === 'maps') return 'Cartografia';
      return 'Cronologia & Calendário';
    }
    if (activeModule === 'plots') {
      if (plotSubTab === 'fronts') return 'Frentes & Relógios';
      if (plotSubTab === 'flowchart') return 'Cenas & Pistas';
      return 'Oráculo Contextual';
    }
    if (portalSubTab === 'secrets') return 'Segredos & Névoa';
    if (portalSubTab === 'quests') return 'Missões';
    return 'Crônicas & Espólio';
  };

  return (
    <header className="h-12 px-4 bg-[#0b0b0d]/90 border-b border-white/[0.06] flex items-center justify-between gap-3 z-30 backdrop-blur-md shrink-0">
      {/* Left: Mobile Trigger + Clean Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-1.5 -ml-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]"
            aria-label="Abrir navegação"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="text-zinc-500 truncate max-w-[180px] sm:max-w-[260px]">
            {campaignName || 'Obsidian Codex'}
          </span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-100 font-medium truncate">
            {getSectionTitle()}
          </span>
        </div>
      </div>

      {/* Right: Calendar, Sync Status & DM/Player Preview Segmented Control */}
      <div className="flex items-center gap-2.5">
        {/* In-Game Date */}
        {activeCampaignId && (
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-zinc-400">
            <Calendar className="w-3 h-3 text-zinc-500" />
            <span>
              {calendar.currentDay} {currentMonth}, {calendar.currentYear}
            </span>
          </span>
        )}

        {/* Sync Indicator */}
        {activeCampaignId && (
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-zinc-500 px-2 py-1"
            title={
              dbStatus?.connected
                ? `Sincronizado na nuvem (${dbStatus.entityCount} entidades, ${dbStatus.sheetCount} fichas)`
                : 'Sincronizando com a nuvem...'
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dbStatus?.connected ? 'bg-emerald-400' : 'bg-zinc-500'
              }`}
            />
            <span className="hidden xl:inline">
              {dbStatus?.connected ? 'Sincronizado' : 'Conectando'}
            </span>
          </span>
        )}

        {/* Locked Session Role Badge */}
        <span
          className={`px-2.5 py-1 rounded-lg bg-[#141418] border border-white/[0.07] text-[11px] font-medium ${
            workspaceMode === 'player' ? 'text-emerald-300/90' : 'text-amber-300/90'
          }`}
          title="Modo definido no login. Para alterar, encerre a sessão e entre novamente."
        >
          {workspaceMode === 'player' ? 'Modo Jogador' : 'Modo Mestre'}
        </span>
      </div>
    </header>
  );
};
