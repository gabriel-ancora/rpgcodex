import React, { useEffect, useState } from 'react';
import { useCampaignStore } from './store/useCampaignStore';
import { AppRoute } from './types/campaign';
import { WorkspaceSidebar } from './components/layout/WorkspaceSidebar';
import { TopCommandBar } from './components/layout/TopCommandBar';
import { WorldbuildingModule } from './components/worldbuilding/WorldbuildingModule';
import { PlotsModule } from './components/plots/PlotsModule';
import { SessionCockpitModule } from './components/session/SessionCockpitModule';
import { PlayerPortalModule } from './components/portal/PlayerPortalModule';
import { DedicatedPlayerView } from './components/portal/DedicatedPlayerView';
import { LoginView } from './components/auth/LoginView';
import { DmDashboardView } from './components/hubs/DmDashboardView';
import { PlayerDashboardView } from './components/hubs/PlayerDashboardView';
import { DmPartyInspectDrawer } from './components/characters/DmPartyInspectDrawer';
import { SettingsModal } from './components/common/SettingsModal';
import { MentionText } from './components/common/MentionText';
import { ConvexSyncBridge } from './components/common/ConvexSyncBridge';
import { X, Pin, ArrowUpRight } from 'lucide-react';

const VALID_ROUTES: AppRoute[] = [
  '/login',
  '/dm-dashboard',
  '/player-dashboard',
  '/campaign/session',
  '/campaign/player-view',
];

export function App() {
  const currentUser = useCampaignStore((s) => s.currentUser);
  const currentRoute = useCampaignStore((s) => s.currentRoute);
  const setCurrentRoute = useCampaignStore((s) => s.setCurrentRoute);
  const workspaceMode = useCampaignStore((s) => s.workspaceMode);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const joinCampaignByInviteCode = useCampaignStore(
    (s) => s.joinCampaignByInviteCode
  );
  const activeModule = useCampaignStore((s) => s.activeModule);
  const setActiveModule = useCampaignStore((s) => s.setActiveModule);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);
  const setSelectedEntityId = useCampaignStore((s) => s.setSelectedEntityId);
  const quickInspectEntityId = useCampaignStore((s) => s.quickInspectEntityId);
  const setQuickInspectEntityId = useCampaignStore(
    (s) => s.setQuickInspectEntityId
  );
  const entities = useCampaignStore((s) => s.entities);
  const togglePinEntity = useCampaignStore((s) => s.togglePinEntity);
  const toastMessage = useCampaignStore((s) => s.toastMessage);

  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(
    null
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sincronização de URL inicial, botão Voltar/Avançar (popstate) e ?invite=CODE
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteParam = params.get('invite');
      if (inviteParam && inviteParam.trim()) {
        const code = inviteParam.trim().toUpperCase();
        if (useCampaignStore.getState().currentUser) {
          joinCampaignByInviteCode(code);
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          setPendingInviteCode(code);
        }
      }

      const path = window.location.pathname as AppRoute;
      if (VALID_ROUTES.includes(path) && useCampaignStore.getState().currentUser) {
        useCampaignStore.setState({ currentRoute: path });
      }
    } catch {
      // ignore in restricted environments
    }

    const handlePopState = () => {
      const path = window.location.pathname as AppRoute;
      if (VALID_ROUTES.includes(path)) {
        useCampaignStore.setState({ currentRoute: path });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [joinCampaignByInviteCode]);

  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);
  const isPlayerInActiveCamp = activeCamp?.isDm === false;

  // Proteção por campanha: se o usuário participa da campanha ativa apenas como Jogador, redireciona /campaign/session para /campaign/player-view
  useEffect(() => {
    if (!currentUser) return;
    if (currentRoute === '/campaign/session' && isPlayerInActiveCamp) {
      setCurrentRoute('/campaign/player-view');
    }
  }, [currentUser, currentRoute, isPlayerInActiveCamp, setCurrentRoute]);

  const handleAfterAuth = async () => {
    if (pendingInviteCode) {
      const code = pendingInviteCode;
      setPendingInviteCode(null);
      await joinCampaignByInviteCode(code);
      try {
        window.history.replaceState(
          {},
          '',
          useCampaignStore.getState().currentRoute
        );
      } catch {
        // ignore
      }
    }
  };

  const isPlayerMode = workspaceMode === 'player';
  const isAuthenticated = Boolean(currentUser) && currentRoute !== '/login';
  const quickEntity = entities.find((e) => e.id === quickInspectEntityId);

  return (
    <div className="min-h-screen h-screen flex bg-[#0b0b0d] text-zinc-100 overflow-hidden">
      <ConvexSyncBridge />

      {isAuthenticated && (
        <WorkspaceSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {isAuthenticated && (
          <TopCommandBar
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          />
        )}

        {/* Main Route & Workspace Container */}
        {!isAuthenticated && (
          <LoginView
            pendingInviteCode={pendingInviteCode}
            onAuthenticated={handleAfterAuth}
          />
        )}

        {isAuthenticated && currentRoute === '/dm-dashboard' && (
          <main className="flex-1 overflow-y-auto bg-[#0b0b0d]">
            <DmDashboardView />
          </main>
        )}

        {isAuthenticated && currentRoute === '/player-dashboard' && (
          <main className="flex-1 overflow-y-auto bg-[#0b0b0d]">
            <PlayerDashboardView />
          </main>
        )}

        {isAuthenticated && currentRoute === '/campaign/player-view' && (
          <main className="flex-1 overflow-hidden bg-[#0b0b0d]">
            {activeCampaignId ? (
              <DedicatedPlayerView />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md rounded-xl bg-[#131317] border border-white/[0.08] p-8 space-y-4">
                  <h2 className="font-serif text-xl text-zinc-100">
                    Nenhuma campanha selecionada
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isPlayerMode
                      ? 'Ingresse em uma campanha utilizando o código de convite fornecido pelo Mestre para visualizar a mesa em tempo real.'
                      : 'Crie ou selecione uma campanha no painel do Mestre antes de abrir a visão de mesa.'}
                  </p>
                  <button
                    onClick={() =>
                      setCurrentRoute(isPlayerMode ? '/player-dashboard' : '/dm-dashboard')
                    }
                    className="btn-solid px-4 py-2 rounded-lg text-xs"
                  >
                    {isPlayerMode ? 'Ir para meus personagens' : 'Ir para minhas campanhas'}
                  </button>
                </div>
              </div>
            )}
          </main>
        )}

        {isAuthenticated && currentRoute === '/campaign/session' && !isPlayerInActiveCamp && (
          <main className="flex-1 p-3.5 lg:p-5 overflow-hidden bg-[#0b0b0d]">
            {!activeCampaignId || !activeCamp ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md rounded-xl bg-[#131317] border border-white/[0.08] p-8 space-y-4">
                  <h2 className="font-serif text-xl text-zinc-100">
                    Crie sua primeira campanha
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Para utilizar o Códice, Cartografia, Frentes de Ameaça e o Cockpit de Sessão, selecione ou crie uma campanha no Painel do Mestre.
                  </p>
                  <button
                    onClick={() => setCurrentRoute('/dm-dashboard')}
                    className="btn-solid px-4 py-2 rounded-lg text-xs"
                  >
                    Abrir painel de campanhas
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeModule === 'worldbuilding' && <WorldbuildingModule />}
                {activeModule === 'plots' && <PlotsModule />}
                {activeModule === 'session' && <SessionCockpitModule />}
                {activeModule === 'portal' && <PlayerPortalModule />}
              </>
            )}
          </main>
        )}
      </div>

      {/* Global Modals & Drawers */}
      <DmPartyInspectDrawer />
      <SettingsModal />

      {/* Quick Inspect Popover when clicking @Mention */}
      {quickEntity && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#131317] border border-white/[0.1] p-5 space-y-4 shadow-elevated">
            <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {quickEntity.mentionPrefix}
                  {quickEntity.handle}
                </span>
                <h3 className="text-lg font-semibold text-zinc-100 mt-0.5">
                  {quickEntity.name}
                </h3>
                <p className="text-xs text-zinc-400">{quickEntity.subtitle}</p>
              </div>
              <button
                onClick={() => setQuickInspectEntityId(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickEntity.attributes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {quickEntity.attributes.map((a) => (
                  <span
                    key={a.id}
                    className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs font-mono text-zinc-300"
                  >
                    <span className="text-zinc-500">{a.label}:</span> {a.value}
                  </span>
                ))}
              </div>
            )}

            <div className="p-3.5 rounded-lg bg-[#0e0e11] border border-white/[0.06] text-xs">
              <MentionText text={quickEntity.publicContent} />
            </div>

            {!isPlayerInActiveCamp && !isPlayerMode && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => {
                    togglePinEntity(quickEntity.id);
                    setQuickInspectEntityId(null);
                  }}
                  className="btn-subtle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>
                    {quickEntity.pinnedInSession
                      ? 'Desafixar da sessão'
                      : 'Fixar na sessão'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setSelectedEntityId(quickEntity.id);
                    setQuickInspectEntityId(null);
                    setCurrentRoute('/campaign/session');
                    setActiveModule('worldbuilding');
                    setWorldSubTab('wiki');
                  }}
                  className="btn-solid inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs"
                >
                  <span>Abrir no códice</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimal Studio Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-lg bg-[#18181d] border border-white/[0.1] text-xs font-medium text-zinc-200 shadow-elevated flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
export default App;
