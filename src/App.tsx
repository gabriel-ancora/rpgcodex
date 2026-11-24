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
import { CampaignsHome } from './components/hubs/CampaignsHome';
import { DmPartyInspectDrawer } from './components/characters/DmPartyInspectDrawer';
import { SettingsModal } from './components/common/SettingsModal';
import { MentionText } from './components/common/MentionText';
import { ConvexSyncBridge } from './components/common/ConvexSyncBridge';
import { ConfirmProvider } from './components/common/Modal';
import { Toaster } from './components/common/Toast';
import { X, Pin, ArrowUpRight } from 'lucide-react';

const VALID_ROUTES: AppRoute[] = [
  '/login',
  '/campaigns',
  '/campaign/session',
  '/campaign/player-view',
];

export function App() {
  const currentUser = useCampaignStore((s) => s.currentUser);
  const currentRoute = useCampaignStore((s) => s.currentRoute);
  const setCurrentRoute = useCampaignStore((s) => s.setCurrentRoute);
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

  const isAuthenticated = Boolean(currentUser) && currentRoute !== '/login';
  const showDmChrome = isAuthenticated && currentRoute === '/campaign/session' && !isPlayerInActiveCamp;
  const quickEntity = entities.find((e) => e.id === quickInspectEntityId);

  return (
    <ConfirmProvider>
    <div className="min-h-screen h-screen flex bg-canvas text-fg overflow-hidden">
      <ConvexSyncBridge />

      {showDmChrome && (
        <WorkspaceSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {showDmChrome && (
          <TopCommandBar
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          />
        )}

        {!isAuthenticated && (
          <LoginView
            pendingInviteCode={pendingInviteCode}
            onAuthenticated={handleAfterAuth}
          />
        )}

        {isAuthenticated && currentRoute === '/campaigns' && (
          <main className="flex-1 overflow-y-auto bg-canvas">
            <CampaignsHome />
          </main>
        )}

        {isAuthenticated && currentRoute === '/campaign/player-view' && (
          <main className="flex-1 overflow-hidden bg-canvas">
            {activeCampaignId ? (
              <DedicatedPlayerView />
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                <div className="card max-w-md w-full p-8 text-center">
                  <h2 className="section-title">Nenhuma campanha selecionada</h2>
                  <p className="mt-1.5 text-sm text-fg-muted">
                    Crie ou selecione uma campanha antes de abrir a visão da mesa.
                  </p>
                  <button
                    onClick={() => setCurrentRoute('/campaigns')}
                    className="btn btn-primary mt-5"
                  >
                    Ver campanhas
                  </button>
                </div>
              </div>
            )}
          </main>
        )}

        {isAuthenticated && currentRoute === '/campaign/session' && !isPlayerInActiveCamp && (
          <main className="flex-1 p-4 lg:p-6 overflow-hidden bg-canvas">
            {!activeCampaignId || !activeCamp ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="card max-w-md w-full p-8 text-center">
                  <h2 className="section-title">Nenhuma campanha selecionada</h2>
                  <p className="mt-1.5 text-sm text-fg-muted">
                    Crie ou selecione uma campanha para acessar o códice, mapas e sessões.
                  </p>
                  <button
                    onClick={() => setCurrentRoute('/campaigns')}
                    className="btn btn-primary mt-5"
                  >
                    Ver campanhas
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

      {/* Modais e gavetas globais */}
      <DmPartyInspectDrawer />
      <SettingsModal />

      {/* Inspeção rápida ao clicar em uma @menção */}
      {quickEntity && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-inspect-title"
        >
          <div className="modal max-w-lg">
            <div className="px-5 py-4 border-b border-line flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 id="quick-inspect-title" className="section-title truncate">
                  {quickEntity.name}
                </h3>
                <p className="text-[13px] text-fg-muted mt-0.5">
                  {quickEntity.subtitle}
                </p>
                <span className="block text-xs font-mono text-fg-subtle mt-1">
                  {quickEntity.mentionPrefix}
                  {quickEntity.handle}
                </span>
              </div>
              <button
                onClick={() => setQuickInspectEntityId(null)}
                className="btn btn-ghost btn-icon shrink-0"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              {quickEntity.attributes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickEntity.attributes.map((a) => (
                    <span key={a.id} className="badge">
                      <span className="text-fg-subtle">{a.label}:</span>
                      <span className="text-fg">{a.value}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="text-sm">
                <MentionText text={quickEntity.publicContent} />
              </div>
            </div>

            {!isPlayerInActiveCamp && (
              <div className="px-5 py-3 border-t border-line bg-surface-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    togglePinEntity(quickEntity.id);
                    setQuickInspectEntityId(null);
                  }}
                  className="btn btn-secondary"
                >
                  <Pin className="w-4 h-4" />
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
                  className="btn btn-primary"
                >
                  <span>Abrir no códice</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notificação */}
      <Toaster />
    </div>
    </ConfirmProvider>
  );
}
export default App;
