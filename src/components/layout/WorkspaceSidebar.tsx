import React, { useState } from 'react';
import {
  useCampaignStore,
  WorldSubTab,
  PlotSubTab,
  PortalSubTab,
} from '../../store/useCampaignStore';
import {
  LayoutGrid,
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
  ChevronsUpDown,
  Check,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';

interface WorkspaceSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

type IconType = React.FC<{ className?: string }>;

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
  const logoutUser = useCampaignStore((s) => s.logoutUser);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
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
  const campaignName = activeCamp?.title || '';
  const isPlayerInActiveCamp = activeCamp?.isDm === false;
  const showDmStudio = Boolean(activeCamp && activeCamp.isDm !== false);
  const hasCampaign = Boolean(activeCampaignId);
  const showToast = useCampaignStore((s) => s.showToast);
  const isSessionCockpit =
    currentRoute === '/campaign/session' && activeModule === 'session';

  const requireCampaignOrRedirect = (): boolean => {
    if (hasCampaign) return true;
    setCurrentRoute('/campaigns');
    showToast('Crie ou selecione uma campanha primeiro.');
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

  const inStudio = (module: typeof activeModule) =>
    currentRoute === '/campaign/session' && activeModule === module;

  const renderSidebarContent = (isMobileDrawer = false) => {
    const isNarrow = collapsed && !isMobileDrawer;

    const navItem = (opts: {
      label: string;
      icon: IconType;
      active: boolean;
      onClick: () => void;
      title?: string;
      count?: number;
    }) => {
      const Icon = opts.icon;
      return (
        <button
          type="button"
          onClick={opts.onClick}
          title={isNarrow ? opts.label : opts.title}
          aria-current={opts.active ? 'page' : undefined}
          className={`w-full h-8 flex items-center gap-2.5 rounded-md text-sm transition-colors ${
            isNarrow ? 'justify-center px-0' : 'px-2.5'
          } ${
            opts.active
              ? 'bg-surface-2 text-fg font-medium'
              : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
          }`}
        >
          <Icon className={`w-4 h-4 shrink-0 ${opts.active ? 'text-fg' : 'text-fg-subtle'}`} />
          {!isNarrow && <span className="flex-1 text-left truncate">{opts.label}</span>}
          {!isNarrow && opts.count !== undefined && (
            <span className="text-xs tabular-nums text-fg-subtle">{opts.count}</span>
          )}
        </button>
      );
    };

    const groupLabel = (label: string) =>
      !isNarrow ? (
        <div className="px-2.5 pb-1 text-xs font-medium text-fg-subtle">{label}</div>
      ) : (
        <div className="mx-2 mb-1 border-t border-line" />
      );

    return (
      <div
        className={`h-full flex flex-col bg-surface border-r border-line select-none transition-[width] duration-150 ${
          isNarrow ? 'w-[60px]' : 'w-[248px]'
        }`}
      >
        {/* Marca e recolher */}
        <div
          className={`h-14 border-b border-line flex items-center gap-2 shrink-0 ${
            isNarrow ? 'justify-center px-2' : 'justify-between px-3'
          }`}
        >
          {!isNarrow && (
            <button
              onClick={() => {
                setCurrentRoute('/campaigns');
                onCloseMobile();
              }}
              className="flex items-center gap-2 min-w-0 text-left rounded-md px-1 py-1 hover:bg-surface-2"
              title="Codex"
            >
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
              <span className="text-sm font-semibold text-fg truncate">Codex</span>
            </button>
          )}

          {isMobileDrawer ? (
            <button
              onClick={onCloseMobile}
              className="btn btn-ghost btn-icon"
              aria-label="Fechar navegação"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="btn btn-ghost btn-icon"
              title={isNarrow ? 'Expandir barra lateral' : 'Recolher barra lateral'}
              aria-label={isNarrow ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            >
              {isNarrow ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Seletor de campanha */}
        {!isNarrow && (
          <div className="px-3 pt-3 relative">
            <button
              type="button"
              onClick={() => setCampaignMenuOpen(!campaignMenuOpen)}
              aria-expanded={campaignMenuOpen}
              aria-haspopup="listbox"
              className="w-full px-2.5 py-1.5 rounded-md border border-line bg-surface hover:bg-surface-2 hover:border-line-strong flex items-center justify-between gap-2 text-left transition-colors"
            >
              <div className="min-w-0">
                <span className="block text-xs text-fg-subtle">Campanha</span>
                <span className="block text-sm font-medium text-fg truncate">
                  {campaignName || 'Nenhuma selecionada'}
                </span>
              </div>
              <ChevronsUpDown className="w-4 h-4 text-fg-subtle shrink-0" />
            </button>

            {campaignMenuOpen && (
              <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg bg-surface border border-line shadow-elevated p-1 max-h-72 overflow-y-auto">
                {campaigns.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRoute('/campaigns');
                      setCampaignMenuOpen(false);
                      onCloseMobile();
                    }}
                    className="w-full h-8 px-2 rounded-md text-left text-sm text-fg-muted hover:bg-surface-2 hover:text-fg flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Criar ou entrar em campanha
                  </button>
                ) : (
                  campaigns.map((camp) => {
                    const selected = camp.id === activeCampaignId;
                    return (
                      <button
                        key={camp.id}
                        type="button"
                        onClick={() => {
                          selectCampaign(
                            camp.id,
                            camp.isDm === false
                              ? '/campaign/player-view'
                              : '/campaign/session'
                          );
                          setCampaignMenuOpen(false);
                          onCloseMobile();
                        }}
                        className={`w-full px-2 py-1.5 rounded-md text-left text-sm flex items-center gap-2 ${
                          selected
                            ? 'bg-surface-2 text-fg font-medium'
                            : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                        }`}
                      >
                        <span className="w-4 shrink-0">
                          {selected && <Check className="w-4 h-4 text-accent" />}
                        </span>
                        <span className="flex-1 truncate">{camp.title}</span>
                        <span className="text-xs text-fg-subtle shrink-0">
                          {camp.isDm === false ? 'Jogador' : 'Mestre'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Ação principal */}
        <div className={`py-3 ${isNarrow ? 'px-2' : 'px-3'}`}>
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
              title={isSessionCockpit ? 'Sair da sessão' : 'Conduzir sessão'}
              className={`btn w-full ${isNarrow ? 'px-0' : ''} ${
                isSessionCockpit
                  ? 'bg-accent-soft text-accent border border-accent/30 hover:bg-accent-soft'
                  : 'btn-primary'
              }`}
            >
              <Swords className="w-4 h-4 shrink-0" />
              {!isNarrow && (
                <span>{isSessionCockpit ? 'Sessão em andamento' : 'Conduzir sessão'}</span>
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
              title="Entrar na mesa"
              className={`btn btn-primary w-full ${isNarrow ? 'px-0' : ''}`}
            >
              <Eye className="w-4 h-4 shrink-0" />
              {!isNarrow && <span>Entrar na mesa</span>}
            </button>
          )}
        </div>

        {/* Navegação */}
        <nav
          className={`flex-1 overflow-y-auto pb-3 space-y-5 ${isNarrow ? 'px-2' : 'px-3'}`}
          aria-label="Navegação principal"
        >
          <div className="space-y-0.5">
            {groupLabel('Geral')}
            {navItem({
              label: 'Campanhas',
              icon: LayoutGrid,
              active: currentRoute === '/campaigns',
              onClick: () => {
                setCurrentRoute('/campaigns');
                onCloseMobile();
              },
            })}
            {hasCampaign &&
              navItem({
                label: 'Visão da mesa',
                icon: Eye,
                active: currentRoute === '/campaign/player-view',
                onClick: () => {
                  setCurrentRoute('/campaign/player-view');
                  setViewRole('player');
                  onCloseMobile();
                },
              })}
          </div>

          {showDmStudio && (
            <>
              <div className="space-y-0.5">
                {groupLabel('Mundo')}
                {navItem({
                  label: 'Códice',
                  icon: BookOpen,
                  active: inStudio('worldbuilding') && worldSubTab === 'wiki',
                  onClick: () => openWorldTab('wiki'),
                  count: entities.length,
                })}
                {navItem({
                  label: 'Relações',
                  icon: Network,
                  active: inStudio('worldbuilding') && worldSubTab === 'graph',
                  onClick: () => openWorldTab('graph'),
                })}
                {navItem({
                  label: 'Mapas',
                  icon: Map,
                  active: inStudio('worldbuilding') && worldSubTab === 'maps',
                  onClick: () => openWorldTab('maps'),
                  count: maps.length,
                })}
                {navItem({
                  label: 'Cronologia',
                  icon: Calendar,
                  active: inStudio('worldbuilding') && worldSubTab === 'timeline',
                  onClick: () => openWorldTab('timeline'),
                })}
              </div>

              <div className="space-y-0.5">
                {groupLabel('Narrativa')}
                {navItem({
                  label: 'Frentes e relógios',
                  icon: Flame,
                  active: inStudio('plots') && plotSubTab === 'fronts',
                  onClick: () => openPlotTab('fronts'),
                  count: fronts.length,
                })}
                {navItem({
                  label: 'Cenas e pistas',
                  icon: GitBranch,
                  active: inStudio('plots') && plotSubTab === 'flowchart',
                  onClick: () => openPlotTab('flowchart'),
                })}
                {navItem({
                  label: 'Oráculo',
                  icon: Compass,
                  active: inStudio('plots') && plotSubTab === 'generators',
                  onClick: () => openPlotTab('generators'),
                })}
              </div>

              <div className="space-y-0.5">
                {groupLabel('Grupo')}
                {navItem({
                  label: 'Segredos',
                  icon: Lock,
                  active: inStudio('portal') && portalSubTab === 'secrets',
                  onClick: () => openPortalTab('secrets'),
                })}
                {navItem({
                  label: 'Missões',
                  icon: ScrollText,
                  active: inStudio('portal') && portalSubTab === 'quests',
                  onClick: () => openPortalTab('quests'),
                  count: quests.length,
                })}
                {navItem({
                  label: 'Diário e espólio',
                  icon: BookMarked,
                  active: inStudio('portal') && portalSubTab === 'journal',
                  onClick: () => openPortalTab('journal'),
                })}
              </div>
            </>
          )}
        </nav>

        {/* Utilidades e usuário */}
        <div className={`border-t border-line py-2 space-y-0.5 shrink-0 ${isNarrow ? 'px-2' : 'px-3'}`}>
          {showDmStudio &&
            navItem({
              label: 'Fichas do grupo',
              icon: Users,
              active: false,
              onClick: () => {
                setIsDmPartyDrawerOpen(true);
                onCloseMobile();
              },
              count: characterSheets.length,
            })}
          {navItem({
            label: 'Configurações',
            icon: Settings,
            active: false,
            onClick: () => {
              setIsSettingsModalOpen(true);
              onCloseMobile();
            },
          })}
        </div>

        <div
          className={`h-14 border-t border-line flex items-center gap-2 shrink-0 ${
            isNarrow ? 'justify-center px-2' : 'justify-between px-3'
          }`}
        >
          {!isNarrow && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-xs font-semibold text-fg-muted shrink-0">
                {(currentUser?.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-fg truncate">
                  {currentUser?.name || 'Usuário'}
                </div>
                <div className="text-xs text-fg-subtle truncate">
                  {activeCamp ? (isPlayerInActiveCamp ? 'Jogador' : 'Mestre') : currentUser?.email || ''}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={logoutUser}
            className="btn btn-ghost btn-icon shrink-0"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Barra lateral (desktop) */}
      <aside className="hidden md:block h-full shrink-0">
        {renderSidebarContent(false)}
      </aside>

      {/* Gaveta (mobile) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={onCloseMobile} />
          <div className="relative z-10 h-full shadow-elevated">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
