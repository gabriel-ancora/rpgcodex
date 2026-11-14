import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import {
  ActiveModule,
  ViewRole,
  Entity,
  EntityCategory,
  RelationshipEdge,
  GraphNodePosition,
  ManualGraphNode,
  CampaignMap,
  MapPin,
  MapDrawingShape,
  CalendarConfig,
  TimelineEvent,
  ThreatFront,
  MysterySceneNode,
  Combatant,
  DiceRollLog,
  Quest,
  SessionJournalEntry,
  PersonalJournalNote,
  PartyResources,
  ScratchpadLine,
  GeneratedEmergencyItem,
  AppRoute,
  AuthUser,
  CampaignSummary,
  CharacterSheet,
} from '../types/campaign';
import { convexClient } from '../convexClient';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ObsidianCodexBackupPayload } from '../utils/campaignBackup';

// Higieniza chaves de armazenamento legadas de versões anteriores
try {
  localStorage.removeItem('obsidian-codex-storage-v4');
  localStorage.removeItem('obsidian-codex-storage-v3');
  localStorage.removeItem('obsidian-codex-storage-v2');
  localStorage.removeItem('obsidian-codex-storage');
} catch {
  // ignore
}

const quotaSafeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      console.warn('Quota de LocalStorage atingida; mantendo sincronização em nuvem Convex:', err);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export type WorldSubTab = 'wiki' | 'graph' | 'maps' | 'timeline';
export type PlotSubTab = 'fronts' | 'flowchart' | 'generators';
export type PortalSubTab = 'secrets' | 'quests' | 'journal';

export const DEFAULT_CALENDAR: CalendarConfig = {
  calendarName: 'Calendário da Campanha',
  epochName: 'Era Atual',
  currentYear: 1,
  currentMonthIndex: 0,
  currentDay: 1,
  weekdays: ['Solis', 'Lunaris', 'Ferrum', 'Cineris', 'Vespera', 'Umbra', 'Sacrum'],
  months: [
    { id: 'm1', name: 'Alvorada', days: 30, season: 'Primavera' },
    { id: 'm2', name: 'Solstício', days: 30, season: 'Verão' },
    { id: 'm3', name: 'Colheita', days: 30, season: 'Outono' },
    { id: 'm4', name: 'Bruma', days: 30, season: 'Inverno' },
  ],
  moons: [
    {
      id: 'moon-1',
      name: 'Lua Maior',
      cycleDays: 28,
      offset: 0,
      color: '#e2e8f0',
      lore: 'Ciclo lunar principal do mundo.',
    },
  ],
  availableEras: ['Era Primordial', 'Era Atual'],
};

export const DEFAULT_PARTY_RESOURCES: PartyResources = {
  gold: 0,
  silver: 0,
  copper: 0,
  rations: 0,
  torches: 0,
  healerKits: 0,
  items: [],
  stronghold: {
    name: 'Base da Companhia',
    type: 'Refúgio',
    locationHandle: '',
    integrity: 100,
    maxIntegrity: 100,
    upkeepPerMonth: '0 PO',
    description: 'Configure o nome, descrição e melhorias da base de operações do grupo.',
    upgrades: [],
  },
};

interface CampaignState {
  // Routing & Auth
  currentRoute: AppRoute;
  currentUser: AuthUser | null;
  sessionToken: string | null;
  workspaceMode: 'dm' | 'player';
  campaigns: CampaignSummary[];
  activeCampaignId: string;

  // Modals & Drawers & Settings
  geminiApiKey: string;
  isSettingsModalOpen: boolean;
  isDmPartyDrawerOpen: boolean;
  inspectingCharacterId: string | null;

  // Character Sheets (D&D 5e)
  characterSheets: CharacterSheet[];
  activeCharacterId: string;

  // Navigation & Global Modes
  campaignName: string;
  activeModule: ActiveModule;
  worldSubTab: WorldSubTab;
  plotSubTab: PlotSubTab;
  portalSubTab: PortalSubTab;
  viewRole: ViewRole;
  selectedEntityId: string;
  quickInspectEntityId: string | null;
  selectedMapId: string;
  toastMessage: string | null;

  // Module 1: Worldbuilding Data
  entities: Entity[];
  relationships: RelationshipEdge[];
  graphPositions: GraphNodePosition[];
  manualGraphNodes: ManualGraphNode[];
  maps: CampaignMap[];
  calendar: CalendarConfig;
  timeline: TimelineEvent[];

  // Module 2: Plots & Adventures Data
  fronts: ThreatFront[];
  mysteryNodes: MysterySceneNode[];
  recentGeneratedItems: GeneratedEmergencyItem[];

  // Module 3: Session Cockpit Data
  scratchpad: ScratchpadLine[];
  combatants: Combatant[];
  activeCombatTurnIndex: number;
  combatRound: number;
  diceLogs: DiceRollLog[];

  // Module 4: Player Portal Data
  quests: Quest[];
  journal: SessionJournalEntry[];
  personalJournalNotes: PersonalJournalNote[];
  partyResources: PartyResources;

  // Auth & Hub Actions
  setCurrentRoute: (route: AppRoute) => void;
  setWorkspaceMode: (mode: 'dm' | 'player', targetRoute?: AppRoute) => void;
  loginAsUser: (user: AuthUser, token?: string | null) => void;
  registerAccount: (name: string, email: string, password: string, role: 'dm' | 'player') => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logoutUser: () => void;
  createCampaign: (
    camp: Omit<CampaignSummary, 'id' | 'inviteCode' | 'updatedAt' | 'activePlayersCount' | 'sessionsPlayed'>
  ) => Promise<CampaignSummary | null>;
  updateCampaign: (
    campaignId: string,
    updates: Partial<
      Pick<
        CampaignSummary,
        'title' | 'synopsis' | 'worldContext' | 'system' | 'tone' | 'coverUrl' | 'coverStorageId' | 'sessionsPlayed'
      >
    > & { clearCoverImage?: boolean }
  ) => void;
  deleteCampaign: (campaignId: string) => void;
  selectCampaign: (campaignId: string, targetRoute?: AppRoute) => void;
  joinCampaignByInviteCode: (code: string) => Promise<boolean>;
  importCampaignBackup: (backup: ObsidianCodexBackupPayload) => Promise<void>;

  // Settings & Drawer Actions
  setGeminiApiKey: (key: string) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
  setIsDmPartyDrawerOpen: (open: boolean, characterId?: string | null) => void;

  // Character Sheet Actions
  setActiveCharacterId: (id: string) => void;
  createCharacterSheet: (sheet: Omit<CharacterSheet, 'id' | 'updatedAt'>) => CharacterSheet;
  updateCharacterSheet: (id: string, updates: Partial<CharacterSheet>) => void;
  deleteCharacterSheet: (id: string) => void;

  // Global Actions
  setActiveModule: (mod: ActiveModule) => void;
  setWorldSubTab: (tab: WorldSubTab) => void;
  setPlotSubTab: (tab: PlotSubTab) => void;
  setPortalSubTab: (tab: PortalSubTab) => void;
  setViewRole: (role: ViewRole) => void;
  setSelectedEntityId: (id: string) => void;
  setQuickInspectEntityId: (id: string | null) => void;
  navigateToHandle: (handleWithOrWithoutPrefix: string) => void;
  showToast: (msg: string) => void;

  // Entity & Secret Actions
  addEntity: (partial: Partial<Entity> & { name: string; category: EntityCategory }) => Entity;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  togglePinEntity: (id: string) => void;
  revealEntitySecret: (entityId: string, secretId: string, reveal?: boolean) => void;
  addEntitySecret: (entityId: string, title: string, content: string) => void;
  deleteEntitySecret: (entityId: string, secretId: string) => void;
  addEntityAttribute: (entityId: string, label: string, value: string) => void;
  updateEntityAttribute: (entityId: string, attrId: string, value: string | number) => void;
  deleteEntityAttribute: (entityId: string, attrId: string) => void;

  // Graph Actions
  updateGraphNodePosition: (entityId: string, x: number, y: number) => void;
  addManualGraphNode: (node: Omit<ManualGraphNode, 'id'>) => void;
  deleteManualGraphNode: (id: string) => void;
  addRelationship: (edge: Omit<RelationshipEdge, 'id'>) => void;
  updateRelationshipLabel: (id: string, label: string, type?: RelationshipEdge['type']) => void;
  deleteRelationship: (id: string) => void;
  toggleRevealRelationship: (id: string) => void;

  // Map Actions
  focusMapPin: { mapId: string; pinId: string } | null;
  navigateToMapPin: (mapId: string, pinId: string) => void;
  clearFocusMapPin: () => void;
  setSelectedMapId: (id: string) => void;
  addMap: (
    name: string,
    subtitle: string,
    customImageUrl: string,
    regionType?: CampaignMap['regionType'],
    storageId?: Id<'_storage'>
  ) => void;
  deleteMap: (id: string) => void;
  addMapPin: (mapId: string, pin: Omit<MapPin, 'id'>) => void;
  updateMapPin: (mapId: string, pinId: string, updates: Partial<MapPin>) => void;
  deleteMapPin: (mapId: string, pinId: string) => void;
  toggleRevealMapPin: (mapId: string, pinId: string) => void;
  addMapShape: (mapId: string, shape: Omit<MapDrawingShape, 'id'>) => void;
  updateMapShape: (mapId: string, shapeId: string, updates: Partial<MapDrawingShape>) => void;
  deleteMapShape: (mapId: string, shapeId: string) => void;

  // Calendar & Timeline Actions
  advanceCalendarDays: (days: number) => void;
  updateCalendarConfig: (updates: Partial<CalendarConfig>) => void;
  addTimelineEvent: (ev: Omit<TimelineEvent, 'id'>) => void;
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  reorderTimelineEvents: (draggedId: string, targetId: string) => void;
  toggleRevealTimelineEvent: (id: string) => void;
  deleteTimelineEvent: (id: string) => void;

  // Fronts & Clocks Actions
  setFrontClockValue: (frontId: string, filled: number) => void;
  advanceIgnoredFronts: () => void;
  toggleFrontPortent: (frontId: string, portentId: string) => void;
  addThreatFront: (front: Omit<ThreatFront, 'id'>) => void;
  updateThreatFront: (frontId: string, updates: Partial<ThreatFront>) => void;
  deleteThreatFront: (frontId: string) => void;

  // Mystery Flowchart Actions
  updateMysteryNodePosition: (nodeId: string, x: number, y: number) => void;
  updateMysteryNodeStatus: (nodeId: string, status: MysterySceneNode['status']) => void;
  toggleMysteryClue: (nodeId: string, clueId: string) => void;
  addMysteryNode: (title: string, subtitle: string, locationHandle: string, description: string) => void;
  addMysteryClue: (
    nodeId: string,
    name: string,
    description: string,
    targetSceneId: string,
    type: 'social' | 'investigation' | 'occult' | 'physical'
  ) => void;
  deleteMysteryNode: (nodeId: string) => void;

  // Emergency Generator Actions
  recordGeneratedItem: (item: GeneratedEmergencyItem) => void;
  removeGeneratedItem: (id: string) => void;
  clearGeneratedItems: () => void;
  saveGeneratedItemToDatabase: (item: GeneratedEmergencyItem, pinToSession?: boolean) => void;

  // Session Mode Actions
  addScratchpadLine: (text: string) => void;
  deleteScratchpadLine: (id: string) => void;
  convertScratchpadLineToEntity: (lineId: string, category: EntityCategory) => void;
  adjustCombatantHp: (id: string, delta: number) => void;
  toggleCombatantCondition: (id: string, condition: string) => void;
  nextCombatTurn: () => void;
  rollAllInitiatives: () => void;
  addCombatant: (c: Omit<Combatant, 'id'>) => void;
  removeCombatant: (id: string) => void;
  clearCombatants: () => void;
  rollDice: (sides: number, count?: number, modifier?: number, label?: string) => DiceRollLog;
  clearDiceLogs: () => void;

  // Portal, Quests, Journals & Stronghold Actions
  toggleQuestObjective: (questId: string, objectiveId: string) => void;
  updateQuestStatus: (questId: string, status: Quest['status']) => void;
  addQuest: (q: Omit<Quest, 'id'>) => void;
  deleteQuest: (questId: string) => void;
  addJournalEntry: (entry: Omit<SessionJournalEntry, 'id'>) => void;
  updateJournalEntry: (id: string, updates: Partial<SessionJournalEntry>) => void;
  deleteJournalEntry: (journalId: string) => void;
  addPersonalJournalNote: (note: Omit<PersonalJournalNote, 'id' | 'updatedAt'>) => void;
  updatePersonalJournalNote: (id: string, updates: Partial<PersonalJournalNote>) => void;
  deletePersonalJournalNote: (id: string) => void;
  togglePersonalNoteDmAccess: (id: string) => void;
  adjustPartyCurrency: (type: 'gold' | 'silver' | 'copper' | 'rations' | 'torches' | 'healerKits', delta: number) => void;
  addPartyInventoryItem: (
    name: string,
    quantity: number,
    holder: string,
    category: PartyResources['items'][0]['category'],
    notes: string
  ) => void;
  removePartyInventoryItem: (id: string) => void;
  toggleStrongholdUpgrade: (upgradeId: string) => void;
  updateStronghold: (updates: Partial<Omit<PartyResources['stronghold'], 'upgrades'>>) => void;
  addStrongholdUpgrade: (name: string, cost: string, benefit: string) => void;
  removeStrongholdUpgrade: (upgradeId: string) => void;
}

const getEmptyCampaignScopedState = () => ({
  selectedEntityId: '',
  quickInspectEntityId: null as string | null,
  selectedMapId: '',
  entities: [] as Entity[],
  relationships: [] as RelationshipEdge[],
  graphPositions: [] as GraphNodePosition[],
  manualGraphNodes: [] as ManualGraphNode[],
  maps: [] as CampaignMap[],
  calendar: DEFAULT_CALENDAR,
  timeline: [] as TimelineEvent[],
  fronts: [] as ThreatFront[],
  mysteryNodes: [] as MysterySceneNode[],
  recentGeneratedItems: [] as GeneratedEmergencyItem[],
  scratchpad: [] as ScratchpadLine[],
  combatants: [] as Combatant[],
  activeCombatTurnIndex: 0,
  combatRound: 1,
  diceLogs: [] as DiceRollLog[],
  quests: [] as Quest[],
  journal: [] as SessionJournalEntry[],
  personalJournalNotes: [] as PersonalJournalNote[],
  partyResources: DEFAULT_PARTY_RESOURCES,
});

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      currentRoute: '/login',
      currentUser: null,
      sessionToken: null,
      workspaceMode: 'dm',
      campaigns: [],
      activeCampaignId: '',

      geminiApiKey: '',
      isSettingsModalOpen: false,
      isDmPartyDrawerOpen: false,
      inspectingCharacterId: null,
      focusMapPin: null,

      characterSheets: [],
      activeCharacterId: '',

      campaignName: '',
      activeModule: 'worldbuilding',
      worldSubTab: 'wiki',
      plotSubTab: 'fronts',
      portalSubTab: 'secrets',
      viewRole: 'gm',
      toastMessage: null,

      ...getEmptyCampaignScopedState(),

      // ======================================================================
      // AUTH, ROUTING & HUBS (CONVEX NATIVE AUTH + MULTI-TENANCY)
      // ======================================================================
      setCurrentRoute: (route) => {
        const activeCamp = get().campaigns.find((c) => c.id === get().activeCampaignId);
        const isCampaignPlayerOnly =
          route === '/campaign/session' && activeCamp && activeCamp.isDm === false;

        if (isCampaignPlayerOnly) {
          set({ currentRoute: '/campaign/player-view', viewRole: 'player', workspaceMode: 'player' });
          get().showToast('Você participa desta campanha como Jogador.');
          try {
            window.history.pushState({}, '', '/campaign/player-view');
          } catch {
            // ignore
          }
          return;
        }

        const nextMode: 'dm' | 'player' =
          route === '/player-dashboard' || route === '/campaign/player-view'
            ? 'player'
            : route === '/dm-dashboard' || route === '/campaign/session'
            ? 'dm'
            : get().workspaceMode;

        const viewRole: ViewRole =
          route === '/campaign/player-view' || route === '/player-dashboard'
            ? 'player'
            : 'gm';
        set({ currentRoute: route, viewRole, workspaceMode: nextMode });
        try {
          window.history.pushState({}, '', route);
        } catch {
          // ignore in sandboxed iframe
        }
      },

      setWorkspaceMode: (mode, targetRoute) => {
        const state = get();
        const activeCamp = state.campaigns.find((c) => c.id === state.activeCampaignId);
        let nextRoute: AppRoute =
          targetRoute || (mode === 'dm' ? '/dm-dashboard' : '/player-dashboard');

        if (mode === 'dm' && nextRoute === '/campaign/session' && activeCamp?.isDm === false) {
          nextRoute = '/dm-dashboard';
        }

        const token = state.sessionToken;
        if (token) {
          convexClient
            .mutation(api.auth.switchRole, { sessionToken: token, role: mode })
            .catch(() => {});
        }

        set((s) => ({
          workspaceMode: mode,
          currentRoute: nextRoute,
          viewRole: mode === 'dm' ? 'gm' : 'player',
          currentUser: s.currentUser ? { ...s.currentUser, role: mode } : s.currentUser,
        }));

        try {
          window.history.pushState({}, '', nextRoute);
        } catch {
          // ignore
        }

        get().showToast(
          mode === 'dm'
            ? 'Modo Mestre ativado: gerencie e mestre suas campanhas.'
            : 'Modo Jogador ativado: visualize suas fichas e mesas que você joga.'
        );
      },

      loginAsUser: (user, token = null) => {
        const prevUserId = get().currentUser?.id;
        const isDifferentUser = prevUserId !== user.id;
        const initialMode: 'dm' | 'player' = user.role === 'player' ? 'player' : 'dm';
        const targetRoute: AppRoute =
          initialMode === 'dm' ? '/dm-dashboard' : '/player-dashboard';

        set((state) => ({
          currentUser: user,
          sessionToken: token ?? state.sessionToken,
          workspaceMode: initialMode,
          currentRoute: targetRoute,
          viewRole: initialMode === 'dm' ? 'gm' : 'player',
          ...(isDifferentUser
            ? {
                campaigns: [],
                activeCampaignId: '',
                campaignName: '',
                characterSheets: [],
                activeCharacterId: '',
                inspectingCharacterId: null,
                ...getEmptyCampaignScopedState(),
              }
            : {}),
        }));
        try {
          window.history.pushState({}, '', targetRoute);
        } catch {
          // ignore
        }
        get().showToast(
          `Bem-vindo(a), ${user.name}! (${initialMode === 'dm' ? 'Modo Mestre' : 'Modo Jogador'})`
        );
      },

      registerAccount: async (name, email, password, role) => {
        const res = await convexClient.mutation(api.auth.register, {
          name,
          email,
          password,
          role,
        });
        get().loginAsUser(res.user, res.token);
      },

      loginWithPassword: async (email, password) => {
        const res = await convexClient.mutation(api.auth.login, {
          email,
          password,
        });
        get().loginAsUser(res.user, res.token);
      },

      logoutUser: () => {
        const token = get().sessionToken;
        if (token) {
          convexClient.mutation(api.auth.logout, { sessionToken: token }).catch(() => {});
        }
        set({
          currentUser: null,
          sessionToken: null,
          currentRoute: '/login',
          campaigns: [],
          activeCampaignId: '',
          campaignName: '',
          characterSheets: [],
          activeCharacterId: '',
          inspectingCharacterId: null,
          isDmPartyDrawerOpen: false,
          ...getEmptyCampaignScopedState(),
        });
        try {
          window.history.pushState({}, '', '/login');
        } catch {
          // ignore
        }
        get().showToast('Sessão encerrada com segurança.');
      },

      createCampaign: async (camp) => {
        const codePrefix = camp.title
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z]/g, '')
          .slice(0, 5)
          .toUpperCase();
        const inviteCode = `${codePrefix || 'MESA'}-${Math.floor(1000 + Math.random() * 9000)}`;
        const slugId = `camp-${Date.now()}`;
        const newCamp: CampaignSummary = {
          ...camp,
          id: slugId,
          inviteCode,
          isDm: true,
          dmUserId: get().currentUser?.id,
          activePlayersCount: 0,
          sessionsPlayed: 0,
          updatedAt: 'Agora mesmo',
        };

        try {
          await convexClient.mutation(api.campaign.create, {
            sessionToken: get().sessionToken || undefined,
            slugId,
            title: newCamp.title,
            synopsis: newCamp.synopsis,
            worldContext: newCamp.worldContext || '',
            system: newCamp.system,
            tone: newCamp.tone,
            coverUrl: newCamp.coverUrl,
            coverStorageId: newCamp.coverStorageId
              ? (newCamp.coverStorageId as Id<'_storage'>)
              : undefined,
            inviteCode,
            dmName: newCamp.dmName,
          });

          set((state) => ({
            campaigns: [newCamp, ...state.campaigns.filter((c) => c.id !== newCamp.id)],
            activeCampaignId: newCamp.id,
            campaignName: newCamp.title,
            ...getEmptyCampaignScopedState(),
          }));

          get().showToast(`Campanha "${newCamp.title}" criada! Código de convite: ${inviteCode}`);
          return newCamp;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro ao criar campanha na nuvem.';
          get().showToast(msg);
          return null;
        }
      },

      updateCampaign: (campaignId, updates) => {
        set((state) => {
          const nextCampaigns = state.campaigns.map((c) =>
            c.id === campaignId ? { ...c, ...updates, updatedAt: 'Agora mesmo' } : c
          );
          const activeUpdated = nextCampaigns.find((c) => c.id === state.activeCampaignId);
          return {
            campaigns: nextCampaigns,
            campaignName: activeUpdated ? activeUpdated.title : state.campaignName,
          };
        });

        const { coverStorageId, ...restUpdates } = updates;
        convexClient
          .mutation(api.campaign.update, {
            campaignId,
            sessionToken: get().sessionToken || undefined,
            ...restUpdates,
            ...(coverStorageId !== undefined
              ? { coverStorageId: coverStorageId ? (coverStorageId as Id<'_storage'>) : undefined }
              : {}),
          })
          .catch((err) => {
            get().showToast(err instanceof Error ? err.message : 'Falha ao atualizar campanha.');
          });
      },

      deleteCampaign: (campaignId) => {
        set((state) => {
          const remaining = state.campaigns.filter((c) => c.id !== campaignId);
          const wasActive = state.activeCampaignId === campaignId;
          const nextActive = wasActive ? remaining[0] : remaining.find((c) => c.id === state.activeCampaignId);
          return {
            campaigns: remaining,
            activeCampaignId: nextActive?.id || '',
            campaignName: nextActive?.title || '',
            ...(wasActive ? getEmptyCampaignScopedState() : {}),
          };
        });

        convexClient
          .mutation(api.campaign.remove, {
            campaignId,
            sessionToken: get().sessionToken || undefined,
          })
          .then(() => {
            get().showToast('Campanha e dados associados excluídos.');
          })
          .catch((err) => {
            get().showToast(err instanceof Error ? err.message : 'Falha ao excluir campanha.');
          });
      },

      selectCampaign: (campaignId, targetRoute = '/campaign/session') => {
        const prevCampaignId = get().activeCampaignId;
        const found = get().campaigns.find((c) => c.id === campaignId);
        const isSwitchingCampaign = prevCampaignId !== campaignId;

        const effectiveTarget: AppRoute =
          targetRoute === '/campaign/session' && found && found.isDm === false
            ? '/campaign/player-view'
            : targetRoute;

        const nextMode: 'dm' | 'player' =
          effectiveTarget === '/campaign/player-view' || effectiveTarget === '/player-dashboard'
            ? 'player'
            : 'dm';

        set((state) => ({
          activeCampaignId: campaignId,
          campaignName: found ? found.title : state.campaignName,
          currentRoute: effectiveTarget,
          workspaceMode: nextMode,
          viewRole:
            found?.isDm === false || effectiveTarget === '/campaign/player-view'
              ? 'player'
              : 'gm',
          ...(isSwitchingCampaign ? getEmptyCampaignScopedState() : {}),
        }));
        try {
          window.history.pushState({}, '', effectiveTarget);
        } catch {
          // ignore
        }
      },

      joinCampaignByInviteCode: async (code) => {
        const clean = code.trim().toUpperCase();
        if (clean.length < 4) {
          get().showToast('Informe um código de convite válido.');
          return false;
        }

        try {
          const res = await convexClient.mutation(api.campaign.joinByInviteCode, {
            inviteCode: clean,
            sessionToken: get().sessionToken || undefined,
          });
          if (res.found && res.campaign) {
            set((state) => {
              const exists = state.campaigns.some((c) => c.id === res.campaign!.id);
              return {
                campaigns: exists
                  ? state.campaigns
                  : [res.campaign!, ...state.campaigns],
                activeCampaignId: res.campaign!.id,
                campaignName: res.campaign!.title,
              };
            });
            get().showToast(`Você ingressou na campanha "${res.campaign.title}"!`);
            return true;
          }
        } catch (err) {
          get().showToast(
            err instanceof Error ? err.message : 'Não foi possível validar o convite no servidor.'
          );
          return false;
        }

        get().showToast(
          `Código "${clean}" não encontrado. Verifique o código com o Mestre da campanha.`
        );
        return false;
      },

      importCampaignBackup: async (backup) => {
        const restoredCampId = backup.campaign.id || `camp-import-${Date.now()}`;
        const restoredCamp: CampaignSummary = {
          ...backup.campaign,
          id: restoredCampId,
          updatedAt: 'Importado de Backup',
        };

        set((state) => {
          const otherCampaigns = state.campaigns.filter((c) => c.id !== restoredCampId);
          return {
            campaigns: [restoredCamp, ...otherCampaigns],
            activeCampaignId: restoredCampId,
            campaignName: restoredCamp.title,
            entities: backup.entities || [],
            relationships: backup.relationships || [],
            graphPositions: backup.graphPositions || [],
            manualGraphNodes: [],
            maps: backup.maps || [],
            calendar: backup.calendar || DEFAULT_CALENDAR,
            timeline: backup.timeline || [],
            fronts: backup.fronts || [],
            mysteryNodes: backup.mysteryNodes || [],
            quests: backup.quests || [],
            journal: backup.journal || [],
            personalJournalNotes: backup.personalJournalNotes || [],
            partyResources: backup.partyResources || DEFAULT_PARTY_RESOURCES,
            characterSheets:
              backup.characterSheets && backup.characterSheets.length > 0
                ? backup.characterSheets
                : state.characterSheets,
            selectedEntityId: backup.entities?.[0]?.id || '',
            selectedMapId: backup.maps?.[0]?.id || '',
          };
        });

        try {
          const token = get().sessionToken || undefined;
          await convexClient.mutation(api.campaign.create, {
            sessionToken: token,
            slugId: restoredCampId,
            title: restoredCamp.title,
            synopsis: restoredCamp.synopsis,
            worldContext: restoredCamp.worldContext || '',
            system: restoredCamp.system,
            tone: restoredCamp.tone,
            coverUrl: restoredCamp.coverUrl || '',
            inviteCode: restoredCamp.inviteCode,
            dmName: restoredCamp.dmName,
          });

          // Limpa calendário/recursos iniciais vazios se o backup trouxer dados próprios
          const entityIdMap = new Map<string, string>();
          for (const ent of backup.entities || []) {
            const newEntId = await convexClient.mutation(api.entities.create, {
              campaignId: restoredCampId,
              sessionToken: token,
              handle: ent.handle,
              mentionPrefix: ent.mentionPrefix,
              name: ent.name,
              subtitle: ent.subtitle,
              category: ent.category,
              tags: ent.tags,
              summary: ent.summary,
              publicContent: ent.publicContent,
              pinnedInSession: Boolean(ent.pinnedInSession),
              isPublicToPlayers: ent.isPublicToPlayers ?? true,
              imageUrl: ent.imageUrl,
              updatedAt: ent.updatedAt || new Date().toISOString(),
              initialSecrets: (ent.secrets || []).map((s) => ({
                title: s.title,
                content: s.content,
                isRevealed: Boolean(s.isRevealed),
              })),
              initialAttributes: (ent.attributes || []).map((a) => ({
                label: a.label,
                value: a.value,
                max: a.max,
                category: a.category,
              })),
            });
            if (newEntId) {
              entityIdMap.set(ent.id, newEntId);
            }
          }

          for (const pos of backup.graphPositions || []) {
            const mappedId = entityIdMap.get(pos.entityId) || pos.entityId;
            await convexClient.mutation(api.relationships.updatePosition, {
              campaignId: restoredCampId,
              entityId: mappedId,
              x: pos.x,
              y: pos.y,
            });
          }

          for (const rel of backup.relationships || []) {
            const mappedSource = entityIdMap.get(rel.sourceId) || rel.sourceId;
            const mappedTarget = entityIdMap.get(rel.targetId) || rel.targetId;
            await convexClient.mutation(api.relationships.create, {
              campaignId: restoredCampId,
              sessionToken: token,
              sourceId: mappedSource,
              targetId: mappedTarget,
              label: rel.label,
              type: rel.type,
              notes: rel.notes,
              isSecret: Boolean(rel.isSecret),
              isRevealed: Boolean(rel.isRevealed),
            });
          }

          for (const m of backup.maps || []) {
            const newMapId = await convexClient.mutation(api.maps.create, {
              campaignId: restoredCampId,
              sessionToken: token,
              name: m.name,
              subtitle: m.subtitle,
              regionType: m.regionType,
              presetSvgType: m.presetSvgType,
              customImageUrl: m.customImageUrl,
            });
            if (newMapId) {
              if (m.shapes && m.shapes.length > 0) {
                await convexClient.mutation(api.maps.updateShapes, {
                  mapId: newMapId,
                  shapes: m.shapes,
                  sessionToken: token,
                });
              }
              for (const pin of m.pins || []) {
                await convexClient.mutation(api.maps.addPin, {
                  sessionToken: token,
                  mapId: newMapId,
                  x: pin.x,
                  y: pin.y,
                  label: pin.label,
                  subtitle: pin.subtitle,
                  entityId: pin.entityId ? entityIdMap.get(pin.entityId) || pin.entityId : undefined,
                  linkedEntityIds: pin.linkedEntityIds?.map(
                    (eid) => entityIdMap.get(eid) || eid
                  ),
                  linkedMapId: pin.linkedMapId,
                  layer: pin.layer,
                  iconType: pin.iconType,
                  description: pin.description,
                  monsters: pin.monsters || [],
                  treasures: pin.treasures || [],
                  secretNote: pin.secretNote,
                  isSecret: Boolean(pin.isSecret),
                  isRevealed: Boolean(pin.isRevealed),
                });
              }
            }
          }

          if (backup.calendar) {
            await convexClient.mutation(api.calendar.update, {
              campaignId: restoredCampId,
              sessionToken: token,
              calendarName: backup.calendar.calendarName,
              epochName: backup.calendar.epochName,
              currentYear: backup.calendar.currentYear,
              currentMonthIndex: backup.calendar.currentMonthIndex,
              currentDay: backup.calendar.currentDay,
              weekdays: backup.calendar.weekdays,
              months: backup.calendar.months,
              moons: backup.calendar.moons,
              availableEras: backup.calendar.availableEras,
            });
          }

          for (let i = 0; i < (backup.timeline || []).length; i++) {
            const ev = backup.timeline[i];
            await convexClient.mutation(api.calendar.addEvent, {
              campaignId: restoredCampId,
              sessionToken: token,
              year: ev.year,
              monthIndex: ev.monthIndex,
              day: ev.day,
              epoch: ev.epoch,
              category: ev.category,
              visualTag: ev.visualTag,
              linkedWikiHandles: ev.linkedWikiHandles,
              sortOrder: i,
              sessionNumber: ev.sessionNumber,
              title: ev.title,
              description: ev.description,
              isSecret: Boolean(ev.isSecret),
              isRevealed: Boolean(ev.isRevealed),
            });
          }

          for (const q of backup.quests || []) {
            await convexClient.mutation(api.portal.createQuest, {
              campaignId: restoredCampId,
              sessionToken: token,
              title: q.title,
              subtitle: q.subtitle,
              giverHandle: q.giverHandle,
              locationHandle: q.locationHandle,
              status: q.status,
              isPublic: Boolean(q.isPublic),
              description: q.description,
              gmSecretNote: q.gmSecretNote,
              reward: q.reward,
              objectives: q.objectives,
            });
          }

          for (const f of backup.fronts || []) {
            await convexClient.mutation(api.plots.createFront, {
              campaignId: restoredCampId,
              sessionToken: token,
              name: f.name,
              subtitle: f.subtitle,
              associatedEntityHandle: f.associatedEntityHandle,
              description: f.description,
              clockSegments: f.clockSegments,
              clockFilled: f.clockFilled,
              impendingDoom: f.impendingDoom,
              ignoreConsequence: f.ignoreConsequence,
              grimPortents: f.grimPortents,
              status: f.status,
              isSecret: Boolean(f.isSecret),
            });
          }

          const sceneIdMap = new Map<string, string>();
          for (const sc of backup.mysteryNodes || []) {
            const newSceneId = await convexClient.mutation(api.plots.createScene, {
              campaignId: restoredCampId,
              sessionToken: token,
              title: sc.title,
              subtitle: sc.subtitle,
              locationHandle: sc.locationHandle,
              status: sc.status,
              x: sc.x,
              y: sc.y,
              description: sc.description,
            });
            if (newSceneId) {
              sceneIdMap.set(sc.id, newSceneId);
            }
          }

          for (const sc of backup.mysteryNodes || []) {
            const mappedSceneId = sceneIdMap.get(sc.id);
            if (!mappedSceneId) continue;
            for (const cl of sc.clues || []) {
              const targetId = sceneIdMap.get(cl.targetSceneId) || cl.targetSceneId;
              await convexClient.mutation(api.plots.addClue, {
                sceneId: mappedSceneId,
                name: cl.name,
                description: cl.description,
                targetSceneId: targetId,
                type: cl.type,
                sessionToken: token,
              });
            }
          }

          for (const j of backup.journal || []) {
            await convexClient.mutation(api.portal.addJournal, {
              campaignId: restoredCampId,
              sessionNumber: j.sessionNumber,
              title: j.title,
              inGameDate: j.inGameDate,
              author: j.author,
              content: j.content,
              isPublic: Boolean(j.isPublic),
            });
          }

          if (backup.partyResources) {
            await convexClient.mutation(api.portal.replaceResources, {
              campaignId: restoredCampId,
              gold: backup.partyResources.gold,
              silver: backup.partyResources.silver,
              copper: backup.partyResources.copper,
              rations: backup.partyResources.rations,
              torches: backup.partyResources.torches,
              healerKits: backup.partyResources.healerKits,
              items: backup.partyResources.items || [],
              stronghold: backup.partyResources.stronghold,
            });
          }

          for (const cs of backup.characterSheets || []) {
            await convexClient.mutation(api.characters.create, {
              campaignId: restoredCampId,
              playerId: cs.playerId || get().currentUser?.id || '',
              playerName: cs.playerName,
              campaignTitle: restoredCamp.title,
              name: cs.name,
              avatarUrl: cs.avatarUrl,
              race: cs.race,
              racialTraits: cs.racialTraits,
              className: cs.className,
              subclass: cs.subclass,
              level: cs.level,
              background: cs.background,
              alignment: cs.alignment,
              hp: cs.hp,
              maxHp: cs.maxHp,
              tempHp: cs.tempHp,
              armorClass: cs.armorClass,
              speed: cs.speed,
              hitDice: cs.hitDice,
              hitDiceUsed: cs.hitDiceUsed,
              proficiencyBonus: cs.proficiencyBonus,
              passivePerception: cs.passivePerception,
              stats: cs.stats,
              proficiencies: cs.proficiencies,
              originFeat: cs.originFeat,
              savingThrows: cs.savingThrows,
              weaponMasteries: cs.weaponMasteries,
              classFeatures: cs.classFeatures,
              classResources: cs.classResources,
              spellSlots: cs.spellSlots,
              spells: cs.spells,
              equipment: cs.equipment,
              notes: cs.notes,
            });
          }
        } catch (err) {
          console.error('Erro parcial ao sincronizar backup com Convex:', err);
        }

        get().showToast(`Backup de "${restoredCamp.title}" restaurado e sincronizado!`);
      },

      setGeminiApiKey: (key) => {
        set({ geminiApiKey: key });
        get().showToast(
          key.trim()
            ? 'Chave da API Google Gemini Flash salva nas Configurações!'
            : 'Chave Gemini removida (usando motor procedural contextual).'
        );
      },

      setIsSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),

      setIsDmPartyDrawerOpen: (open, characterId = null) =>
        set((state) => ({
          isDmPartyDrawerOpen: open,
          inspectingCharacterId:
            characterId || state.inspectingCharacterId || state.characterSheets[0]?.id || null,
        })),

      // ======================================================================
      // D&D 5e CHARACTER SHEETS (CLOUD SYNCED)
      // ======================================================================
      setActiveCharacterId: (id) => set({ activeCharacterId: id }),

      createCharacterSheet: (sheetData) => {
        const tempId = `char-${Date.now()}`;
        const newSheet: CharacterSheet = {
          ...sheetData,
          campaignId: sheetData.campaignId ?? get().activeCampaignId,
          playerId: sheetData.playerId || get().currentUser?.id || '',
          id: tempId,
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          characterSheets: [newSheet, ...state.characterSheets],
          activeCharacterId: newSheet.id,
        }));

        convexClient
          .mutation(api.characters.create, {
            sessionToken: get().sessionToken || undefined,
            campaignId: newSheet.campaignId,
            playerId: newSheet.playerId,
            playerName: newSheet.playerName,
            campaignTitle: newSheet.campaignTitle,
            name: newSheet.name,
            avatarUrl: newSheet.avatarUrl,
            race: newSheet.race,
            racialTraits: newSheet.racialTraits,
            className: newSheet.className,
            subclass: newSheet.subclass,
            level: newSheet.level,
            background: newSheet.background,
            alignment: newSheet.alignment,
            hp: newSheet.hp,
            maxHp: newSheet.maxHp,
            tempHp: newSheet.tempHp,
            armorClass: newSheet.armorClass,
            speed: newSheet.speed,
            hitDice: newSheet.hitDice,
            hitDiceUsed: newSheet.hitDiceUsed,
            proficiencyBonus: newSheet.proficiencyBonus,
            passivePerception: newSheet.passivePerception,
            statGenerationMethod: newSheet.statGenerationMethod,
            baseStats: newSheet.baseStats,
            stats: newSheet.stats,
            proficiencies: newSheet.proficiencies,
            expertiseSkills: newSheet.expertiseSkills,
            originFeat: newSheet.originFeat,
            savingThrows: newSheet.savingThrows,
            weaponMasteries: newSheet.weaponMasteries,
            size: newSheet.size,
            initiativeBonus: newSheet.initiativeBonus,
            heroicInspiration: newSheet.heroicInspiration,
            deathSaves: newSheet.deathSaves,
            senses: newSheet.senses,
            resistances: newSheet.resistances,
            languages: newSheet.languages,
            spellcastingAbility: newSheet.spellcastingAbility,
            personality: newSheet.personality,
            classFeatures: newSheet.classFeatures,
            classResources: newSheet.classResources,
            spellSlots: newSheet.spellSlots,
            spells: newSheet.spells,
            equipment: newSheet.equipment,
            notes: newSheet.notes,
          })
          .then((cloudId) => {
            if (cloudId) {
              set((s) => ({
                activeCharacterId:
                  s.activeCharacterId === tempId ? cloudId : s.activeCharacterId,
                characterSheets: s.characterSheets.map((cs) =>
                  cs.id === tempId ? { ...cs, id: cloudId } : cs
                ),
              }));
            }
          })
          .catch(() => {});

        get().showToast(`Ficha de "${newSheet.name}" (${newSheet.className}) sincronizada!`);
        return newSheet;
      },

      updateCharacterSheet: (id, updates) => {
        set((state) => ({
          characterSheets: state.characterSheets.map((cs) =>
            cs.id === id ? { ...cs, ...updates, updatedAt: new Date().toISOString() } : cs
          ),
        }));

        const {
          id: _ignoreId,
          playerId: _ignorePlayer,
          playerName: _ignorePlayerName,
          updatedAt: _ignoreUpd,
          ...patchFields
        } = updates as Partial<CharacterSheet>;
        convexClient
          .mutation(api.characters.update, {
            sessionToken: get().sessionToken || undefined,
            id,
            ...patchFields,
          })
          .catch(() => {});
      },

      deleteCharacterSheet: (id) => {
        set((state) => {
          const remaining = state.characterSheets.filter((cs) => cs.id !== id);
          return {
            characterSheets: remaining,
            activeCharacterId:
              state.activeCharacterId === id ? remaining[0]?.id || '' : state.activeCharacterId,
          };
        });
        convexClient
          .mutation(api.characters.remove, {
            id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
        get().showToast('Ficha de personagem removida.');
      },

      // ======================================================================
      // GLOBAL & WORLDBUILDING ACTIONS
      // ======================================================================
      setActiveModule: (mod) => set({ activeModule: mod }),
      setWorldSubTab: (tab) => set({ worldSubTab: tab }),
      setPlotSubTab: (tab) => set({ plotSubTab: tab }),
      setPortalSubTab: (tab) => set({ portalSubTab: tab }),
      setViewRole: (role) => {
        set({ viewRole: role });
        get().showToast(
          role === 'player'
            ? 'Visão do Jogador ativada: Segredos do Mestre foram ocultados.'
            : 'Visão do Mestre restaurada: Controle total de segredos ativo.'
        );
      },
      setSelectedEntityId: (id) => set({ selectedEntityId: id }),
      setQuickInspectEntityId: (id) => set({ quickInspectEntityId: id }),

      navigateToHandle: (rawHandle) => {
        const clean = rawHandle.replace(/^[@#]/, '').toLowerCase();
        const found = get().entities.find(
          (e) =>
            e.handle.toLowerCase() === clean ||
            e.name.toLowerCase() === clean
        );
        if (found) {
          if (get().activeModule === 'session' || get().currentRoute === '/campaign/player-view') {
            set({ quickInspectEntityId: found.id });
          } else {
            set({
              activeModule: 'worldbuilding',
              worldSubTab: 'wiki',
              selectedEntityId: found.id,
            });
          }
        } else {
          get().showToast(`Entidade "${rawHandle}" ainda não cadastrada.`);
        }
      },

      showToast: (msg) => {
        set({ toastMessage: msg });
        setTimeout(() => {
          if (get().toastMessage === msg) {
            set({ toastMessage: null });
          }
        }, 3400);
      },

      addEntity: (partial) => {
        const isAtPrefix =
          partial.category === 'npc' ||
          partial.category === 'faction' ||
          partial.category === 'monster';
        const prefix = partial.mentionPrefix || (isAtPrefix ? '@' : '#');
        const cleanHandle =
          partial.handle ||
          partial.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '')
            .replace(/[^a-zA-Z0-9]/g, '');

        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newEntity: Entity = {
          id: `ent-${uniqueSuffix}`,
          handle: cleanHandle || `Entidade${Date.now()}`,
          mentionPrefix: prefix,
          name: partial.name,
          subtitle: partial.subtitle || 'Registro de Campanha',
          category: partial.category,
          tags: partial.tags || ['Registro'],
          summary: partial.summary || 'Descrição resumida desta entidade.',
          publicContent:
            partial.publicContent ||
            `Registros públicos sobre ${prefix}${cleanHandle}. Use @Nome ou #Local para referenciar páginas na Wiki.`,
          secrets: partial.secrets || [],
          attributes: partial.attributes || [
            { id: `attr-${uniqueSuffix}-1`, label: 'Relevância', value: 'Alta', category: 'meta' },
          ],
          pinnedInSession: Boolean(partial.pinnedInSession),
          isPublicToPlayers: partial.isPublicToPlayers ?? true,
          imageUrl: partial.imageUrl,
          updatedAt: new Date().toISOString(),
        };

        const initX = 250 + Math.floor(Math.random() * 420);
        const initY = 160 + Math.floor(Math.random() * 300);

        set((state) => ({
          entities: [newEntity, ...state.entities],
          selectedEntityId: newEntity.id,
          graphPositions: [
            ...state.graphPositions,
            {
              entityId: newEntity.id,
              x: initX,
              y: initY,
            },
          ],
        }));

        convexClient
          .mutation(api.entities.create, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            name: newEntity.name,
            handle: newEntity.handle,
            mentionPrefix: newEntity.mentionPrefix,
            subtitle: newEntity.subtitle,
            category: newEntity.category,
            tags: newEntity.tags,
            summary: newEntity.summary,
            publicContent: newEntity.publicContent,
            pinnedInSession: newEntity.pinnedInSession,
            isPublicToPlayers: newEntity.isPublicToPlayers,
            imageUrl: newEntity.imageUrl,
            updatedAt: newEntity.updatedAt,
            initialSecrets: newEntity.secrets.map((s) => ({
              title: s.title,
              content: s.content,
              isRevealed: s.isRevealed,
            })),
            initialAttributes: newEntity.attributes.map((a) => ({
              label: a.label,
              value: a.value,
              max: a.max,
              category: a.category,
            })),
          })
          .then((convexId) => {
            if (convexId) {
              set((s) => ({
                selectedEntityId:
                  s.selectedEntityId === newEntity.id ? convexId : s.selectedEntityId,
                entities: s.entities.map((e) =>
                  e.id === newEntity.id ? { ...e, id: convexId } : e
                ),
                graphPositions: s.graphPositions.map((gp) =>
                  gp.entityId === newEntity.id ? { ...gp, entityId: convexId } : gp
                ),
                maps: s.maps.map((m) => ({
                  ...m,
                  pins: m.pins.map((p) => ({
                    ...p,
                    entityId: p.entityId === newEntity.id ? convexId : p.entityId,
                    linkedEntityIds: p.linkedEntityIds?.map((eid) =>
                      eid === newEntity.id ? convexId : eid
                    ),
                  })),
                })),
              }));
              convexClient
                .mutation(api.relationships.updatePosition, {
                  campaignId: get().activeCampaignId,
                  entityId: convexId,
                  x: initX,
                  y: initY,
                })
                .catch(() => {});
            }
          })
          .catch(() => {});

        get().showToast(`Entidade ${prefix}${newEntity.handle} salva no Códice!`);
        return newEntity;
      },

      updateEntity: (id, updates) => {
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
        }));

        convexClient
          .mutation(api.entities.update, {
            id,
            sessionToken: get().sessionToken || undefined,
            name: updates.name,
            subtitle: updates.subtitle,
            summary: updates.summary,
            publicContent: updates.publicContent,
            tags: updates.tags,
            pinnedInSession: updates.pinnedInSession,
            isPublicToPlayers: updates.isPublicToPlayers,
            imageUrl: updates.imageUrl,
            updatedAt: new Date().toISOString(),
          })
          .catch(() => {});
      },

      deleteEntity: (id) => {
        set((state) => {
          const remaining = state.entities.filter((e) => e.id !== id);
          return {
            entities: remaining,
            relationships: state.relationships.filter(
              (r) => r.sourceId !== id && r.targetId !== id
            ),
            selectedEntityId:
              state.selectedEntityId === id
                ? remaining[0]?.id || ''
                : state.selectedEntityId,
          };
        });

        convexClient
          .mutation(api.entities.remove, {
            id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      togglePinEntity: (id) => {
        const target = get().entities.find((e) => e.id === id);
        if (!target) return;
        const nextPinned = !target.pinnedInSession;
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === id ? { ...e, pinnedInSession: nextPinned } : e
          ),
        }));

        convexClient
          .mutation(api.entities.togglePin, {
            id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});

        get().showToast(
          nextPinned
            ? `${target.mentionPrefix}${target.handle} fixado no Modo Sessão!`
            : `${target.mentionPrefix}${target.handle} desafixado do Modo Sessão.`
        );
      },

      revealEntitySecret: (entityId, secretId, reveal = true) => {
        const calendar = get().calendar;
        const currentMonth = calendar.months[calendar.currentMonthIndex]?.name || '';
        const stamp = `${calendar.currentDay} de ${currentMonth}, ${calendar.currentYear} ${calendar.epochName.split(' ')[0]}`;
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === entityId
              ? {
                  ...e,
                  secrets: e.secrets.map((s) =>
                    s.id === secretId
                      ? { ...s, isRevealed: reveal, revealedAt: reveal ? stamp : undefined }
                      : s
                  ),
                }
              : e
          ),
        }));

        convexClient
          .mutation(api.entities.revealSecret, {
            secretId,
            isRevealed: reveal,
            revealedAt: reveal ? stamp : undefined,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});

        get().showToast(
          reveal
            ? 'Segredo revelado aos jogadores no Portal Público!'
            : 'Segredo ocultado novamente na Névoa de Guerra.'
        );
      },

      addEntitySecret: (entityId, title, content) => {
        const tempId = `sec-${Date.now()}`;
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === entityId
              ? {
                  ...e,
                  secrets: [
                    ...e.secrets,
                    {
                      id: tempId,
                      title,
                      content,
                      isRevealed: false,
                    },
                  ],
                }
              : e
          ),
        }));

        convexClient
          .mutation(api.entities.addSecret, {
            entityId,
            title,
            content,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      deleteEntitySecret: (entityId, secretId) => {
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === entityId
              ? { ...e, secrets: e.secrets.filter((s) => s.id !== secretId) }
              : e
          ),
        }));

        convexClient
          .mutation(api.entities.removeSecret, {
            secretId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      addEntityAttribute: (entityId, label, value) => {
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === entityId
              ? {
                  ...e,
                  attributes: [
                    ...e.attributes,
                    { id: `attr-${Date.now()}`, label, value, category: 'stat' },
                  ],
                }
              : e
          ),
        }));

        convexClient
          .mutation(api.entities.addAttribute, { entityId, label, value, category: 'stat' })
          .catch(() => {});
      },

      updateEntityAttribute: (entityId, attrId, value) => {
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === entityId
              ? {
                  ...e,
                  attributes: e.attributes.map((a) =>
                    a.id === attrId ? { ...a, value } : a
                  ),
                }
              : e
          ),
        }));

        convexClient
          .mutation(api.entities.updateAttribute, { attributeId: attrId, value })
          .catch(() => {});
      },

      deleteEntityAttribute: (entityId, attrId) => {
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === entityId
              ? {
                  ...e,
                  attributes: e.attributes.filter((a) => a.id !== attrId),
                }
              : e
          ),
        }));

        convexClient.mutation(api.entities.removeAttribute, { attributeId: attrId }).catch(() => {});
      },

      // ======================================================================
      // MANUAL GRAPH ACTIONS (100% CLOUD SYNCED)
      // ======================================================================
      updateGraphNodePosition: (entityId, x, y) => {
        set((state) => {
          const isManual = state.manualGraphNodes.some((n) => n.id === entityId);
          if (isManual) {
            return {
              manualGraphNodes: state.manualGraphNodes.map((n) =>
                n.id === entityId ? { ...n, x, y } : n
              ),
            };
          }
          const exists = state.graphPositions.some((p) => p.entityId === entityId);
          if (exists) {
            return {
              graphPositions: state.graphPositions.map((p) =>
                p.entityId === entityId ? { ...p, x, y } : p
              ),
            };
          }
          return {
            graphPositions: [...state.graphPositions, { entityId, x, y }],
          };
        });

        convexClient
          .mutation(api.relationships.updatePosition, {
            campaignId: get().activeCampaignId,
            entityId,
            x,
            y,
          })
          .catch(() => {});
      },

      addManualGraphNode: (node) => {
        const tempId = `gnode-${Date.now()}`;
        const newNode: ManualGraphNode = {
          ...node,
          id: tempId,
        };
        set((state) => ({
          manualGraphNodes: [...state.manualGraphNodes, newNode],
        }));

        convexClient
          .mutation(api.relationships.addManualNode, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            label: node.label,
            subtitle: node.subtitle,
            category: node.category,
            entityId: node.entityId,
            x: node.x,
            y: node.y,
          })
          .then((cloudId) => {
            if (cloudId) {
              set((s) => ({
                manualGraphNodes: s.manualGraphNodes.map((n) =>
                  n.id === tempId ? { ...n, id: cloudId } : n
                ),
              }));
            }
          })
          .catch(() => {});

        get().showToast(`Nó "${node.label}" sincronizado no Grafo!`);
      },

      deleteManualGraphNode: (id) => {
        set((state) => ({
          manualGraphNodes: state.manualGraphNodes.filter((n) => n.id !== id),
          relationships: state.relationships.filter(
            (r) => r.sourceId !== id && r.targetId !== id
          ),
        }));

        convexClient
          .mutation(api.relationships.removeManualNode, {
            id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});

        get().showToast('Nó removido do Grafo.');
      },

      addRelationship: (edge) => {
        const tempId = `rel-${Date.now()}`;
        set((state) => ({
          relationships: [...state.relationships, { ...edge, id: tempId }],
        }));

        convexClient
          .mutation(api.relationships.create, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            label: edge.label,
            type: edge.type,
            notes: edge.notes,
            isSecret: Boolean(edge.isSecret),
            isRevealed: edge.isRevealed,
          })
          .catch(() => {});

        get().showToast(`Conexão "${edge.label}" criada no Grafo!`);
      },

      updateRelationshipLabel: (id, label, type) => {
        set((state) => ({
          relationships: state.relationships.map((r) =>
            r.id === id ? { ...r, label, ...(type ? { type } : {}) } : r
          ),
        }));

        convexClient
          .mutation(api.relationships.update, {
            id,
            label,
            type,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});

        get().showToast('Rótulo da conexão atualizado!');
      },

      deleteRelationship: (id) => {
        set((state) => ({
          relationships: state.relationships.filter((r) => r.id !== id),
        }));

        convexClient
          .mutation(api.relationships.remove, {
            id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
        get().showToast('Conexão removida.');
      },

      toggleRevealRelationship: (id) => {
        set((state) => ({
          relationships: state.relationships.map((r) =>
            r.id === id ? { ...r, isRevealed: !r.isRevealed, isSecret: r.isRevealed ? true : false } : r
          ),
        }));

        convexClient
          .mutation(api.relationships.toggleReveal, {
            id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      // ======================================================================
      // INTERACTIVE MAPS, CONVEX FILE STORAGE & VECTOR SHAPES
      // ======================================================================
      navigateToMapPin: (mapId, pinId) => {
        set({
          currentRoute: '/campaign/session',
          activeModule: 'worldbuilding',
          worldSubTab: 'maps',
          selectedMapId: mapId,
          focusMapPin: { mapId, pinId },
        });
      },
      clearFocusMapPin: () => set({ focusMapPin: null }),
      setSelectedMapId: (id) => set({ selectedMapId: id }),

      addMap: (name, subtitle, customImageUrl, regionType = 'regional', storageId) => {
        const tempId = `map-${Date.now()}`;
        const newMap: CampaignMap = {
          id: tempId,
          name,
          subtitle,
          regionType,
          presetSvgType: customImageUrl ? 'custom' : 'tactical_grid',
          customImageUrl,
          pins: [],
          shapes: [],
        };
        set((state) => ({
          maps: [...state.maps, newMap],
          selectedMapId: newMap.id,
        }));

        convexClient
          .mutation(api.maps.create, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            name,
            subtitle,
            regionType,
            presetSvgType: newMap.presetSvgType,
            customImageUrl,
            storageId,
          })
          .then((cloudMapId) => {
            if (cloudMapId) {
              set((s) => ({
                selectedMapId: s.selectedMapId === tempId ? cloudMapId : s.selectedMapId,
                maps: s.maps.map((m) => (m.id === tempId ? { ...m, id: cloudMapId } : m)),
              }));
            }
          })
          .catch(() => {});

        get().showToast(`Mapa "${name}" salvo na nuvem!`);
      },

      deleteMap: (id) => {
        set((state) => {
          const remaining = state.maps.filter((m) => m.id !== id);
          return {
            maps: remaining,
            selectedMapId: remaining[0]?.id || '',
          };
        });

        convexClient
          .mutation(api.maps.remove, {
            id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
        get().showToast('Mapa removido.');
      },

      addMapPin: (mapId, pin) => {
        const tempId = `pin-${Date.now()}`;
        set((state) => ({
          maps: state.maps.map((m) =>
            m.id === mapId
              ? { ...m, pins: [...m.pins, { ...pin, id: tempId }] }
              : m
          ),
        }));

        convexClient
          .mutation(api.maps.addPin, {
            sessionToken: get().sessionToken || undefined,
            mapId,
            x: pin.x,
            y: pin.y,
            label: pin.label,
            subtitle: pin.subtitle,
            entityId: pin.entityId,
            linkedEntityIds: pin.linkedEntityIds,
            linkedMapId: pin.linkedMapId,
            layer: pin.layer,
            iconType: pin.iconType,
            description: pin.description,
            monsters: pin.monsters || [],
            treasures: pin.treasures || [],
            secretNote: pin.secretNote,
            isSecret: Boolean(pin.isSecret),
            isRevealed: Boolean(pin.isRevealed),
          })
          .then((cloudId) => {
            if (cloudId) {
              set((s) => ({
                maps: s.maps.map((m) =>
                  m.id === mapId
                    ? {
                        ...m,
                        pins: m.pins.map((p) =>
                          p.id === tempId ? { ...p, id: cloudId } : p
                        ),
                      }
                    : m
                ),
              }));
            }
          })
          .catch(() => {});

        get().showToast(`Marcador "${pin.label}" fixado no mapa!`);
      },

      updateMapPin: (mapId, pinId, updates) => {
        set((state) => ({
          maps: state.maps.map((m) =>
            m.id === mapId
              ? {
                  ...m,
                  pins: m.pins.map((p) => (p.id === pinId ? { ...p, ...updates } : p)),
                }
              : m
          ),
        }));

        convexClient
          .mutation(api.maps.updatePin, {
            sessionToken: get().sessionToken || undefined,
            pinId,
            x: updates.x,
            y: updates.y,
            label: updates.label,
            subtitle: updates.subtitle,
            entityId: updates.entityId,
            linkedEntityIds: updates.linkedEntityIds,
            linkedMapId: updates.linkedMapId,
            layer: updates.layer,
            iconType: updates.iconType,
            description: updates.description,
            monsters: updates.monsters,
            treasures: updates.treasures,
            secretNote: updates.secretNote,
            isSecret: updates.isSecret,
            isRevealed: updates.isRevealed,
          })
          .catch(() => {});
      },

      deleteMapPin: (mapId, pinId) => {
        set((state) => ({
          maps: state.maps.map((m) =>
            m.id === mapId
              ? { ...m, pins: m.pins.filter((p) => p.id !== pinId) }
              : m
          ),
        }));

        convexClient
          .mutation(api.maps.removePin, {
            pinId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      toggleRevealMapPin: (mapId, pinId) => {
        set((state) => ({
          maps: state.maps.map((m) =>
            m.id === mapId
              ? {
                  ...m,
                  pins: m.pins.map((p) =>
                    p.id === pinId
                      ? { ...p, isRevealed: !p.isRevealed, isSecret: p.isRevealed }
                      : p
                  ),
                }
              : m
          ),
        }));

        convexClient
          .mutation(api.maps.toggleRevealPin, {
            pinId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
        get().showToast('Visibilidade do Pin atualizada para os jogadores!');
      },

      addMapShape: (mapId, shape) => {
        const newShape: MapDrawingShape = {
          ...shape,
          id: `shape-${Date.now()}`,
        };
        let nextShapes: MapDrawingShape[] = [];
        set((state) => ({
          maps: state.maps.map((m) => {
            if (m.id !== mapId) return m;
            nextShapes = [...(m.shapes || []), newShape];
            return { ...m, shapes: nextShapes };
          }),
        }));
        convexClient
          .mutation(api.maps.updateShapes, {
            mapId,
            shapes: nextShapes,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
        get().showToast(`Camada vetorial "${shape.label}" sincronizada no mapa!`);
      },

      updateMapShape: (mapId, shapeId, updates) => {
        let nextShapes: MapDrawingShape[] = [];
        set((state) => ({
          maps: state.maps.map((m) => {
            if (m.id !== mapId) return m;
            nextShapes = (m.shapes || []).map((s) =>
              s.id === shapeId ? { ...s, ...updates } : s
            );
            return { ...m, shapes: nextShapes };
          }),
        }));
        convexClient
          .mutation(api.maps.updateShapes, {
            mapId,
            shapes: nextShapes,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      deleteMapShape: (mapId, shapeId) => {
        let nextShapes: MapDrawingShape[] = [];
        set((state) => ({
          maps: state.maps.map((m) => {
            if (m.id !== mapId) return m;
            nextShapes = (m.shapes || []).filter((s) => s.id !== shapeId);
            return { ...m, shapes: nextShapes };
          }),
        }));
        convexClient
          .mutation(api.maps.updateShapes, {
            mapId,
            shapes: nextShapes,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
        get().showToast('Desenho/Território removido do mapa.');
      },

      // ======================================================================
      // CALENDAR & TIMELINE (100% CLOUD SYNCED)
      // ======================================================================
      advanceCalendarDays: (days) => {
        set((state) => {
          const cal = { ...state.calendar };
          let day = cal.currentDay + days;
          let monthIdx = cal.currentMonthIndex;
          let year = cal.currentYear;

          while (day > (cal.months[monthIdx]?.days || 30)) {
            day -= cal.months[monthIdx]?.days || 30;
            monthIdx++;
            if (monthIdx >= cal.months.length) {
              monthIdx = 0;
              year++;
            }
          }
          while (day < 1) {
            monthIdx--;
            if (monthIdx < 0) {
              monthIdx = cal.months.length - 1;
              year--;
            }
            day += cal.months[monthIdx]?.days || 30;
          }

          return {
            calendar: {
              ...cal,
              currentDay: day,
              currentMonthIndex: monthIdx,
              currentYear: year,
            },
          };
        });

        convexClient
          .mutation(api.calendar.advanceDays, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            days,
          })
          .catch(() => {});
      },

      updateCalendarConfig: (updates) => {
        set((state) => ({
          calendar: { ...state.calendar, ...updates },
        }));

        convexClient
          .mutation(api.calendar.update, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            calendarName: updates.calendarName,
            epochName: updates.epochName,
            currentYear: updates.currentYear,
            currentMonthIndex: updates.currentMonthIndex,
            currentDay: updates.currentDay,
            weekdays: updates.weekdays,
            months: updates.months?.map((m) => ({
              id: m.id,
              name: m.name,
              days: m.days,
              season: m.season,
            })),
            moons: updates.moons?.map((mn) => ({
              id: mn.id,
              name: mn.name,
              cycleDays: mn.cycleDays,
              offset: mn.offset,
              color: mn.color,
              lore: mn.lore,
            })),
            availableEras: updates.availableEras,
          })
          .catch(() => {});
      },

      addTimelineEvent: (ev) => {
        const tempId = `ev-${Date.now()}`;
        const nextOrder = get().timeline.length;
        set((state) => ({
          timeline: [...state.timeline, { ...ev, id: tempId }].sort(
            (a, b) =>
              a.year * 1000 +
              a.monthIndex * 40 +
              a.day -
              (b.year * 1000 + b.monthIndex * 40 + b.day)
          ),
        }));

        convexClient
          .mutation(api.calendar.addEvent, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            year: ev.year,
            monthIndex: ev.monthIndex,
            day: ev.day,
            epoch: ev.epoch || get().calendar.epochName,
            category: ev.category || 'historical',
            visualTag: ev.visualTag,
            linkedWikiHandles: ev.linkedWikiHandles,
            sortOrder: nextOrder,
            sessionNumber: ev.sessionNumber,
            title: ev.title,
            description: ev.description,
            isSecret: Boolean(ev.isSecret),
            isRevealed: Boolean(ev.isRevealed),
          })
          .catch(() => {});

        get().showToast(`Marco histórico "${ev.title}" registrado!`);
      },

      updateTimelineEvent: (id, updates) => {
        set((state) => ({
          timeline: state.timeline.map((ev) =>
            ev.id === id ? { ...ev, ...updates } : ev
          ),
        }));

        convexClient
          .mutation(api.calendar.updateEvent, {
            eventId: id,
            sessionToken: get().sessionToken || undefined,
            year: updates.year,
            monthIndex: updates.monthIndex,
            day: updates.day,
            epoch: updates.epoch,
            category: updates.category,
            visualTag: updates.visualTag,
            linkedWikiHandles: updates.linkedWikiHandles,
            sessionNumber: updates.sessionNumber,
            title: updates.title,
            description: updates.description,
            isSecret: updates.isSecret,
            isRevealed: updates.isRevealed,
          })
          .catch(() => {});

        get().showToast('Evento da Linha do Tempo atualizado!');
      },

      reorderTimelineEvents: (draggedId, targetId) => {
        if (draggedId === targetId) return;
        let orderedIds: string[] = [];
        set((state) => {
          const list = [...state.timeline];
          const fromIdx = list.findIndex((e) => e.id === draggedId);
          const toIdx = list.findIndex((e) => e.id === targetId);
          if (fromIdx === -1 || toIdx === -1) return state;
          const [moved] = list.splice(fromIdx, 1);
          list.splice(toIdx, 0, moved);
          orderedIds = list.map((e) => e.id);
          return { timeline: list };
        });

        if (orderedIds.length > 0) {
          convexClient
            .mutation(api.calendar.reorderEvents, {
              campaignId: get().activeCampaignId,
              sessionToken: get().sessionToken || undefined,
              orderedIds,
            })
            .catch(() => {});
        }
      },

      toggleRevealTimelineEvent: (id) => {
        set((state) => ({
          timeline: state.timeline.map((ev) =>
            ev.id === id ? { ...ev, isRevealed: !ev.isRevealed } : ev
          ),
        }));

        convexClient
          .mutation(api.calendar.toggleRevealEvent, {
            eventId: id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      deleteTimelineEvent: (id) => {
        set((state) => ({
          timeline: state.timeline.filter((ev) => ev.id !== id),
        }));

        convexClient
          .mutation(api.calendar.removeEvent, {
            eventId: id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      // ======================================================================
      // FRONTS & PROGRESS CLOCKS (100% CLOUD SYNCED)
      // ======================================================================
      setFrontClockValue: (frontId, filled) => {
        set((state) => ({
          fronts: state.fronts.map((f) => {
            if (f.id !== frontId) return f;
            const clamped = Math.max(0, Math.min(f.clockSegments, filled));
            return {
              ...f,
              clockFilled: clamped,
              status: clamped >= f.clockSegments ? 'triggered' : 'active',
              grimPortents: f.grimPortents.map((gp, idx) => ({
                ...gp,
                triggered: idx < clamped,
              })),
            };
          }),
        }));

        convexClient
          .mutation(api.plots.updateFrontClock, {
            frontId,
            clockFilled: filled,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      advanceIgnoredFronts: () => {
        set((state) => ({
          fronts: state.fronts.map((f) => {
            if (f.status !== 'active') return f;
            const next = Math.min(f.clockSegments, f.clockFilled + 1);
            return {
              ...f,
              clockFilled: next,
              status: next >= f.clockSegments ? 'triggered' : 'active',
              grimPortents: f.grimPortents.map((gp, idx) => ({
                ...gp,
                triggered: idx < next,
              })),
            };
          }),
        }));

        convexClient
          .mutation(api.plots.advanceAllFronts, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
        get().showToast('Todas as Frentes Ativas avançaram +1 segmento!');
      },

      toggleFrontPortent: (frontId, portentId) => {
        set((state) => ({
          fronts: state.fronts.map((f) =>
            f.id === frontId
              ? {
                  ...f,
                  grimPortents: f.grimPortents.map((gp) =>
                    gp.id === portentId ? { ...gp, triggered: !gp.triggered } : gp
                  ),
                }
              : f
          ),
        }));

        convexClient
          .mutation(api.plots.togglePortent, {
            frontId,
            portentId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      addThreatFront: (front) => {
        const tempId = `front-${Date.now()}`;
        set((state) => ({
          fronts: [{ ...front, id: tempId }, ...state.fronts],
        }));

        convexClient
          .mutation(api.plots.createFront, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            name: front.name,
            subtitle: front.subtitle,
            associatedEntityHandle: front.associatedEntityHandle,
            description: front.description,
            clockSegments: front.clockSegments,
            clockFilled: front.clockFilled,
            impendingDoom: front.impendingDoom,
            ignoreConsequence: front.ignoreConsequence,
            grimPortents: front.grimPortents,
            status: front.status,
            isSecret: Boolean(front.isSecret),
          })
          .catch(() => {});

        get().showToast(`Nova Frente de Ameaça "${front.name}" criada!`);
      },

      updateThreatFront: (frontId, updates) => {
        set((state) => ({
          fronts: state.fronts.map((f) =>
            f.id === frontId ? { ...f, ...updates } : f
          ),
        }));

        convexClient
          .mutation(api.plots.updateFront, {
            frontId,
            sessionToken: get().sessionToken || undefined,
            name: updates.name,
            subtitle: updates.subtitle,
            associatedEntityHandle: updates.associatedEntityHandle,
            description: updates.description,
            clockSegments: updates.clockSegments,
            clockFilled: updates.clockFilled,
            impendingDoom: updates.impendingDoom,
            ignoreConsequence: updates.ignoreConsequence,
            grimPortents: updates.grimPortents,
            status: updates.status,
            isSecret: updates.isSecret,
          })
          .catch(() => {});

        get().showToast('Frente de Ameaça atualizada!');
      },

      deleteThreatFront: (frontId) => {
        set((state) => ({
          fronts: state.fronts.filter((f) => f.id !== frontId),
        }));

        convexClient
          .mutation(api.plots.removeFront, {
            frontId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      // ======================================================================
      // MYSTERY FLOWCHART & GENERATORS
      // ======================================================================
      updateMysteryNodePosition: (nodeId, x, y) => {
        set((state) => ({
          mysteryNodes: state.mysteryNodes.map((n) =>
            n.id === nodeId ? { ...n, x, y } : n
          ),
        }));

        convexClient
          .mutation(api.plots.updateScenePosition, { sceneId: nodeId, x, y })
          .catch(() => {});
      },

      updateMysteryNodeStatus: (nodeId, status) => {
        set((state) => ({
          mysteryNodes: state.mysteryNodes.map((n) =>
            n.id === nodeId ? { ...n, status } : n
          ),
        }));

        convexClient
          .mutation(api.plots.updateSceneStatus, {
            sceneId: nodeId,
            status,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      toggleMysteryClue: (nodeId, clueId) => {
        set((state) => ({
          mysteryNodes: state.mysteryNodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  clues: n.clues.map((c) =>
                    c.id === clueId ? { ...c, discovered: !c.discovered } : c
                  ),
                }
              : n
          ),
        }));

        convexClient
          .mutation(api.plots.toggleClue, {
            sceneId: nodeId,
            clueId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      addMysteryNode: (title, subtitle, locationHandle, description) => {
        const tempId = `scene-${Date.now()}`;
        const x = 240 + Math.floor(Math.random() * 280);
        const y = 120 + Math.floor(Math.random() * 220);

        set((state) => ({
          mysteryNodes: [
            ...state.mysteryNodes,
            {
              id: tempId,
              title,
              subtitle,
              locationHandle,
              status: 'unlocked',
              x,
              y,
              description,
              clues: [],
            },
          ],
        }));

        convexClient
          .mutation(api.plots.createScene, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            title,
            subtitle,
            locationHandle,
            status: 'unlocked',
            x,
            y,
            description,
          })
          .catch(() => {});
      },

      addMysteryClue: (nodeId, name, description, targetSceneId, type) => {
        set((state) => ({
          mysteryNodes: state.mysteryNodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  clues: [
                    ...n.clues,
                    {
                      id: `clue-${Date.now()}`,
                      name,
                      description,
                      targetSceneId,
                      discovered: false,
                      type,
                    },
                  ],
                }
              : n
          ),
        }));

        convexClient
          .mutation(api.plots.addClue, {
            sceneId: nodeId,
            name,
            description,
            targetSceneId,
            type,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      deleteMysteryNode: (nodeId) => {
        set((state) => ({
          mysteryNodes: state.mysteryNodes.filter((n) => n.id !== nodeId),
        }));

        convexClient
          .mutation(api.plots.removeScene, {
            sceneId: nodeId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      recordGeneratedItem: (item) =>
        set((state) => ({
          recentGeneratedItems: [item, ...state.recentGeneratedItems.slice(0, 11)],
        })),

      removeGeneratedItem: (id) =>
        set((state) => ({
          recentGeneratedItems: state.recentGeneratedItems.filter((item) => item.id !== id),
        })),

      clearGeneratedItems: () => set({ recentGeneratedItems: [] }),

      saveGeneratedItemToDatabase: (item, pinToSession = false) => {
        const categoryMap: Record<GeneratedEmergencyItem['type'], EntityCategory> = {
          npc: 'npc',
          tavern: 'location',
          rumor: 'lore',
          loot: 'item',
        };
        const category = categoryMap[item.type];
        const publicDetails = item.details
          .filter((d) => !d.isSecret)
          .map((d) => `• ${d.label}: ${d.value}`)
          .join('\n');
        const secretDetails = item.details.filter((d) => d.isSecret);

        get().addEntity({
          name: item.title,
          subtitle: item.subtitle,
          handle: item.rawHandle,
          category,
          tags: [item.aiGenerated ? 'Gemini IA Contextual' : 'Gerado em Mesa', item.type.toUpperCase()],
          summary: item.details[0]?.value || item.subtitle,
          publicContent: publicDetails,
          secrets: secretDetails.map((s, i) => ({
            id: `sec-gen-${Date.now()}-${i}`,
            title: s.label,
            content: s.value,
            isRevealed: false,
          })),
          pinnedInSession: pinToSession,
        });
      },

      // ======================================================================
      // SESSION COCKPIT (COMBATE E DADOS EM TEMPO REAL NA NUVEM)
      // ======================================================================
      addScratchpadLine: (text) => {
        const timestamp = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const tempId = `scr-${Date.now()}`;
        set((state) => ({
          scratchpad: [{ id: tempId, text, timestamp }, ...state.scratchpad],
        }));

        convexClient
          .mutation(api.session.addScratchpad, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            text,
            timestamp,
          })
          .catch(() => {});
      },

      deleteScratchpadLine: (id) => {
        set((state) => ({
          scratchpad: state.scratchpad.filter((s) => s.id !== id),
        }));

        convexClient
          .mutation(api.session.removeScratchpad, {
            id,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      convertScratchpadLineToEntity: (lineId, category) => {
        const line = get().scratchpad.find((s) => s.id === lineId);
        if (!line) return;

        const parts = line.text.split(/[-—:]/);
        const rawTitle = parts[0].trim().slice(0, 42) || 'Entidade de Sessão';
        const created = get().addEntity({
          name: rawTitle.replace(/^[@#]/, ''),
          subtitle: `Convertido do Bloco de Notas (${line.timestamp})`,
          category,
          summary: line.text,
          publicContent: line.text,
          pinnedInSession: true,
        });

        const handleString = `${created.mentionPrefix}${created.handle}`;
        set((state) => ({
          scratchpad: state.scratchpad.map((s) =>
            s.id === lineId
              ? {
                  ...s,
                  convertedEntityHandle: handleString,
                }
              : s
          ),
        }));

        convexClient
          .mutation(api.session.markScratchpadConverted, {
            id: lineId,
            convertedEntityHandle: handleString,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      adjustCombatantHp: (id, delta) => {
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id
              ? { ...c, hp: Math.max(0, Math.min(c.maxHp, c.hp + delta)) }
              : c
          ),
        }));

        convexClient.mutation(api.session.adjustHp, { id, delta }).catch(() => {});
      },

      toggleCombatantCondition: (id, condition) => {
        set((state) => ({
          combatants: state.combatants.map((c) => {
            if (c.id !== id) return c;
            const has = c.conditions.includes(condition);
            return {
              ...c,
              conditions: has
                ? c.conditions.filter((cond) => cond !== condition)
                : [...c.conditions, condition],
            };
          }),
        }));

        convexClient.mutation(api.session.toggleCondition, { id, condition }).catch(() => {});
      },

      nextCombatTurn: () => {
        set((state) => {
          if (state.combatants.length === 0) return state;
          const nextIdx = (state.activeCombatTurnIndex + 1) % state.combatants.length;
          return {
            activeCombatTurnIndex: nextIdx,
            combatRound: nextIdx === 0 ? state.combatRound + 1 : state.combatRound,
          };
        });

        convexClient
          .mutation(api.session.nextTurn, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      rollAllInitiatives: () => {
        set((state) => {
          const rerolled = state.combatants
            .map((c) => ({
              ...c,
              initiative: Math.floor(Math.random() * 20) + 1 + (c.type === 'pc' ? 3 : 2),
            }))
            .sort((a, b) => b.initiative - a.initiative);
          return {
            combatants: rerolled,
            activeCombatTurnIndex: 0,
            combatRound: 1,
          };
        });

        convexClient
          .mutation(api.session.rollAllInitiatives, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});

        get().showToast('Iniciativas roladas e sincronizadas para toda a mesa!');
      },

      addCombatant: (c) => {
        const tempId = `comb-${Date.now()}`;
        set((state) => ({
          combatants: [...state.combatants, { ...c, id: tempId }].sort(
            (a, b) => b.initiative - a.initiative
          ),
        }));

        convexClient
          .mutation(api.session.addCombatant, {
            campaignId: get().activeCampaignId,
            name: c.name,
            type: c.type,
            initiative: c.initiative,
            hp: c.hp,
            maxHp: c.maxHp,
            armorClass: c.armorClass,
            conditions: c.conditions,
            notes: c.notes,
            entityId: c.entityId,
          })
          .catch(() => {});
      },

      removeCombatant: (id) => {
        set((state) => ({
          combatants: state.combatants.filter((c) => c.id !== id),
          activeCombatTurnIndex: 0,
        }));

        convexClient.mutation(api.session.removeCombatant, { id }).catch(() => {});
      },

      clearCombatants: () => {
        set({
          combatants: [],
          activeCombatTurnIndex: 0,
          combatRound: 1,
        });

        convexClient
          .mutation(api.session.clearCombatants, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
        get().showToast('Encontro de combate limpo.');
      },

      rollDice: (sides, count = 1, modifier = 0, label = 'Rolagem Rápida') => {
        const rolls: number[] = [];
        for (let i = 0; i < count; i++) {
          rolls.push(Math.floor(Math.random() * sides) + 1);
        }
        const sum = rolls.reduce((acc, n) => acc + n, 0);
        const total = sum + modifier;
        const modStr =
          modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : '';

        const entry: DiceRollLog = {
          id: `roll-${Date.now()}-${Math.random()}`,
          rollerName: get().currentUser?.name || 'Aventureiro',
          formula: `${count}d${sides}${modStr}`,
          rolls,
          modifier,
          total,
          label,
          timestamp: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          isCrit: sides === 20 && rolls.includes(20),
          isFumble: sides === 20 && rolls.includes(1) && !rolls.includes(20),
        };

        set((state) => ({
          diceLogs: [entry, ...state.diceLogs.slice(0, 29)],
        }));

        if (get().activeCampaignId) {
          convexClient
            .mutation(api.session.addDiceRoll, {
              campaignId: get().activeCampaignId,
              rollerName: entry.rollerName,
              formula: entry.formula,
              rolls: entry.rolls,
              modifier: entry.modifier,
              total: entry.total,
              label: entry.label,
              timestamp: entry.timestamp,
              isCrit: entry.isCrit,
              isFumble: entry.isFumble,
            })
            .catch(() => {});
        }

        return entry;
      },

      clearDiceLogs: () => {
        set({ diceLogs: [] });
        if (get().activeCampaignId) {
          convexClient
            .mutation(api.session.clearDiceRolls, {
              campaignId: get().activeCampaignId,
            })
            .catch(() => {});
        }
      },

      // ======================================================================
      // PORTAL, QUESTS, COLLECTIVE/PERSONAL JOURNALS & STRONGHOLD
      // ======================================================================
      toggleQuestObjective: (questId, objectiveId) => {
        set((state) => ({
          quests: state.quests.map((q) =>
            q.id === questId
              ? {
                  ...q,
                  objectives: q.objectives.map((o) =>
                    o.id === objectiveId ? { ...o, completed: !o.completed } : o
                  ),
                }
              : q
          ),
        }));

        convexClient.mutation(api.portal.toggleObjective, { questId, objectiveId }).catch(() => {});
      },

      updateQuestStatus: (questId, status) => {
        set((state) => ({
          quests: state.quests.map((q) =>
            q.id === questId ? { ...q, status } : q
          ),
        }));

        convexClient
          .mutation(api.portal.updateQuestStatus, {
            questId,
            status,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
      },

      addQuest: (q) => {
        const tempId = `quest-${Date.now()}`;
        set((state) => ({
          quests: [{ ...q, id: tempId }, ...state.quests],
        }));

        convexClient
          .mutation(api.portal.createQuest, {
            campaignId: get().activeCampaignId,
            sessionToken: get().sessionToken || undefined,
            title: q.title,
            subtitle: q.subtitle,
            giverHandle: q.giverHandle,
            locationHandle: q.locationHandle,
            status: q.status,
            isPublic: Boolean(q.isPublic),
            description: q.description,
            gmSecretNote: q.gmSecretNote,
            reward: q.reward,
            objectives: q.objectives,
          })
          .catch(() => {});

        get().showToast(`Missão "${q.title}" adicionada ao Mural!`);
      },

      deleteQuest: (questId) => {
        set((state) => ({
          quests: state.quests.filter((q) => q.id !== questId),
        }));

        convexClient
          .mutation(api.portal.removeQuest, {
            questId,
            sessionToken: get().sessionToken || undefined,
          })
          .catch(() => {});
        get().showToast('Missão removida do mural.');
      },

      addJournalEntry: (entry) => {
        const tempId = `jour-${Date.now()}`;
        set((state) => ({
          journal: [{ ...entry, id: tempId }, ...state.journal],
        }));

        convexClient
          .mutation(api.portal.addJournal, {
            campaignId: get().activeCampaignId,
            sessionNumber: entry.sessionNumber,
            title: entry.title,
            inGameDate: entry.inGameDate,
            author: entry.author,
            content: entry.content,
            isPublic: Boolean(entry.isPublic),
          })
          .catch(() => {});

        get().showToast(`Crônica da Sessão #${entry.sessionNumber} salva no Diário Coletivo!`);
      },

      updateJournalEntry: (id, updates) => {
        set((state) => ({
          journal: state.journal.map((j) => (j.id === id ? { ...j, ...updates } : j)),
        }));

        convexClient
          .mutation(api.portal.updateJournal, {
            journalId: id,
            title: updates.title,
            content: updates.content,
            isPublic: updates.isPublic,
          })
          .catch(() => {});

        get().showToast('Crônica atualizada no Diário Coletivo!');
      },

      deleteJournalEntry: (journalId) => {
        set((state) => ({
          journal: state.journal.filter((j) => j.id !== journalId),
        }));

        convexClient.mutation(api.portal.removeJournal, { journalId }).catch(() => {});
        get().showToast('Crônica removida do diário.');
      },

      addPersonalJournalNote: (note) => {
        const tempId = `pnote-${Date.now()}`;
        const newNote: PersonalJournalNote = {
          ...note,
          playerId: note.playerId || get().currentUser?.id || '',
          id: tempId,
          updatedAt: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        set((state) => ({
          personalJournalNotes: [newNote, ...state.personalJournalNotes],
        }));

        convexClient
          .mutation(api.portal.addPersonalNote, {
            campaignId: get().activeCampaignId,
            playerId: newNote.playerId,
            playerName: newNote.playerName,
            characterName: newNote.characterName,
            title: newNote.title,
            content: newNote.content,
            category: newNote.category,
            sharedWithDm: Boolean(newNote.sharedWithDm),
          })
          .then((cloudId) => {
            if (cloudId) {
              set((s) => ({
                personalJournalNotes: s.personalJournalNotes.map((n) =>
                  n.id === tempId ? { ...n, id: cloudId } : n
                ),
              }));
            }
          })
          .catch(() => {});

        get().showToast('Anotação sincronizada no Diário Pessoal!');
      },

      updatePersonalJournalNote: (id, updates) => {
        set((state) => ({
          personalJournalNotes: state.personalJournalNotes.map((n) =>
            n.id === id ? { ...n, ...updates, updatedAt: 'Editado agora' } : n
          ),
        }));

        convexClient
          .mutation(api.portal.updatePersonalNote, {
            id,
            title: updates.title,
            content: updates.content,
            category: updates.category,
            sharedWithDm: updates.sharedWithDm,
          })
          .catch(() => {});

        get().showToast('Nota pessoal atualizada.');
      },

      deletePersonalJournalNote: (id) => {
        set((state) => ({
          personalJournalNotes: state.personalJournalNotes.filter((n) => n.id !== id),
        }));

        convexClient.mutation(api.portal.removePersonalNote, { id }).catch(() => {});
        get().showToast('Nota pessoal excluída.');
      },

      togglePersonalNoteDmAccess: (id) => {
        const target = get().personalJournalNotes.find((n) => n.id === id);
        const nextShared = target ? !target.sharedWithDm : true;
        set((state) => ({
          personalJournalNotes: state.personalJournalNotes.map((n) =>
            n.id === id ? { ...n, sharedWithDm: nextShared } : n
          ),
        }));

        convexClient
          .mutation(api.portal.updatePersonalNote, {
            id,
            sharedWithDm: nextShared,
          })
          .catch(() => {});

        get().showToast('Permissão de leitura do Mestre atualizada para esta nota!');
      },

      adjustPartyCurrency: (type, delta) => {
        set((state) => ({
          partyResources: {
            ...state.partyResources,
            [type]: Math.max(0, state.partyResources[type] + delta),
          },
        }));

        convexClient
          .mutation(api.portal.updateCurrency, {
            campaignId: get().activeCampaignId,
            field: type,
            delta,
          })
          .catch(() => {});
      },

      addPartyInventoryItem: (name, quantity, holder, category, notes) => {
        const tempId = `pitem-${Date.now()}`;
        set((state) => ({
          partyResources: {
            ...state.partyResources,
            items: [
              ...state.partyResources.items,
              { id: tempId, name, quantity, holder, category, notes },
            ],
          },
        }));

        convexClient
          .mutation(api.portal.addInventoryItem, {
            campaignId: get().activeCampaignId,
            name,
            quantity,
            holder,
            category,
            notes,
          })
          .catch(() => {});
      },

      removePartyInventoryItem: (id) => {
        set((state) => ({
          partyResources: {
            ...state.partyResources,
            items: state.partyResources.items.filter((i) => i.id !== id),
          },
        }));

        convexClient
          .mutation(api.portal.removeInventoryItem, {
            campaignId: get().activeCampaignId,
            itemId: id,
          })
          .catch(() => {});
      },

      toggleStrongholdUpgrade: (upgradeId) => {
        set((state) => ({
          partyResources: {
            ...state.partyResources,
            stronghold: {
              ...state.partyResources.stronghold,
              upgrades: state.partyResources.stronghold.upgrades.map((u) =>
                u.id === upgradeId ? { ...u, installed: !u.installed } : u
              ),
            },
          },
        }));

        convexClient
          .mutation(api.portal.toggleStrongholdUpgrade, {
            campaignId: get().activeCampaignId,
            upgradeId,
          })
          .catch(() => {});
      },

      updateStronghold: (updates) => {
        set((state) => ({
          partyResources: {
            ...state.partyResources,
            stronghold: {
              ...state.partyResources.stronghold,
              ...updates,
            },
          },
        }));

        convexClient
          .mutation(api.portal.updateStronghold, {
            campaignId: get().activeCampaignId,
            ...updates,
          })
          .catch(() => {});

        get().showToast('Base do grupo atualizada!');
      },

      addStrongholdUpgrade: (name, cost, benefit) => {
        const tempId = `upg-${Date.now()}`;
        set((state) => ({
          partyResources: {
            ...state.partyResources,
            stronghold: {
              ...state.partyResources.stronghold,
              upgrades: [
                ...state.partyResources.stronghold.upgrades,
                { id: tempId, name, cost, benefit, installed: false },
              ],
            },
          },
        }));

        convexClient
          .mutation(api.portal.addStrongholdUpgrade, {
            campaignId: get().activeCampaignId,
            name,
            cost,
            benefit,
          })
          .catch(() => {});

        get().showToast(`Melhoria "${name}" adicionada à Base!`);
      },

      removeStrongholdUpgrade: (upgradeId) => {
        set((state) => ({
          partyResources: {
            ...state.partyResources,
            stronghold: {
              ...state.partyResources.stronghold,
              upgrades: state.partyResources.stronghold.upgrades.filter((u) => u.id !== upgradeId),
            },
          },
        }));

        convexClient
          .mutation(api.portal.removeStrongholdUpgrade, {
            campaignId: get().activeCampaignId,
            upgradeId,
          })
          .catch(() => {});
      },
    }),
    {
      name: 'obsidian-codex-prod-v1',
      storage: createJSONStorage(() => quotaSafeLocalStorage),
      partialize: (state) => ({
        sessionToken: state.sessionToken,
        currentUser: state.currentUser,
        workspaceMode: state.workspaceMode,
        activeCampaignId: state.activeCampaignId,
        activeCharacterId: state.activeCharacterId,
        geminiApiKey: state.geminiApiKey,
      }),
    }
  )
);
