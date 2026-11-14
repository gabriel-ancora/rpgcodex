import React, { useState } from 'react';
import {
  useCampaignStore,
  WorldSubTab,
  PlotSubTab,
  PortalSubTab,
} from '../../store/useCampaignStore';
import {
  LayoutGrid,
  UserCheck,
  Eye,
  BookOpen,
  Network,
  Map,
  Calendar,
  Flame,
  GitBranch,
  Compass,
  Lock,
  ScrollText,
  BookMarked,
  Swords,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';

interface WorkspaceSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  mobileOpen,
  onCloseMobile,
}) => {
  const currentRoute = useCampaignStore((s) => s.currentRoute);
  const setCurrentRoute = useCampaignStore((s) => s.setCurrentRoute);
  const activeModule = useCampaignStore((s) => s.activeModule);
  const setActiveModule = useCampaignStore((s) => s.setActiveModule);
  const worldSubTab = useCampaignStore((s) => s.worldSubTab);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);
  const plotSubTab = useCampaignStore((s) => s.plotSubTab);
  const setPlotSubTab = useCampaignStore((s) => s.setPlotSubTab);
  const portalSubTab = useCampaignStore((s) => s.portalSubTab);
  const setPortalSubTab = useCampaignStore((s) => s.setPortalSubTab);
  const setViewRole = useCampaignStore((s) => s.setViewRole);

  const currentUser = useCampaignStore((s) => s.currentUser);
  const workspaceMode = useCampaignStore((s) => s.workspaceMode);
  const logoutUser = useCampaignStore((s) => s.logoutUser);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const campaignName = useCampaignStore((s) => s.campaignName);
  const selectCampaign = useCampaignStore((s) => s.selectCampaign);

  const entities = useCampaignStore((s) => s.entities);
  const maps = useCampaignStore((s) => s.maps);
  const fronts = useCampaignStore((s) => s.fronts);
  const quests = useCampaignStore((s) => s.quests);
  const characterSheets = useCampaignStore((s) => s.characterSheets);

  const setIsDmPartyDrawerOpen = useCampaignStore((s) => s.setIsDmPartyDrawerOpen);
  const setIsSettingsModalOpen = useCampaignStore((s) => s.setIsSettingsModalOpen);

  const [collapsed, setCollapsed] = useState(false);
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false);

  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);
  const isPlayerInActiveCamp = activeCamp?.isDm === false;
  const isPlayerMode = workspaceMode === 'player';
  const showDmStudio = !isPlayerMode && !isPlayerInActiveCamp;
  const hasCampaign = Boolean(activeCampaignId);
  const showToast = useCampaignStore((s) => s.showToast);
  const isSessionCockpit =
    currentRoute === '/campaign/session' && activeModule === 'session';

  const requireCampaignOrRedirect = (): boolean => {
    if (hasCampaign) return true;
    setCurrentRoute(isPlayerMode ? '/player-dashboard' : '/dm-dashboard');
    showToast(
      isPlayerMode
        ? 'Ingresse em uma campanha pelo código de convite primeiro.'
        : 'Crie ou selecione uma campanha para abrir o estúdio.'
    );
    onCloseMobile();
    return false;
  };

  const openWorldTab = (tab: WorldSubTab) => {
    if (!requireCampaignOrRedirect()) return;
    setCurrentRoute('/campaign/session');
    setActiveModule('worldbuilding');
    setWorldSubTab(tab);
    onCloseMobile();
  };

  const openPlotTab = (tab: PlotSubTab) => {
    if (!requireCampaignOrRedirect()) return;
    setCurrentRoute('/campaign/session');
    setActiveModule('plots');
    setPlotSubTab(tab);
    onCloseMobile();
  };

  const openPortalTab = (tab: PortalSubTab) => {
    if (!requireCampaignOrRedirect()) return;
    setCurrentRoute('/campaign/session');
    setActiveModule('portal');
    setPortalSubTab(tab);
    onCloseMobile();
  };

  const navItemClass = (active: boolean) =>
    `w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${
      active
        ? 'bg-white/[0.08] text-zinc-100 font-medium'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
    }`;

  const renderSidebarContent = (isMobileDrawer = false) => {
    const isNarrow = collapsed && !isMobileDrawer;

    return (
      <div
        className={`h-full flex flex-col bg-[#0e0e11] border-r border-white/[0.06] select-none transition-all duration-200 ${
          isNarrow ? 'w-[60px]' : 'w-[236px]'
        }`}
      >
        {/* Top Brand & Collapse Toggle */}
        <div className="h-12 px-3 border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => {
              setCurrentRoute(isPlayerMode ? '/player-dashboard' : '/dm-dashboard');
              onCloseMobile();
            }}
            className="flex items-center gap-2.5 min-w-0 text-left group"
            title="Obsidian Codex"
          >
            {/* Geometric Faceted Codex Emblem */}
            <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
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
            {!isNarrow && (
              <span className="text-[13px] font-semibold tracking-tight text-zinc-100 truncate">
                Obsidian Codex
              </span>
            )}
          </button>

          {isMobileDrawer ? (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
              title={isNarrow ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            >
              {isNarrow ? (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftClose className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Active Campaign Switcher */}
        {!isNarrow && (
          <div className="px-2.5 pt-2 pb-1 relative">
            <button
              type="button"
              onClick={() => setCampaignMenuOpen(!campaignMenuOpen)}
              className="w-full px-2.5 py-2 rounded-lg bg-[#141418] hover:bg-[#19191f] border border-white/[0.06] flex items-center justify-between gap-2 text-left transition-colors"
            >
              <div className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                  Campanha ativa
                </span>
                <span className="block text-xs font-medium text-zinc-200 truncate mt-0.5">
                  {campaignName || 'Nenhuma selecionada'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            </button>

            {campaignMenuOpen && (
              <div className="absolute left-2.5 right-2.5 top-full mt-1 z-50 rounded-xl bg-[#18181d] border border-white/[0.1] shadow-elevated p-1 space-y-0.5">
                {campaigns.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRoute(isPlayerMode ? '/player-dashboard' : '/dm-dashboard');
                      setCampaignMenuOpen(false);
                      onCloseMobile();
                    }}
                    className="w-full px-2.5 py-2 rounded-lg text-left text-xs text-zinc-300 hover:bg-white/[0.05]"
                  >
                    {isPlayerMode ? '+ Ingressar com código' : '+ Criar nova campanha'}
                  </button>
                ) : (
                  campaigns.map((camp) => (
                    <button
                      key={camp.id}
                      type="button"
                      onClick={() => {
                        selectCampaign(
                          camp.id,
                          camp.isDm === false || isPlayerMode
                            ? '/campaign/player-view'
                            : '/campaign/session'
                        );
                        setCampaignMenuOpen(false);
                        onCloseMobile();
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 ${
                        camp.id === activeCampaignId
                          ? 'bg-white/[0.08] text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                      }`}
                    >
                      <span className="truncate">{camp.title}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400">
                          {camp.isDm === false ? 'Jogando' : 'Mestre'}
                        </span>
                        {camp.id === activeCampaignId && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Primary Live Session Action */}
        <div className="px-2.5 py-2">
          {showDmStudio ? (
            <button
              onClick={() => {
                if (!requireCampaignOrRedirect()) return;
                if (isSessionCockpit) {
                  setActiveModule('worldbuilding');
                } else {
                  setCurrentRoute('/campaign/session');
                  setActiveModule('session');
                }
                onCloseMobile();
              }}
              title="Conduzir Sessão ao Vivo"
              className={`w-full flex items-center ${
                isNarrow ? 'justify-center px-0' : 'justify-between px-3'
              } py-2 rounded-lg text-xs font-semibold transition-all ${
                isSessionCockpit
                  ? 'bg-rose-500/15 text-rose-200 border border-rose-500/35'
                  : 'bg-zinc-100 hover:bg-white text-zinc-950'
              }`}
            >
              <span className="flex items-center gap-2">
                <Swords className="w-3.5 h-3.5 shrink-0" />
                {!isNarrow && (
                  <span>{isSessionCockpit ? 'Mesa em andamento' : 'Conduzir sessão'}</span>
                )}
              </span>
              {!isNarrow && isSessionCockpit && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                if (!requireCampaignOrRedirect()) return;
                setCurrentRoute('/campaign/player-view');
                setViewRole('player');
                onCloseMobile();
              }}
              title="Abrir Mesa ao Vivo"
              className={`w-full flex items-center ${
                isNarrow ? 'justify-center px-0' : 'justify-between px-3'
              } py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-all`}
            >
              <span className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 shrink-0" />
                {!isNarrow && <span>Entrar na mesa</span>}
              </span>
            </button>
          )}
        </div>

        {/* Scrollable Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-4">
          {/* Painéis */}
          <div className="space-y-0.5">
            {!isNarrow && (
              <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Painéis
              </div>
            )}
            {!isPlayerMode && (
              <button
                onClick={() => {
                  setCurrentRoute('/dm-dashboard');
                  onCloseMobile();
                }}
                className={navItemClass(currentRoute === '/dm-dashboard')}
                title="Campanhas que Mestro"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <LayoutGrid className="w-4 h-4 shrink-0 opacity-80" />
                  {!isNarrow && <span>Campanhas</span>}
                </span>
              </button>
            )}

            {isPlayerMode ? (
              <>
                <button
                  onClick={() => {
                    setCurrentRoute('/player-dashboard');
                    onCloseMobile();
                  }}
                  className={navItemClass(currentRoute === '/player-dashboard')}
                  title="Personagens"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <UserCheck className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Personagens</span>}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setCurrentRoute('/campaign/player-view');
                    setViewRole('player');
                    onCloseMobile();
                  }}
                  className={navItemClass(currentRoute === '/campaign/player-view')}
                  title="Visão da Mesa"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Eye className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Visão da mesa</span>}
                  </span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (!requireCampaignOrRedirect()) return;
                  setIsDmPartyDrawerOpen(true);
                  onCloseMobile();
                }}
                className={navItemClass(false)}
                title="Ver todas as fichas dos jogadores desta campanha"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <UserCheck className="w-4 h-4 shrink-0 opacity-80" />
                  {!isNarrow && <span>Personagens</span>}
                </span>
                {!isNarrow && (
                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                    {characterSheets.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Estúdio do Mestre */}
          {showDmStudio && (
            <>
              <div className="space-y-0.5">
                {!isNarrow && (
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Mundo & Códice
                  </div>
                )}
                <button
                  onClick={() => openWorldTab('wiki')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'worldbuilding' &&
                      worldSubTab === 'wiki'
                  )}
                  title="Códice & Wiki"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <BookOpen className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Códice & Wiki</span>}
                  </span>
                  {!isNarrow && (
                    <span className="text-[11px] font-mono text-zinc-500">
                      {entities.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => openWorldTab('graph')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'worldbuilding' &&
                      worldSubTab === 'graph'
                  )}
                  title="Relações"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Network className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Grafo de relações</span>}
                  </span>
                </button>

                <button
                  onClick={() => openWorldTab('maps')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'worldbuilding' &&
                      worldSubTab === 'maps'
                  )}
                  title="Cartografia"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Map className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Cartografia</span>}
                  </span>
                  {!isNarrow && (
                    <span className="text-[11px] font-mono text-zinc-500">
                      {maps.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => openWorldTab('timeline')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'worldbuilding' &&
                      worldSubTab === 'timeline'
                  )}
                  title="Cronologia & Calendário"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Calendar className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Cronologia</span>}
                  </span>
                </button>
              </div>

              <div className="space-y-0.5">
                {!isNarrow && (
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Narrativa
                  </div>
                )}
                <button
                  onClick={() => openPlotTab('fronts')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'plots' &&
                      plotSubTab === 'fronts'
                  )}
                  title="Frentes de Ameaça"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Flame className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Frentes & relógios</span>}
                  </span>
                  {!isNarrow && (
                    <span className="text-[11px] font-mono text-zinc-500">
                      {fronts.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => openPlotTab('flowchart')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'plots' &&
                      plotSubTab === 'flowchart'
                  )}
                  title="Investigação & Pistas"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <GitBranch className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Cenas & pistas</span>}
                  </span>
                </button>

                <button
                  onClick={() => openPlotTab('generators')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'plots' &&
                      plotSubTab === 'generators'
                  )}
                  title="Oráculo Contextual"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Compass className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Oráculo contextual</span>}
                  </span>
                </button>
              </div>

              <div className="space-y-0.5">
                {!isNarrow && (
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Grupo & Portal
                  </div>
                )}
                <button
                  onClick={() => openPortalTab('secrets')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'portal' &&
                      portalSubTab === 'secrets'
                  )}
                  title="Segredos & Névoa"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Lock className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Segredos & névoa</span>}
                  </span>
                </button>

                <button
                  onClick={() => openPortalTab('quests')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'portal' &&
                      portalSubTab === 'quests'
                  )}
                  title="Missões"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <ScrollText className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Missões</span>}
                  </span>
                  {!isNarrow && (
                    <span className="text-[11px] font-mono text-zinc-500">
                      {quests.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => openPortalTab('journal')}
                  className={navItemClass(
                    currentRoute === '/campaign/session' &&
                      activeModule === 'portal' &&
                      portalSubTab === 'journal'
                  )}
                  title="Crônicas & Espólio"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <BookMarked className="w-4 h-4 shrink-0 opacity-80" />
                    {!isNarrow && <span>Crônicas & espólio</span>}
                  </span>
                </button>
              </div>
            </>
          )}
        </nav>

        {/* Bottom Utilities & User Profile */}
        <div className="p-2.5 border-t border-white/[0.06] space-y-1 shrink-0">
          {showDmStudio && (
            <button
              onClick={() => {
                setIsDmPartyDrawerOpen(true);
                onCloseMobile();
              }}
              className={navItemClass(false)}
              title="Fichas D&D 5e do Grupo"
            >
              <span className="flex items-center gap-2.5 truncate">
                <Users className="w-4 h-4 shrink-0 opacity-80" />
                {!isNarrow && <span>Fichas do grupo</span>}
              </span>
              {!isNarrow && (
                <span className="text-[11px] font-mono text-zinc-500">
                  {characterSheets.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => {
              setIsSettingsModalOpen(true);
              onCloseMobile();
            }}
            className={navItemClass(false)}
            title="Configurações, IA & Backups"
          >
            <span className="flex items-center gap-2.5 truncate">
              <Settings className="w-4 h-4 shrink-0 opacity-80" />
              {!isNarrow && <span>Configurações</span>}
            </span>
          </button>

          {/* User Footer */}
          <div
            className={`pt-2 mt-1 border-t border-white/[0.06] flex items-center ${
              isNarrow ? 'justify-center' : 'justify-between'
            } gap-2 px-1`}
          >
            {!isNarrow && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-[10px] font-semibold text-zinc-300 shrink-0">
                  {(currentUser?.name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate">
                    {currentUser?.name || 'Usuário'}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {isPlayerMode ? 'Modo Jogador' : 'Modo Mestre'}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={logoutUser}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block h-full shrink-0">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
