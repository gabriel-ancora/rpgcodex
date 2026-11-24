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
import { sheetContentPayload } from '../utils/sheetPayload';
import { soundEngine } from '../utils/audioEngine';
import type { CodexBackupPayload } from '../utils/campaignBackup';
import { runCampaignImport, ImportReport, describeImportReport } from './campaignImport';
import {
  bindToast,
  clearCreationTracking,
  discardPendingWrites,
  draftKey,
  enqueue,
  flushPendingWrites,
  isPendingCreation,
  isTempId,
  pendingCreations,
  resolveId,
  resolveIds,
  resolveOptionalId,
  runMutation,
  scheduleWrite,
  tempId,
  ToastVariant,
  trackCreation,
} from './mutations';
import {
  calendarBody,
  combatantCreateBody,
  entityCreateBody,
  entityUpdateBody,
  eventCreateBody,
  eventUpdateBody,
  frontCreateBody,
  frontUpdateBody,
  journalCreateBody,
  manualNodeBody,
  mapCreateBody,
  mentionPrefixFor,
  pinCreateBody,
  pinUpdateBody,
  questCreateBody,
  relationshipCreateBody,
  sceneCreateBody,
  shapesBody,
  slugHandle,
} from './payloads';

// ===========================================================================
// Armazenamento local (apenas sessão e preferências; nunca chaves de API)
// ===========================================================================

const STORAGE_KEY = 'codex-v1';
const GEMINI_SESSION_KEY = 'codex-gemini-session';

// A chave antiga guardava a chave da API Gemini em texto puro: removida uma vez, sem migração.
try {
  localStorage.removeItem('obsidian-codex-prod-v1');
} catch {
  // armazenamento indisponível
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
      console.warn('Quota do armazenamento local atingida:', err);
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

function readSessionGeminiKey(): string {
  try {
    return sessionStorage.getItem(GEMINI_SESSION_KEY) || '';
  } catch {
    return '';
  }
}

function writeSessionGeminiKey(key: string | null) {
  try {
    if (key) sessionStorage.setItem(GEMINI_SESSION_KEY, key);
    else sessionStorage.removeItem(GEMINI_SESSION_KEY);
  } catch {
    // ignore
  }
}

// ===========================================================================
// Tipos públicos
// ===========================================================================

export type WorldSubTab = 'wiki' | 'graph' | 'maps' | 'timeline';
export type PlotSubTab = 'fronts' | 'flowchart' | 'generators';
export type PortalSubTab = 'secrets' | 'quests' | 'journal';

export interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
  shownAt: number;
}

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
    name: '',
    type: '',
    locationHandle: '',
    integrity: 100,
    maxIntegrity: 100,
    upkeepPerMonth: '',
    description: '',
    upgrades: [],
  },
};

export type NewCampaignInput = Pick<
  CampaignSummary,
  'title' | 'synopsis' | 'system' | 'tone' | 'coverUrl'
> & { worldContext?: string; coverStorageId?: string };

export type CampaignUpdates = Partial<
  Pick<
    CampaignSummary,
    'title' | 'synopsis' | 'worldContext' | 'system' | 'tone' | 'coverUrl' | 'coverStorageId' | 'sessionsPlayed'
  >
> & { clearCoverImage?: boolean };

type Ok = Promise<boolean>;

interface CampaignState {
  // Rotas e autenticação
  currentRoute: AppRoute;
  currentUser: AuthUser | null;
  sessionToken: string | null;
  campaigns: CampaignSummary[];
  /** false até a primeira resposta de `campaign.list` depois do login. */
  campaignsLoaded: boolean;
  activeCampaignId: string;

  // Papel: a única fonte de verdade é `campaigns[active].isDm`. Ver `useIsDm`.
  /** Pré-visualização do Mestre como jogador. Zera ao trocar de campanha e no logout. */
  previewAsPlayer: boolean;
  /** @deprecated Espelho derivado de `useIsDm()` ('gm' | 'player'). Não escreva; use `useIsDm()`. */
  viewRole: ViewRole;

  // Modais e configurações
  /** Chave Gemini: só em memória (ou sessionStorage se `rememberGeminiKey`). Nunca persistida. */
  geminiApiKey: string;
  rememberGeminiKey: boolean;
  isSettingsModalOpen: boolean;
  isDmPartyDrawerOpen: boolean;
  inspectingCharacterId: string | null;

  // Fichas (D&D 5e)
  characterSheets: CharacterSheet[];
  activeCharacterId: string;

  // Navegação
  activeModule: ActiveModule;
  worldSubTab: WorldSubTab;
  plotSubTab: PlotSubTab;
  portalSubTab: PortalSubTab;
  selectedEntityId: string;
  quickInspectEntityId: string | null;
  selectedMapId: string;
  focusMapPin: { mapId: string; pinId: string } | null;
  toast: ToastState | null;

  // Mundo
  entities: Entity[];
  relationships: RelationshipEdge[];
  graphPositions: GraphNodePosition[];
  manualGraphNodes: ManualGraphNode[];
  maps: CampaignMap[];
  calendar: CalendarConfig;
  timeline: TimelineEvent[];

  // Tramas
  fronts: ThreatFront[];
  mysteryNodes: MysterySceneNode[];
  recentGeneratedItems: GeneratedEmergencyItem[];

  // Sessão
  scratchpad: ScratchpadLine[];
  combatants: Combatant[];
  /** Índice do turno ativo na lista que ESTE usuário recebe (-1 se o combatente ativo está oculto). */
  activeCombatTurnIndex: number;
  activeCombatantId: string | null;
  combatRound: number;
  diceLogs: DiceRollLog[];
  isRollingDice: boolean;

  // Portal
  quests: Quest[];
  journal: SessionJournalEntry[];
  personalJournalNotes: PersonalJournalNote[];
  partyResources: PartyResources;

  // ---- Autenticação, navegação e campanhas ----
  setCurrentRoute: (route: AppRoute) => void;
  registerAccount: (name: string, email: string, password: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logoutUser: () => void;
  /** Encerra a sessão localmente (token expirado/inválido), sem chamar o servidor. */
  expireSession: () => void;
  createCampaign: (camp: NewCampaignInput) => Promise<CampaignSummary | null>;
  updateCampaign: (campaignId: string, updates: CampaignUpdates) => Ok;
  deleteCampaign: (campaignId: string) => Ok;
  leaveCampaign: (campaignId: string) => Ok;
  /** Abre a campanha. Padrão: Mestre -> /campaign/session; jogador -> /campaign/player-view. */
  selectCampaign: (campaignId: string, targetRoute?: AppRoute) => void;
  /** Troca a campanha ativa (limpa todo o estado da campanha anterior). '' = nenhuma. */
  setActiveCampaign: (campaignId: string) => void;
  /** Limpa todo o estado vinculado à campanha ativa. Chamado em toda troca/saída de campanha. */
  resetCampaignScope: () => void;
  joinCampaignByInviteCode: (code: string) => Promise<boolean>;
  importCampaignBackup: (backup: CodexBackupPayload) => Promise<ImportReport | null>;

  // ---- Configurações ----
  setGeminiApiKey: (key: string, remember?: boolean) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
  setIsDmPartyDrawerOpen: (open: boolean, characterId?: string | null) => void;

  // ---- Fichas ----
  setActiveCharacterId: (id: string) => void;
  /** Cria a ficha no servidor. Resolve com o id definitivo, ou null se falhar. */
  createCharacterSheet: (sheet: Omit<CharacterSheet, 'id' | 'updatedAt'>) => Promise<string | null>;
  /** Atualiza a ficha. Resolve true se o servidor confirmou a gravação. */
  updateCharacterSheet: (id: string, updates: Partial<CharacterSheet>) => Promise<boolean>;
  deleteCharacterSheet: (id: string) => Promise<void>;

  // ---- Global ----
  setActiveModule: (mod: ActiveModule) => void;
  setWorldSubTab: (tab: WorldSubTab) => void;
  setPlotSubTab: (tab: PlotSubTab) => void;
  setPortalSubTab: (tab: PortalSubTab) => void;
  /** Liga/desliga "Visão do jogador" (só tem efeito para o Mestre da campanha ativa). Não navega. */
  setPreviewAsPlayer: (on: boolean) => void;
  /** @deprecated Atalho para `setPreviewAsPlayer(role === 'player')`. */
  setViewRole: (role: ViewRole) => void;
  setSelectedEntityId: (id: string) => void;
  setQuickInspectEntityId: (id: string | null) => void;
  navigateToHandle: (handleWithOrWithoutPrefix: string) => void;
  showToast: (msg: string, variant?: ToastVariant) => void;
  dismissToast: () => void;
  /** Grava agora os rascunhos pendentes (prefixo de `draftKey`, ou todos). */
  commitDrafts: (prefix?: string) => Promise<void>;

  // ---- Entradas do códice ----
  /** Resolve com a entrada (já com o id definitivo) ou null se o servidor recusou. */
  addEntity: (
    partial: Partial<Entity> & { name: string; category: EntityCategory }
  ) => Promise<Entity | null>;
  /** Campos de texto (name, subtitle, summary, publicContent) são gravados com debounce. */
  updateEntity: (id: string, updates: Partial<Entity>) => Ok;
  deleteEntity: (id: string) => Ok;
  togglePinEntity: (id: string) => Ok;
  revealEntitySecret: (entityId: string, secretId: string, reveal?: boolean) => Ok;
  addEntitySecret: (entityId: string, title: string, content: string) => Ok;
  deleteEntitySecret: (entityId: string, secretId: string) => Ok;
  addEntityAttribute: (entityId: string, label: string, value: string) => Ok;
  /** Gravado com debounce. */
  updateEntityAttribute: (entityId: string, attrId: string, value: string | number) => Ok;
  deleteEntityAttribute: (entityId: string, attrId: string) => Ok;

  // ---- Grafo ----
  /** `persist: false` atualiza só a tela (use durante o arraste) e `commitGraphNodePosition` grava. */
  updateGraphNodePosition: (entityId: string, x: number, y: number, opts?: { persist?: boolean }) => void;
  commitGraphNodePosition: (entityId: string) => Promise<void>;
  addManualGraphNode: (node: Omit<ManualGraphNode, 'id'>) => Promise<string | null>;
  deleteManualGraphNode: (id: string) => Ok;
  addRelationship: (edge: Omit<RelationshipEdge, 'id'>) => Promise<string | null>;
  updateRelationshipLabel: (id: string, label: string, type?: RelationshipEdge['type']) => Ok;
  deleteRelationship: (id: string) => Ok;
  toggleRevealRelationship: (id: string) => Ok;

  // ---- Mapas ----
  navigateToMapPin: (mapId: string, pinId: string) => void;
  clearFocusMapPin: () => void;
  setSelectedMapId: (id: string) => void;
  /** Resolve com o id definitivo do mapa ou null. */
  addMap: (
    name: string,
    subtitle: string,
    customImageUrl: string,
    regionType?: CampaignMap['regionType'],
    storageId?: Id<'_storage'>
  ) => Promise<string | null>;
  deleteMap: (id: string) => Ok;
  /** Resolve com o id definitivo do marcador ou null. */
  addMapPin: (mapId: string, pin: Omit<MapPin, 'id'>) => Promise<string | null>;
  updateMapPin: (mapId: string, pinId: string, updates: Partial<MapPin>) => Ok;
  deleteMapPin: (mapId: string, pinId: string) => Ok;
  toggleRevealMapPin: (mapId: string, pinId: string) => Ok;
  addMapShape: (mapId: string, shape: Omit<MapDrawingShape, 'id'>) => Ok;
  updateMapShape: (mapId: string, shapeId: string, updates: Partial<MapDrawingShape>) => Ok;
  deleteMapShape: (mapId: string, shapeId: string) => Ok;

  // ---- Calendário e cronologia ----
  advanceCalendarDays: (days: number) => Ok;
  /** Gravado com debounce. */
  updateCalendarConfig: (updates: Partial<CalendarConfig>) => Ok;
  addTimelineEvent: (ev: Omit<TimelineEvent, 'id'>) => Promise<string | null>;
  /** title/description são gravados com debounce. */
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => Ok;
  reorderTimelineEvents: (draggedId: string, targetId: string) => Ok;
  toggleRevealTimelineEvent: (id: string) => Ok;
  deleteTimelineEvent: (id: string) => Ok;

  // ---- Frentes e relógios ----
  setFrontClockValue: (frontId: string, filled: number) => Ok;
  advanceIgnoredFronts: () => Ok;
  toggleFrontPortent: (frontId: string, portentId: string) => Ok;
  addThreatFront: (front: Omit<ThreatFront, 'id'>) => Promise<string | null>;
  updateThreatFront: (frontId: string, updates: Partial<ThreatFront>) => Ok;
  deleteThreatFront: (frontId: string) => Ok;

  // ---- Cenas e pistas ----
  /** `persist: false` atualiza só a tela (arraste); `commitMysteryNodePosition` grava. */
  updateMysteryNodePosition: (nodeId: string, x: number, y: number, opts?: { persist?: boolean }) => void;
  commitMysteryNodePosition: (nodeId: string) => Promise<void>;
  updateMysteryNodeStatus: (nodeId: string, status: MysterySceneNode['status']) => Ok;
  toggleMysteryClue: (nodeId: string, clueId: string) => Ok;
  addMysteryNode: (title: string, subtitle: string, locationHandle: string, description: string) => Promise<string | null>;
  addMysteryClue: (
    nodeId: string,
    name: string,
    description: string,
    targetSceneId: string,
    type: 'social' | 'investigation' | 'occult' | 'physical'
  ) => Ok;
  deleteMysteryNode: (nodeId: string) => Ok;

  // ---- Geradores ----
  recordGeneratedItem: (item: GeneratedEmergencyItem) => void;
  removeGeneratedItem: (id: string) => void;
  clearGeneratedItems: () => void;
  /** Cria a entrada OCULTA dos jogadores. Segredos viram segredos; o resumo nunca vem de um segredo. */
  saveGeneratedItemToDatabase: (item: GeneratedEmergencyItem, pinToSession?: boolean) => Promise<Entity | null>;

  // ---- Sessão ----
  addScratchpadLine: (text: string) => Ok;
  deleteScratchpadLine: (id: string) => Ok;
  convertScratchpadLineToEntity: (lineId: string, category: EntityCategory) => Ok;
  adjustCombatantHp: (id: string, delta: number) => Ok;
  toggleCombatantCondition: (id: string, condition: string) => Ok;
  /** Oculta/revela o combatente para os jogadores. */
  setCombatantHidden: (id: string, hidden: boolean) => Ok;
  /** O turno e a rodada vêm do servidor (sem previsão local). */
  nextCombatTurn: () => Ok;
  /** Rolada no servidor para todos; a ordem nova chega pela sincronização. */
  rollAllInitiatives: () => Ok;
  addCombatant: (c: Omit<Combatant, 'id'>) => Promise<string | null>;
  removeCombatant: (id: string) => Ok;
  /** Disponível, ainda sem uso na interface. */
  clearCombatants: () => Ok;
  /** O resultado é do servidor. Resolve com a rolagem salva ou null. */
  rollDice: (sides: number, count?: number, modifier?: number, label?: string) => Promise<DiceRollLog | null>;
  /** Disponível, ainda sem uso na interface. */
  clearDiceLogs: () => Ok;

  // ---- Portal ----
  toggleQuestObjective: (questId: string, objectiveId: string) => Ok;
  updateQuestStatus: (questId: string, status: Quest['status']) => Ok;
  addQuest: (q: Omit<Quest, 'id'>) => Promise<string | null>;
  /** Disponível, ainda sem uso na interface. */
  deleteQuest: (questId: string) => Ok;
  addJournalEntry: (entry: Omit<SessionJournalEntry, 'id'>) => Promise<string | null>;
  /** Disponível, ainda sem uso na interface. title/content com debounce. */
  updateJournalEntry: (id: string, updates: Partial<SessionJournalEntry>) => Ok;
  deleteJournalEntry: (journalId: string) => Ok;
  addPersonalJournalNote: (note: Omit<PersonalJournalNote, 'id' | 'updatedAt'>) => Promise<string | null>;
  /** Disponível, ainda sem uso na interface. title/content com debounce. */
  updatePersonalJournalNote: (id: string, updates: Partial<PersonalJournalNote>) => Ok;
  deletePersonalJournalNote: (id: string) => Ok;
  togglePersonalNoteDmAccess: (id: string) => Ok;
  adjustPartyCurrency: (type: 'gold' | 'silver' | 'copper' | 'rations' | 'torches' | 'healerKits', delta: number) => Ok;
  addPartyInventoryItem: (
    name: string,
    quantity: number,
    holder: string,
    category: PartyResources['items'][0]['category'],
    notes: string
  ) => Ok;
  removePartyInventoryItem: (id: string) => Ok;
  toggleStrongholdUpgrade: (upgradeId: string) => Ok;
  /** Gravado com debounce. */
  updateStronghold: (updates: Partial<Omit<PartyResources['stronghold'], 'upgrades'>>) => Ok;
  addStrongholdUpgrade: (name: string, cost: string, benefit: string) => Ok;
  removeStrongholdUpgrade: (upgradeId: string) => Ok;
}

// ===========================================================================
// Rotas
// ===========================================================================

const ROUTE_ALIASES: Record<string, AppRoute> = {
  '/': '/campaigns',
  '/login': '/login',
  '/campaigns': '/campaigns',
  '/dm-dashboard': '/campaigns',
  '/player-dashboard': '/campaigns',
  '/campaign/session': '/campaign/session',
  '/campaign/player-view': '/campaign/player-view',
};

/** Converte um caminho de URL (inclusive os antigos) em rota válida, ou null. */
export function parseRoute(pathname: string): AppRoute | null {
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  return ROUTE_ALIASES[clean] ?? null;
}

function pushUrl(route: AppRoute) {
  try {
    if (window.location.pathname !== route) window.history.pushState({}, '', route);
  } catch {
    // iframe restrito
  }
}

// ===========================================================================
// Estado vinculado à campanha
// ===========================================================================

const getEmptyCampaignScopedState = () => ({
  selectedEntityId: '',
  quickInspectEntityId: null as string | null,
  selectedMapId: '',
  focusMapPin: null as { mapId: string; pinId: string } | null,
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
  activeCombatantId: null as string | null,
  combatRound: 1,
  diceLogs: [] as DiceRollLog[],
  isRollingDice: false,
  quests: [] as Quest[],
  journal: [] as SessionJournalEntry[],
  personalJournalNotes: [] as PersonalJournalNote[],
  partyResources: DEFAULT_PARTY_RESOURCES,
  previewAsPlayer: false,
});

const getEmptyAuthState = () => ({
  currentUser: null as AuthUser | null,
  sessionToken: null as string | null,
  campaigns: [] as CampaignSummary[],
  campaignsLoaded: false,
  activeCampaignId: '',
  characterSheets: [] as CharacterSheet[],
  activeCharacterId: '',
  inspectingCharacterId: null as string | null,
  isDmPartyDrawerOpen: false,
  isSettingsModalOpen: false,
  geminiApiKey: '',
  rememberGeminiKey: false,
  ...getEmptyCampaignScopedState(),
});

/** Fatias da store em que um id temporário pode aparecer. */
const ID_SLICES = [
  'entities',
  'relationships',
  'graphPositions',
  'manualGraphNodes',
  'maps',
  'timeline',
  'fronts',
  'mysteryNodes',
  'scratchpad',
  'combatants',
  'quests',
  'journal',
  'personalJournalNotes',
  'partyResources',
  'characterSheets',
] as const;

const ID_SCALARS = [
  'selectedEntityId',
  'selectedMapId',
  'quickInspectEntityId',
  'activeCharacterId',
  'inspectingCharacterId',
  'activeCombatantId',
] as const;

/** Troca, em qualquer profundidade, as strings iguais a `from` por `to` (preserva referências se nada mudou). */
function replaceDeep<T>(value: T, from: string, to: string): T {
  if (typeof value === 'string') return (value === from ? (to as unknown as T) : value);
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const r = replaceDeep(item, from, to);
      if (r !== item) changed = true;
      return r;
    });
    return changed ? (next as unknown as T) : value;
  }
  if (value && typeof value === 'object') {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const r = replaceDeep(v, from, to);
      if (r !== v) changed = true;
      out[k] = r;
    }
    return changed ? (out as T) : value;
  }
  return value;
}

const TEXT_ENTITY_KEYS: (keyof Entity)[] = ['name', 'subtitle', 'summary', 'publicContent'];

function uniqueHandle(base: string, existing: Entity[]): string {
  const taken = new Set(existing.map((e) => e.handle.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base}${n}`.toLowerCase())) n += 1;
  return `${base}${n}`;
}

// ===========================================================================
// Alterações locais recentes na lista de campanhas
// ===========================================================================

/**
 * Uma emissão atrasada de `campaign.list` pode chegar depois de criarmos/excluirmos uma campanha
 * localmente. Por alguns segundos, a lista do servidor é conciliada com essas alterações.
 */
const RECENT_CAMPAIGN_MS = 8000;
const recentAdded = new Map<string, number>();
const recentRemoved = new Map<string, number>();
const isFresh = (m: Map<string, number>, id: string) => (m.get(id) ?? 0) > Date.now() - RECENT_CAMPAIGN_MS;

export function reconcileCampaignList(server: CampaignSummary[], local: CampaignSummary[]): CampaignSummary[] {
  const out = server.filter((c) => !isFresh(recentRemoved, c.id));
  for (const c of local) {
    if (isFresh(recentAdded, c.id) && !out.some((o) => o.id === c.id)) out.push(c);
  }
  return out;
}

// ===========================================================================
// Seletores e hooks de papel
// ===========================================================================

export const selectActiveCampaign = (s: CampaignState): CampaignSummary | undefined =>
  s.campaigns.find((c) => c.id === s.activeCampaignId);

/** Papel real do usuário na campanha ativa (ignora a pré-visualização). */
export const selectIsCampaignDm = (s: CampaignState): boolean => selectActiveCampaign(s)?.isDm === true;

/** Verdadeiro só se o usuário é Mestre da campanha ativa E não está pré-visualizando como jogador. */
export const selectIsDm = (s: CampaignState): boolean => selectIsCampaignDm(s) && !s.previewAsPlayer;

// ===========================================================================
// Store
// ===========================================================================

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => {
      // ---------- utilitários internos ----------

      /** Credenciais do momento da chamada (capturar ANTES de qualquer await). */
      const sess = () => ({
        sessionToken: get().sessionToken ?? '',
        campaignId: get().activeCampaignId,
      });

      /** Restaura fatias da store ao estado anterior (usado como rollback). */
      const snap = <K extends keyof CampaignState>(...keys: K[]) => {
        const st = get();
        const saved: Record<string, unknown> = {};
        for (const k of keys) saved[k as string] = st[k];
        return () => set(saved as Partial<CampaignState>);
      };

      /** Troca todas as referências de um id temporário pelo definitivo. */
      const swapId = (from: string, to: string) => {
        set((s) => {
          const patch: Record<string, unknown> = {};
          for (const key of ID_SLICES) {
            const next = replaceDeep(s[key], from, to);
            if (next !== s[key]) patch[key] = next;
          }
          for (const key of ID_SCALARS) {
            if (s[key] === from) patch[key] = to;
          }
          return patch as Partial<CampaignState>;
        });
      };

      /**
       * Fluxo padrão de criação: a UI já exibe o item com `temp`; aguarda o servidor,
       * troca o id e devolve o id definitivo (null se falhou, com rollback e toast).
       */
      const commitCreate = async (
        temp: string,
        label: string,
        rollback: () => void,
        create: () => Promise<string>,
        success?: string
      ): Promise<string | null> => {
        const task = runMutation(label, rollback, create, { success });
        trackCreation(
          temp,
          task.then((r) => (r.ok ? r.value : null))
        );
        const result = await task;
        if (!result.ok) return null;
        swapId(temp, result.value);
        return result.value;
      };

      /** Mutação simples (sem criação) com rollback e toast de erro. */
      const mutate = async (
        label: string,
        rollback: (() => void) | undefined,
        fn: () => Promise<unknown>,
        success?: string
      ): Promise<boolean> => (await runMutation(label, rollback, fn, { success })).ok;

      // ---------- toast ----------
      let toastSeq = 0;
      let toastTimer: ReturnType<typeof setTimeout> | undefined;
      const toastQueue: ToastState[] = [];

      const display = (item: ToastState) => {
        if (toastTimer) clearTimeout(toastTimer);
        set({ toast: { ...item, shownAt: Date.now() } });
        toastTimer = setTimeout(() => get().dismissToast(), item.variant === 'error' ? 6500 : 3400);
      };

      // ---------- escopo de campanha ----------
      const resetScope = () => {
        // Rascunhos pendentes são enviados antes (cada um carrega suas credenciais e ids).
        void flushPendingWrites();
        clearCreationTracking();
        set(getEmptyCampaignScopedState());
      };

      const setActive = (campaignId: string) => {
        if (get().activeCampaignId === campaignId) return;
        resetScope();
        set({ activeCampaignId: campaignId });
      };

      const resetEverything = () => {
        void flushPendingWrites();
        discardPendingWrites();
        clearCreationTracking();
        soundEngine.dispose();
        writeSessionGeminiKey(null);
        set({ ...getEmptyAuthState(), currentRoute: '/login', previewAsPlayer: false, viewRole: 'player' });
        pushUrl('/login');
      };

      const applyAuth = (user: AuthUser, token: string) => {
        const prev = get().currentUser;
        if (prev && prev.id !== user.id) {
          void flushPendingWrites();
          discardPendingWrites();
          clearCreationTracking();
        }
        set({
          ...(prev && prev.id === user.id ? {} : getEmptyAuthState()),
          currentUser: user,
          sessionToken: token,
          currentRoute: '/campaigns',
          campaignsLoaded: false,
          geminiApiKey: readSessionGeminiKey(),
          rememberGeminiKey: Boolean(readSessionGeminiKey()),
        });
        pushUrl('/campaigns');
        get().showToast(`Bem-vindo(a), ${user.name}.`);
      };

      const upsertCampaign = (camp: CampaignSummary) => {
        recentAdded.set(camp.id, Date.now());
        recentRemoved.delete(camp.id);
        set((s) => ({ campaigns: [camp, ...s.campaigns.filter((c) => c.id !== camp.id)] }));
      };

      /** Remove a campanha da lista local (exclusão ou saída) e devolve o rollback. */
      const removeCampaignLocally = (campaignId: string) => {
        const wasActive = get().activeCampaignId === campaignId;
        const prevCampaigns = get().campaigns;
        recentRemoved.set(campaignId, Date.now());
        set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== campaignId) }));
        if (wasActive) {
          setActive('');
          if (get().currentRoute !== '/campaigns') get().setCurrentRoute('/campaigns');
        }
        return () => {
          recentRemoved.delete(campaignId);
          set({ campaigns: prevCampaigns });
          if (wasActive) setActive(campaignId);
        };
      };

      return {
        currentRoute: '/login',
        currentUser: null,
        sessionToken: null,
        campaigns: [],
        campaignsLoaded: false,
        activeCampaignId: '',
        viewRole: 'player',

        geminiApiKey: readSessionGeminiKey(),
        rememberGeminiKey: Boolean(readSessionGeminiKey()),
        isSettingsModalOpen: false,
        isDmPartyDrawerOpen: false,
        inspectingCharacterId: null,

        characterSheets: [],
        activeCharacterId: '',

        activeModule: 'worldbuilding',
        worldSubTab: 'wiki',
        plotSubTab: 'fronts',
        portalSubTab: 'secrets',
        toast: null,

        ...getEmptyCampaignScopedState(),

        // ===================================================================
        // AUTENTICAÇÃO, ROTAS E CAMPANHAS
        // ===================================================================
        setCurrentRoute: (route) => {
          const st = get();
          const camp = selectActiveCampaign(st);

          if (route === '/campaign/session' || route === '/campaign/player-view') {
            if (!camp) {
              set({ currentRoute: '/campaigns' });
              pushUrl('/campaigns');
              if (st.campaignsLoaded) st.showToast('Selecione uma campanha primeiro.');
              return;
            }
            if (route === '/campaign/session' && !camp.isDm) {
              set({ currentRoute: '/campaign/player-view' });
              pushUrl('/campaign/player-view');
              st.showToast('Você participa desta campanha como jogador.');
              return;
            }
          }
          set({ currentRoute: route });
          pushUrl(route);
        },

        registerAccount: async (name, email, password) => {
          const res = await convexClient.action(api.auth.register, { name, email, password });
          applyAuth(
            { id: res.user.id, name: res.user.name, email: res.user.email, avatarUrl: res.user.avatarUrl },
            res.token
          );
        },

        loginWithPassword: async (email, password) => {
          const res = await convexClient.action(api.auth.login, { email, password });
          applyAuth(
            { id: res.user.id, name: res.user.name, email: res.user.email, avatarUrl: res.user.avatarUrl },
            res.token
          );
        },

        logoutUser: () => {
          const token = get().sessionToken;
          // Grava rascunhos pendentes com a sessão ainda válida e só então invalida o token.
          void flushPendingWrites().finally(() => {
            if (token) convexClient.mutation(api.auth.logout, { sessionToken: token }).catch(() => {});
          });
          resetEverything();
          get().showToast('Sessão encerrada.');
        },

        expireSession: () => {
          if (!get().sessionToken) return;
          resetEverything();
          get().showToast('Sessão expirada. Entre novamente.', 'error');
        },

        createCampaign: async (camp) => {
          const { sessionToken } = sess();
          const result = await runMutation('criar a campanha', undefined, () =>
            convexClient.mutation(api.campaign.create, {
              sessionToken,
              title: camp.title,
              synopsis: camp.synopsis,
              worldContext: camp.worldContext || '',
              system: camp.system,
              tone: camp.tone,
              coverUrl: camp.coverUrl,
              coverStorageId: camp.coverStorageId ? (camp.coverStorageId as Id<'_storage'>) : undefined,
            })
          );
          if (!result.ok) return null;
          const created = result.value.campaign as CampaignSummary;
          upsertCampaign(created);
          setActive(created.id);
          get().showToast(`Campanha "${created.title}" criada. Código de convite: ${created.inviteCode}`, 'success');
          return created;
        },

        updateCampaign: async (campaignId, updates) => {
          const { sessionToken } = sess();
          const undo = snap('campaigns');
          const { coverStorageId, clearCoverImage, ...rest } = updates;
          set((s) => ({
            campaigns: s.campaigns.map((c) =>
              c.id === campaignId
                ? {
                    ...c,
                    ...rest,
                    ...(clearCoverImage ? { coverUrl: '', coverStorageId: undefined } : {}),
                    ...(coverStorageId !== undefined ? { coverStorageId: coverStorageId || undefined } : {}),
                    updatedAt: new Date().toISOString(),
                  }
                : c
            ),
          }));
          return mutate('atualizar a campanha', undo, () =>
            convexClient.mutation(api.campaign.update, {
              sessionToken,
              campaignId,
              ...rest,
              ...(clearCoverImage ? { clearCoverImage: true } : {}),
              ...(coverStorageId ? { coverStorageId: coverStorageId as Id<'_storage'> } : {}),
            })
          );
        },

        deleteCampaign: async (campaignId) => {
          const { sessionToken } = sess();
          const undo = removeCampaignLocally(campaignId);
          return mutate(
            'excluir a campanha',
            undo,
            () => convexClient.mutation(api.campaign.remove, { sessionToken, campaignId }),
            'Campanha e dados associados excluídos.'
          );
        },

        leaveCampaign: async (campaignId) => {
          const { sessionToken } = sess();
          const undo = removeCampaignLocally(campaignId);
          return mutate(
            'sair da campanha',
            undo,
            () => convexClient.mutation(api.campaign.leave, { sessionToken, campaignId }),
            'Você saiu da campanha.'
          );
        },

        setActiveCampaign: (campaignId) => setActive(campaignId),

        resetCampaignScope: () => resetScope(),

        selectCampaign: (campaignId, targetRoute) => {
          const found = get().campaigns.find((c) => c.id === campaignId);
          const isDm = found?.isDm === true;
          const target: AppRoute = targetRoute ?? (isDm ? '/campaign/session' : '/campaign/player-view');
          setActive(campaignId);
          // O Mestre vê a mesa dos jogadores pela pré-visualização, nunca por outro papel.
          set({
            previewAsPlayer: isDm && target === '/campaign/player-view',
            currentRoute: !isDm && target === '/campaign/session' ? '/campaign/player-view' : target,
          });
          pushUrl(get().currentRoute);
        },

        joinCampaignByInviteCode: async (code) => {
          const clean = code.trim().toUpperCase();
          if (clean.length < 4) {
            get().showToast('Informe um código de convite válido.', 'error');
            return false;
          }
          const { sessionToken } = sess();
          const result = await runMutation('entrar na campanha', undefined, () =>
            convexClient.mutation(api.campaign.joinByInviteCode, { sessionToken, inviteCode: clean })
          );
          if (!result.ok) return false;
          const res = result.value;
          if (res.found && res.campaign) {
            const joined = res.campaign as CampaignSummary;
            upsertCampaign(joined);
            setActive(joined.id);
            get().showToast(`Você ingressou na campanha "${joined.title}".`, 'success');
            return true;
          }
          get().showToast(`Código "${clean}" não encontrado. Confira o código com o Mestre da campanha.`, 'error');
          return false;
        },

        importCampaignBackup: async (backup) => {
          const { sessionToken } = sess();
          if (!sessionToken) {
            get().showToast('Sessão expirada. Entre novamente.', 'error');
            return null;
          }
          const report = await runCampaignImport(backup, sessionToken);
          if (report.campaign) {
            upsertCampaign(report.campaign);
            setActive(report.campaign.id);
          }
          get().showToast(describeImportReport(report), report.campaign && report.failed.length === 0 ? 'success' : 'error');
          return report;
        },

        // ===================================================================
        // CONFIGURAÇÕES
        // ===================================================================
        setGeminiApiKey: (key, remember) => {
          const clean = key.trim();
          const keep = remember ?? get().rememberGeminiKey;
          set({ geminiApiKey: clean, rememberGeminiKey: keep });
          writeSessionGeminiKey(clean && keep ? clean : null);
          get().showToast(
            clean
              ? keep
                ? 'Chave Gemini guardada nesta sessão do navegador.'
                : 'Chave Gemini em uso apenas até fechar ou recarregar a página.'
              : 'Chave Gemini removida.',
            'success'
          );
        },

        setIsSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),

        setIsDmPartyDrawerOpen: (open, characterId = null) =>
          set((state) => ({
            isDmPartyDrawerOpen: open,
            inspectingCharacterId:
              characterId || state.inspectingCharacterId || state.characterSheets[0]?.id || null,
          })),

        // ===================================================================
        // FICHAS D&D 5e
        // ===================================================================
        setActiveCharacterId: (id) => set({ activeCharacterId: id }),

        createCharacterSheet: async (sheetData) => {
          const { sessionToken } = sess();
          const temp = `char-${Date.now()}`;
          const newSheet: CharacterSheet = {
            ...sheetData,
            campaignId: sheetData.campaignId ?? get().activeCampaignId,
            playerId: get().currentUser?.id || sheetData.playerId || '',
            playerName: get().currentUser?.name || sheetData.playerName || 'Jogador',
            id: temp,
            updatedAt: new Date().toISOString(),
          };
          set((state) => ({
            characterSheets: [newSheet, ...state.characterSheets],
            activeCharacterId: newSheet.id,
          }));
          const rollback = () =>
            set((s) => {
              const remaining = s.characterSheets.filter((cs) => cs.id !== temp);
              return {
                characterSheets: remaining,
                activeCharacterId: s.activeCharacterId === temp ? remaining[0]?.id || '' : s.activeCharacterId,
                inspectingCharacterId: s.inspectingCharacterId === temp ? null : s.inspectingCharacterId,
              };
            });
          const realId = await commitCreate(
            temp,
            'salvar a ficha',
            rollback,
            async () =>
              String(
                await convexClient.mutation(api.characters.create, {
                  sessionToken,
                  campaignId: newSheet.campaignId || '',
                  campaignTitle: newSheet.campaignTitle || '',
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...(sheetContentPayload(newSheet) as any),
                })
              ),
            `Ficha de ${newSheet.name} salva.`
          );
          return realId;
        },

        updateCharacterSheet: async (id, updates) => {
          const { sessionToken } = sess();
          const undo = snap('characterSheets');
          set((state) => ({
            characterSheets: state.characterSheets.map((cs) =>
              cs.id === id ? { ...cs, ...updates, updatedAt: new Date().toISOString() } : cs
            ),
          }));
          const { campaignId, campaignTitle: _title, ...rest } = updates;
          return mutate('salvar a alteração da ficha', undo, async () => {
            const sheetId = await resolveId(id);
            await convexClient.mutation(api.characters.update, {
              sessionToken,
              id: sheetId,
              ...(campaignId !== undefined ? { campaignId } : {}),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(sheetContentPayload(rest) as any),
            });
          });
        },

        deleteCharacterSheet: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('characterSheets', 'activeCharacterId');
          set((state) => {
            const remaining = state.characterSheets.filter((cs) => cs.id !== id);
            return {
              characterSheets: remaining,
              activeCharacterId: state.activeCharacterId === id ? remaining[0]?.id || '' : state.activeCharacterId,
            };
          });
          await mutate(
            'remover a ficha',
            undo,
            async () => {
              const sheetId = await resolveId(id);
              await convexClient.mutation(api.characters.remove, { sessionToken, id: sheetId });
            },
            'Ficha removida.'
          );
        },

        // ===================================================================
        // GLOBAL
        // ===================================================================
        setActiveModule: (mod) => set({ activeModule: mod }),
        setWorldSubTab: (tab) => set({ worldSubTab: tab }),
        setPlotSubTab: (tab) => set({ plotSubTab: tab }),
        setPortalSubTab: (tab) => set({ portalSubTab: tab }),

        setPreviewAsPlayer: (on) => {
          if (!selectIsCampaignDm(get())) {
            if (!on) set({ previewAsPlayer: false });
            return;
          }
          set({ previewAsPlayer: on });
        },

        setViewRole: (role) => get().setPreviewAsPlayer(role === 'player'),

        setSelectedEntityId: (id) => set({ selectedEntityId: id }),
        setQuickInspectEntityId: (id) => set({ quickInspectEntityId: id }),

        navigateToHandle: (rawHandle) => {
          const clean = rawHandle.replace(/^[@#]/, '').toLowerCase();
          const st = get();
          const found = st.entities.find(
            (e) => e.handle.toLowerCase() === clean || e.name.toLowerCase() === clean
          );
          if (!found) {
            st.showToast(`A entrada "${rawHandle}" ainda não existe no códice.`);
            return;
          }
          const inStudio = st.currentRoute === '/campaign/session' && selectIsDm(st) && st.activeModule !== 'session';
          if (inStudio) {
            set({ activeModule: 'worldbuilding', worldSubTab: 'wiki', selectedEntityId: found.id });
          } else {
            set({ quickInspectEntityId: found.id });
          }
        },

        showToast: (msg, variant = 'info') => {
          const item: ToastState = { id: ++toastSeq, message: msg, variant, shownAt: Date.now() };
          const cur = get().toast;
          // Um erro recente não é substituído por avisos comuns: eles entram na fila.
          if (cur && cur.variant === 'error' && variant !== 'error' && Date.now() - cur.shownAt < 3000) {
            if (toastQueue.length < 3) toastQueue.push(item);
            return;
          }
          display(item);
        },

        dismissToast: () => {
          if (toastTimer) clearTimeout(toastTimer);
          const next = toastQueue.shift();
          if (next) display(next);
          else set({ toast: null });
        },

        commitDrafts: (prefix) => flushPendingWrites(prefix),

        // ===================================================================
        // ENTRADAS DO CÓDICE
        // ===================================================================
        addEntity: async (partial) => {
          const { sessionToken, campaignId } = sess();
          const st = get();
          const prefix = partial.mentionPrefix || mentionPrefixFor(partial.category);
          const baseHandle = partial.handle || slugHandle(partial.name) || `Entrada${Date.now()}`;
          const handle = uniqueHandle(baseHandle, st.entities);
          const temp = tempId('ent');
          const entity: Entity = {
            id: temp,
            handle,
            mentionPrefix: prefix,
            name: partial.name,
            subtitle: partial.subtitle || 'Registro de campanha',
            category: partial.category,
            tags: partial.tags || [],
            summary: partial.summary || '',
            publicContent: partial.publicContent || '',
            secrets: (partial.secrets || []).map((sec, i) => ({
              ...sec,
              id: sec.id || tempId(`sec${i}`),
            })),
            attributes: (partial.attributes || []).map((a, i) => ({ ...a, id: a.id || tempId(`attr${i}`) })),
            pinnedInSession: Boolean(partial.pinnedInSession),
            // Novas entradas são ocultas, salvo pedido explícito do chamador.
            isPublicToPlayers: partial.isPublicToPlayers === true,
            imageUrl: partial.imageUrl,
            updatedAt: new Date().toISOString(),
          };
          const x = 250 + Math.floor(Math.random() * 420);
          const y = 160 + Math.floor(Math.random() * 300);
          const prevSelected = st.selectedEntityId;

          set((s) => ({
            entities: [entity, ...s.entities],
            selectedEntityId: temp,
            graphPositions: [...s.graphPositions, { entityId: temp, x, y }],
          }));

          const rollback = () =>
            set((s) => ({
              entities: s.entities.filter((e) => e.id !== temp),
              graphPositions: s.graphPositions.filter((p) => p.entityId !== temp),
              selectedEntityId: s.selectedEntityId === temp ? prevSelected : s.selectedEntityId,
            }));

          const realId = await commitCreate(
            temp,
            'salvar a entrada',
            rollback,
            async () => {
              const id = await convexClient.mutation(api.entities.create, {
                sessionToken,
                campaignId,
                ...entityCreateBody(entity),
              });
              // A posição inicial no grafo não impede a criação se falhar.
              await convexClient
                .mutation(api.relationships.updatePosition, { sessionToken, campaignId, entityId: id, x, y })
                .catch(() => {});
              return id as string;
            },
            `Entrada ${prefix}${handle} salva no códice.`
          );
          if (!realId) return null;
          return get().entities.find((e) => e.id === realId) ?? { ...entity, id: realId };
        },

        updateEntity: async (id, updates) => {
          const { sessionToken } = sess();
          const undo = snap('entities');
          set((state) => ({
            entities: state.entities.map((e) =>
              e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
            ),
          }));
          const isText = TEXT_ENTITY_KEYS.some((k) => k in updates);
          const send = async (patch: Partial<Entity>) => {
            const entityId = await resolveId(id);
            await convexClient.mutation(api.entities.update, {
              sessionToken,
              id: entityId,
              ...entityUpdateBody(patch),
            });
          };
          if (isText) {
            return scheduleWrite({
              key: draftKey.entity(id),
              patch: updates as Record<string, unknown>,
              label: 'salvar a entrada',
              rollback: undo,
              flush: (merged) => send(merged as Partial<Entity>),
            });
          }
          return mutate('atualizar a entrada', undo, () => send(updates));
        },

        deleteEntity: async (id) => {
          const { sessionToken } = sess();
          const undo = snap(
            'entities',
            'relationships',
            'graphPositions',
            'maps',
            'selectedEntityId',
            'quickInspectEntityId'
          );
          set((state) => {
            const remaining = state.entities.filter((e) => e.id !== id);
            return {
              entities: remaining,
              relationships: state.relationships.filter((r) => r.sourceId !== id && r.targetId !== id),
              graphPositions: state.graphPositions.filter((p) => p.entityId !== id),
              maps: state.maps.map((m) => ({
                ...m,
                pins: m.pins.map((p) => ({
                  ...p,
                  entityId: p.entityId === id ? undefined : p.entityId,
                  linkedEntityIds: p.linkedEntityIds?.filter((eid) => eid !== id),
                })),
              })),
              selectedEntityId: state.selectedEntityId === id ? remaining[0]?.id || '' : state.selectedEntityId,
              quickInspectEntityId: state.quickInspectEntityId === id ? null : state.quickInspectEntityId,
            };
          });
          return mutate('excluir a entrada', undo, async () => {
            await flushPendingWrites(draftKey.entity(id));
            const entityId = await resolveId(id);
            await convexClient.mutation(api.entities.remove, { sessionToken, id: entityId });
          });
        },

        togglePinEntity: async (id) => {
          const { sessionToken } = sess();
          const target = get().entities.find((e) => e.id === id);
          if (!target) return false;
          const undo = snap('entities');
          const nextPinned = !target.pinnedInSession;
          set((state) => ({
            entities: state.entities.map((e) => (e.id === id ? { ...e, pinnedInSession: nextPinned } : e)),
          }));
          return mutate(
            'fixar a entrada',
            undo,
            async () => {
              const entityId = await resolveId(id);
              await convexClient.mutation(api.entities.togglePin, { sessionToken, id: entityId });
            },
            nextPinned
              ? `${target.mentionPrefix}${target.handle} fixado na sessão.`
              : `${target.mentionPrefix}${target.handle} desafixado da sessão.`
          );
        },

        revealEntitySecret: async (entityId, secretId, reveal = true) => {
          const { sessionToken } = sess();
          const calendar = get().calendar;
          const currentMonth = calendar.months[calendar.currentMonthIndex]?.name || '';
          const stamp = `${calendar.currentDay} de ${currentMonth}, ${calendar.currentYear} ${calendar.epochName.split(' ')[0]}`;
          const undo = snap('entities');
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
          return mutate(
            reveal ? 'revelar o segredo' : 'ocultar o segredo',
            undo,
            async () => {
              const realSecret = await resolveId(secretId);
              await convexClient.mutation(api.entities.revealSecret, {
                sessionToken,
                secretId: realSecret,
                isRevealed: reveal,
                revealedAt: reveal ? stamp : undefined,
              });
            },
            reveal ? 'Segredo revelado aos jogadores.' : 'Segredo ocultado novamente.'
          );
        },

        addEntitySecret: async (entityId, title, content) => {
          const { sessionToken } = sess();
          const temp = tempId('sec');
          const undo = snap('entities');
          set((state) => ({
            entities: state.entities.map((e) =>
              e.id === entityId
                ? { ...e, secrets: [...e.secrets, { id: temp, title, content, isRevealed: false }] }
                : e
            ),
          }));
          const id = await commitCreate(temp, 'salvar o segredo', undo, async () => {
            const realEntity = await resolveId(entityId);
            return (await convexClient.mutation(api.entities.addSecret, {
              sessionToken,
              entityId: realEntity,
              title,
              content,
            })) as string;
          });
          return id !== null;
        },

        deleteEntitySecret: async (entityId, secretId) => {
          const { sessionToken } = sess();
          const undo = snap('entities');
          set((state) => ({
            entities: state.entities.map((e) =>
              e.id === entityId ? { ...e, secrets: e.secrets.filter((s) => s.id !== secretId) } : e
            ),
          }));
          return mutate('excluir o segredo', undo, async () => {
            const realSecret = await resolveId(secretId);
            await convexClient.mutation(api.entities.removeSecret, { sessionToken, secretId: realSecret });
          });
        },

        addEntityAttribute: async (entityId, label, value) => {
          const { sessionToken } = sess();
          const temp = tempId('attr');
          const undo = snap('entities');
          set((state) => ({
            entities: state.entities.map((e) =>
              e.id === entityId
                ? { ...e, attributes: [...e.attributes, { id: temp, label, value, category: 'stat' }] }
                : e
            ),
          }));
          const id = await commitCreate(temp, 'salvar o atributo', undo, async () => {
            const realEntity = await resolveId(entityId);
            return (await convexClient.mutation(api.entities.addAttribute, {
              sessionToken,
              entityId: realEntity,
              label,
              value,
              category: 'stat',
            })) as string;
          });
          return id !== null;
        },

        updateEntityAttribute: (entityId, attrId, value) => {
          const { sessionToken } = sess();
          const undo = snap('entities');
          set((state) => ({
            entities: state.entities.map((e) =>
              e.id === entityId
                ? { ...e, attributes: e.attributes.map((a) => (a.id === attrId ? { ...a, value } : a)) }
                : e
            ),
          }));
          return scheduleWrite({
            key: draftKey.attribute(attrId),
            patch: { value },
            label: 'salvar o atributo',
            rollback: undo,
            flush: async (merged) => {
              const realAttr = await resolveId(attrId);
              await convexClient.mutation(api.entities.updateAttribute, {
                sessionToken,
                attributeId: realAttr,
                value: merged.value as string | number,
              });
            },
          });
        },

        deleteEntityAttribute: async (entityId, attrId) => {
          const { sessionToken } = sess();
          const undo = snap('entities');
          set((state) => ({
            entities: state.entities.map((e) =>
              e.id === entityId ? { ...e, attributes: e.attributes.filter((a) => a.id !== attrId) } : e
            ),
          }));
          return mutate('excluir o atributo', undo, async () => {
            await flushPendingWrites(draftKey.attribute(attrId));
            const realAttr = await resolveId(attrId);
            await convexClient.mutation(api.entities.removeAttribute, { sessionToken, attributeId: realAttr });
          });
        },

        // ===================================================================
        // GRAFO
        // ===================================================================
        updateGraphNodePosition: (entityId, x, y, opts) => {
          const { sessionToken, campaignId } = sess();
          set((state) => {
            if (state.manualGraphNodes.some((n) => n.id === entityId)) {
              return {
                manualGraphNodes: state.manualGraphNodes.map((n) => (n.id === entityId ? { ...n, x, y } : n)),
              };
            }
            const exists = state.graphPositions.some((p) => p.entityId === entityId);
            return {
              graphPositions: exists
                ? state.graphPositions.map((p) => (p.entityId === entityId ? { ...p, x, y } : p))
                : [...state.graphPositions, { entityId, x, y }],
            };
          });
          if (opts?.persist === false) return;
          void scheduleWrite({
            key: draftKey.graphNode(entityId),
            patch: { x, y },
            label: 'salvar a posição',
            delayMs: 400,
            flush: async (merged) => {
              const realId = await resolveId(entityId);
              await convexClient.mutation(api.relationships.updatePosition, {
                sessionToken,
                campaignId,
                entityId: realId,
                x: merged.x as number,
                y: merged.y as number,
              });
            },
          });
          // Com persist:false durante o arraste, o fim do arraste chama commitGraphNodePosition.
        },

        commitGraphNodePosition: (entityId) => {
          // Se não há rascunho agendado (arraste com persist:false), grava a posição atual.
          const st = get();
          const manual = st.manualGraphNodes.find((n) => n.id === entityId);
          const pos = manual ?? st.graphPositions.find((p) => p.entityId === entityId);
          if (!pos) return Promise.resolve();
          const { sessionToken, campaignId } = sess();
          void scheduleWrite({
            key: draftKey.graphNode(entityId),
            patch: { x: pos.x, y: pos.y },
            label: 'salvar a posição',
            delayMs: 0,
            flush: async (merged) => {
              const realId = await resolveId(entityId);
              await convexClient.mutation(api.relationships.updatePosition, {
                sessionToken,
                campaignId,
                entityId: realId,
                x: merged.x as number,
                y: merged.y as number,
              });
            },
          });
          return flushPendingWrites(draftKey.graphNode(entityId));
        },

        addManualGraphNode: async (node) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('gnode');
          set((state) => ({ manualGraphNodes: [...state.manualGraphNodes, { ...node, id: temp }] }));
          const rollback = () =>
            set((s) => ({ manualGraphNodes: s.manualGraphNodes.filter((n) => n.id !== temp) }));
          return commitCreate(
            temp,
            'salvar o nó',
            rollback,
            async () =>
              (await convexClient.mutation(api.relationships.addManualNode, {
                sessionToken,
                campaignId,
                ...manualNodeBody(node),
                entityId: await resolveOptionalId(node.entityId),
              })) as string,
            `Nó "${node.label}" adicionado ao grafo.`
          );
        },

        deleteManualGraphNode: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('manualGraphNodes', 'relationships');
          set((state) => ({
            manualGraphNodes: state.manualGraphNodes.filter((n) => n.id !== id),
            relationships: state.relationships.filter((r) => r.sourceId !== id && r.targetId !== id),
          }));
          return mutate(
            'remover o nó',
            undo,
            async () => {
              const nodeId = await resolveId(id);
              await convexClient.mutation(api.relationships.removeManualNode, { sessionToken, id: nodeId });
            },
            'Nó removido do grafo.'
          );
        },

        addRelationship: async (edge) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('rel');
          set((state) => ({ relationships: [...state.relationships, { ...edge, id: temp }] }));
          const rollback = () =>
            set((s) => ({ relationships: s.relationships.filter((r) => r.id !== temp) }));
          return commitCreate(
            temp,
            'salvar a conexão',
            rollback,
            async () =>
              (await convexClient.mutation(api.relationships.create, {
                sessionToken,
                campaignId,
                sourceId: await resolveId(edge.sourceId),
                targetId: await resolveId(edge.targetId),
                ...relationshipCreateBody(edge),
              })) as string,
            `Conexão "${edge.label}" criada.`
          );
        },

        updateRelationshipLabel: async (id, label, type) => {
          const { sessionToken } = sess();
          const undo = snap('relationships');
          set((state) => ({
            relationships: state.relationships.map((r) =>
              r.id === id ? { ...r, label, ...(type ? { type } : {}) } : r
            ),
          }));
          return mutate('atualizar a conexão', undo, async () => {
            const relId = await resolveId(id);
            await convexClient.mutation(api.relationships.update, { sessionToken, id: relId, label, type });
          });
        },

        deleteRelationship: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('relationships');
          set((state) => ({ relationships: state.relationships.filter((r) => r.id !== id) }));
          return mutate(
            'remover a conexão',
            undo,
            async () => {
              const relId = await resolveId(id);
              await convexClient.mutation(api.relationships.remove, { sessionToken, id: relId });
            },
            'Conexão removida.'
          );
        },

        toggleRevealRelationship: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('relationships');
          // Apenas isRevealed muda; isSecret continua sendo o que o Mestre definiu.
          set((state) => ({
            relationships: state.relationships.map((r) => (r.id === id ? { ...r, isRevealed: !r.isRevealed } : r)),
          }));
          return mutate('alterar a visibilidade da conexão', undo, async () => {
            const relId = await resolveId(id);
            await convexClient.mutation(api.relationships.toggleReveal, { sessionToken, id: relId });
          });
        },

        // ===================================================================
        // MAPAS
        // ===================================================================
        navigateToMapPin: (mapId, pinId) => {
          set({
            activeModule: 'worldbuilding',
            worldSubTab: 'maps',
            selectedMapId: mapId,
            focusMapPin: { mapId, pinId },
          });
          get().setCurrentRoute('/campaign/session');
        },
        clearFocusMapPin: () => set({ focusMapPin: null }),
        setSelectedMapId: (id) => set({ selectedMapId: id }),

        addMap: async (name, subtitle, customImageUrl, regionType = 'regional', storageId) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('map');
          const prevSelected = get().selectedMapId;
          const newMap: CampaignMap = {
            id: temp,
            name,
            subtitle,
            regionType,
            presetSvgType: customImageUrl ? 'custom' : 'tactical_grid',
            customImageUrl,
            pins: [],
            shapes: [],
          };
          set((state) => ({ maps: [...state.maps, newMap], selectedMapId: temp }));
          const rollback = () =>
            set((s) => ({
              maps: s.maps.filter((m) => m.id !== temp),
              selectedMapId: s.selectedMapId === temp ? prevSelected : s.selectedMapId,
            }));
          return commitCreate(
            temp,
            'salvar o mapa',
            rollback,
            async () =>
              (await convexClient.mutation(api.maps.create, {
                sessionToken,
                campaignId,
                ...mapCreateBody(newMap, storageId),
              })) as string,
            `Mapa "${name}" salvo.`
          );
        },

        deleteMap: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('maps', 'selectedMapId');
          set((state) => {
            const remaining = state.maps.filter((m) => m.id !== id);
            return {
              maps: remaining,
              // Só muda a seleção se o mapa excluído era o selecionado.
              selectedMapId: state.selectedMapId === id ? remaining[0]?.id || '' : state.selectedMapId,
            };
          });
          return mutate(
            'excluir o mapa',
            undo,
            async () => {
              const mapId = await resolveId(id);
              await convexClient.mutation(api.maps.remove, { sessionToken, id: mapId });
            },
            'Mapa removido.'
          );
        },

        addMapPin: async (mapId, pin) => {
          const { sessionToken } = sess();
          const temp = tempId('pin');
          set((state) => ({
            maps: state.maps.map((m) => (m.id === mapId ? { ...m, pins: [...m.pins, { ...pin, id: temp }] } : m)),
          }));
          const rollback = () =>
            set((s) => ({
              maps: s.maps.map((m) => (m.id === mapId ? { ...m, pins: m.pins.filter((p) => p.id !== temp) } : m)),
            }));
          return commitCreate(
            temp,
            'salvar o marcador',
            rollback,
            async () =>
              (await convexClient.mutation(api.maps.addPin, {
                sessionToken,
                mapId: await resolveId(mapId),
                ...pinCreateBody(pin),
                entityId: await resolveOptionalId(pin.entityId),
                linkedEntityIds: await resolveIds(pin.linkedEntityIds),
                linkedMapId: await resolveOptionalId(pin.linkedMapId),
              })) as string,
            `Marcador "${pin.label}" fixado no mapa.`
          );
        },

        updateMapPin: async (mapId, pinId, updates) => {
          const { sessionToken } = sess();
          const undo = snap('maps');
          set((state) => ({
            maps: state.maps.map((m) =>
              m.id === mapId
                ? { ...m, pins: m.pins.map((p) => (p.id === pinId ? { ...p, ...updates } : p)) }
                : m
            ),
          }));
          return mutate('atualizar o marcador', undo, async () => {
            const realPin = await resolveId(pinId);
            await convexClient.mutation(api.maps.updatePin, {
              sessionToken,
              pinId: realPin,
              ...pinUpdateBody(updates),
              entityId: await resolveOptionalId(updates.entityId),
              linkedEntityIds: await resolveIds(updates.linkedEntityIds),
              linkedMapId: await resolveOptionalId(updates.linkedMapId),
            });
          });
        },

        deleteMapPin: async (mapId, pinId) => {
          const { sessionToken } = sess();
          const undo = snap('maps');
          set((state) => ({
            maps: state.maps.map((m) =>
              m.id === mapId ? { ...m, pins: m.pins.filter((p) => p.id !== pinId) } : m
            ),
          }));
          return mutate('excluir o marcador', undo, async () => {
            const realPin = await resolveId(pinId);
            await convexClient.mutation(api.maps.removePin, { sessionToken, pinId: realPin });
          });
        },

        toggleRevealMapPin: async (mapId, pinId) => {
          const { sessionToken } = sess();
          const undo = snap('maps');
          // Apenas isRevealed muda.
          set((state) => ({
            maps: state.maps.map((m) =>
              m.id === mapId
                ? { ...m, pins: m.pins.map((p) => (p.id === pinId ? { ...p, isRevealed: !p.isRevealed } : p)) }
                : m
            ),
          }));
          return mutate('alterar a visibilidade do marcador', undo, async () => {
            const realPin = await resolveId(pinId);
            await convexClient.mutation(api.maps.toggleRevealPin, { sessionToken, pinId: realPin });
          });
        },

        addMapShape: (mapId, shape) => {
          const next: MapDrawingShape = { ...shape, id: `shape-${Date.now()}-${Math.floor(Math.random() * 1e4)}` };
          return writeShapes(mapId, (shapes) => [...shapes, next], 'salvar o desenho', `Desenho "${shape.label}" salvo no mapa.`);
        },

        updateMapShape: (mapId, shapeId, updates) =>
          writeShapes(
            mapId,
            (shapes) => shapes.map((s) => (s.id === shapeId ? { ...s, ...updates } : s)),
            'atualizar o desenho'
          ),

        deleteMapShape: (mapId, shapeId) =>
          writeShapes(mapId, (shapes) => shapes.filter((s) => s.id !== shapeId), 'remover o desenho', 'Desenho removido do mapa.'),

        // ===================================================================
        // CALENDÁRIO E CRONOLOGIA
        // ===================================================================
        advanceCalendarDays: async (days) => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('calendar');
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
            return { calendar: { ...cal, currentDay: day, currentMonthIndex: monthIdx, currentYear: year } };
          });
          return mutate('avançar o calendário', undo, () =>
            convexClient.mutation(api.calendar.advanceDays, { sessionToken, campaignId, days })
          );
        },

        updateCalendarConfig: (updates) => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('calendar');
          set((state) => ({ calendar: { ...state.calendar, ...updates } }));
          return scheduleWrite({
            key: draftKey.calendar(campaignId),
            patch: updates as Record<string, unknown>,
            label: 'salvar o calendário',
            rollback: undo,
            flush: (merged) =>
              convexClient.mutation(api.calendar.update, {
                sessionToken,
                campaignId,
                ...calendarBody(merged as Partial<CalendarConfig>),
              }),
          });
        },

        addTimelineEvent: async (ev) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('ev');
          const nextOrder = get().timeline.length;
          const epoch = ev.epoch || get().calendar.epochName;
          set((state) => ({ timeline: [...state.timeline, { ...ev, epoch, id: temp }] }));
          const rollback = () => set((s) => ({ timeline: s.timeline.filter((e) => e.id !== temp) }));
          return commitCreate(
            temp,
            'salvar o evento',
            rollback,
            async () =>
              (await convexClient.mutation(api.calendar.addEvent, {
                sessionToken,
                campaignId,
                ...eventCreateBody(ev, epoch, nextOrder),
              })) as string,
            `Evento "${ev.title}" registrado.`
          );
        },

        updateTimelineEvent: (id, updates) => {
          const { sessionToken } = sess();
          const undo = snap('timeline');
          set((state) => ({
            timeline: state.timeline.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)),
          }));
          const send = async (patch: Partial<TimelineEvent>) => {
            const eventId = await resolveId(id);
            await convexClient.mutation(api.calendar.updateEvent, {
              sessionToken,
              eventId,
              ...eventUpdateBody(patch),
            });
          };
          const isText = 'title' in updates || 'description' in updates;
          if (isText) {
            return scheduleWrite({
              key: draftKey.timeline(id),
              patch: updates as Record<string, unknown>,
              label: 'salvar o evento',
              rollback: undo,
              flush: (merged) => send(merged as Partial<TimelineEvent>),
            });
          }
          return mutate('atualizar o evento', undo, () => send(updates));
        },

        reorderTimelineEvents: async (draggedId, targetId) => {
          if (draggedId === targetId) return true;
          const { sessionToken, campaignId } = sess();
          const undo = snap('timeline');
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
          if (orderedIds.length === 0) return false;
          return mutate('reordenar os eventos', undo, async () => {
            await convexClient.mutation(api.calendar.reorderEvents, {
              sessionToken,
              campaignId,
              orderedIds: (await resolveIds(orderedIds)) ?? [],
            });
          });
        },

        toggleRevealTimelineEvent: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('timeline');
          set((state) => ({
            timeline: state.timeline.map((ev) => (ev.id === id ? { ...ev, isRevealed: !ev.isRevealed } : ev)),
          }));
          return mutate('alterar a visibilidade do evento', undo, async () => {
            const eventId = await resolveId(id);
            await convexClient.mutation(api.calendar.toggleRevealEvent, { sessionToken, eventId });
          });
        },

        deleteTimelineEvent: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('timeline');
          set((state) => ({ timeline: state.timeline.filter((ev) => ev.id !== id) }));
          return mutate('excluir o evento', undo, async () => {
            await flushPendingWrites(draftKey.timeline(id));
            const eventId = await resolveId(id);
            await convexClient.mutation(api.calendar.removeEvent, { sessionToken, eventId });
          });
        },

        // ===================================================================
        // FRENTES E RELÓGIOS
        // ===================================================================
        setFrontClockValue: async (frontId, filled) => {
          const { sessionToken } = sess();
          const undo = snap('fronts');
          set((state) => ({
            fronts: state.fronts.map((f) => {
              if (f.id !== frontId) return f;
              const clamped = Math.max(0, Math.min(f.clockSegments, filled));
              return {
                ...f,
                clockFilled: clamped,
                status: clamped >= f.clockSegments ? 'triggered' : 'active',
                grimPortents: f.grimPortents.map((gp, idx) => ({ ...gp, triggered: idx < clamped })),
              };
            }),
          }));
          return mutate('atualizar o relógio', undo, async () => {
            const realFront = await resolveId(frontId);
            await convexClient.mutation(api.plots.updateFrontClock, {
              sessionToken,
              frontId: realFront,
              clockFilled: filled,
            });
          });
        },

        advanceIgnoredFronts: async () => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('fronts');
          set((state) => ({
            fronts: state.fronts.map((f) => {
              if (f.status !== 'active') return f;
              const next = Math.min(f.clockSegments, f.clockFilled + 1);
              return {
                ...f,
                clockFilled: next,
                status: next >= f.clockSegments ? 'triggered' : 'active',
                grimPortents: f.grimPortents.map((gp, idx) => ({ ...gp, triggered: idx < next })),
              };
            }),
          }));
          return mutate(
            'avançar as frentes',
            undo,
            () => convexClient.mutation(api.plots.advanceAllFronts, { sessionToken, campaignId }),
            'Todas as frentes ativas avançaram um segmento.'
          );
        },

        toggleFrontPortent: async (frontId, portentId) => {
          const { sessionToken } = sess();
          const undo = snap('fronts');
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
          return mutate('atualizar o presságio', undo, async () => {
            const realFront = await resolveId(frontId);
            await convexClient.mutation(api.plots.togglePortent, { sessionToken, frontId: realFront, portentId });
          });
        },

        addThreatFront: async (front) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('front');
          set((state) => ({ fronts: [{ ...front, id: temp }, ...state.fronts] }));
          const rollback = () => set((s) => ({ fronts: s.fronts.filter((f) => f.id !== temp) }));
          return commitCreate(
            temp,
            'salvar a frente',
            rollback,
            async () =>
              (await convexClient.mutation(api.plots.createFront, {
                sessionToken,
                campaignId,
                ...frontCreateBody(front),
              })) as string,
            `Frente "${front.name}" criada.`
          );
        },

        updateThreatFront: async (frontId, updates) => {
          const { sessionToken } = sess();
          const undo = snap('fronts');
          set((state) => ({
            fronts: state.fronts.map((f) => (f.id === frontId ? { ...f, ...updates } : f)),
          }));
          return mutate(
            'atualizar a frente',
            undo,
            async () => {
              const realFront = await resolveId(frontId);
              await convexClient.mutation(api.plots.updateFront, {
                sessionToken,
                frontId: realFront,
                ...frontUpdateBody(updates),
              });
            },
            'Frente atualizada.'
          );
        },

        deleteThreatFront: async (frontId) => {
          const { sessionToken } = sess();
          const undo = snap('fronts');
          set((state) => ({ fronts: state.fronts.filter((f) => f.id !== frontId) }));
          return mutate('excluir a frente', undo, async () => {
            const realFront = await resolveId(frontId);
            await convexClient.mutation(api.plots.removeFront, { sessionToken, frontId: realFront });
          });
        },

        // ===================================================================
        // CENAS E PISTAS
        // ===================================================================
        updateMysteryNodePosition: (nodeId, x, y, opts) => {
          const { sessionToken } = sess();
          set((state) => ({
            mysteryNodes: state.mysteryNodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
          }));
          if (opts?.persist === false) return;
          void scheduleWrite({
            key: draftKey.scene(nodeId),
            patch: { x, y },
            label: 'salvar a posição da cena',
            delayMs: 400,
            flush: async (merged) => {
              const sceneId = await resolveId(nodeId);
              await convexClient.mutation(api.plots.updateScenePosition, {
                sessionToken,
                sceneId,
                x: merged.x as number,
                y: merged.y as number,
              });
            },
          });
        },

        commitMysteryNodePosition: (nodeId) => {
          const node = get().mysteryNodes.find((n) => n.id === nodeId);
          if (!node) return Promise.resolve();
          const { sessionToken } = sess();
          void scheduleWrite({
            key: draftKey.scene(nodeId),
            patch: { x: node.x, y: node.y },
            label: 'salvar a posição da cena',
            delayMs: 0,
            flush: async (merged) => {
              const sceneId = await resolveId(nodeId);
              await convexClient.mutation(api.plots.updateScenePosition, {
                sessionToken,
                sceneId,
                x: merged.x as number,
                y: merged.y as number,
              });
            },
          });
          return flushPendingWrites(draftKey.scene(nodeId));
        },

        updateMysteryNodeStatus: async (nodeId, status) => {
          const { sessionToken } = sess();
          const undo = snap('mysteryNodes');
          set((state) => ({
            mysteryNodes: state.mysteryNodes.map((n) => (n.id === nodeId ? { ...n, status } : n)),
          }));
          return mutate('atualizar a cena', undo, async () => {
            const sceneId = await resolveId(nodeId);
            await convexClient.mutation(api.plots.updateSceneStatus, { sessionToken, sceneId, status });
          });
        },

        toggleMysteryClue: async (nodeId, clueId) => {
          const { sessionToken } = sess();
          const undo = snap('mysteryNodes');
          set((state) => ({
            mysteryNodes: state.mysteryNodes.map((n) =>
              n.id === nodeId
                ? { ...n, clues: n.clues.map((c) => (c.id === clueId ? { ...c, discovered: !c.discovered } : c)) }
                : n
            ),
          }));
          return mutate('atualizar a pista', undo, async () => {
            const sceneId = await resolveId(nodeId);
            const realClue = await resolveId(clueId);
            await convexClient.mutation(api.plots.toggleClue, { sessionToken, sceneId, clueId: realClue });
          });
        },

        addMysteryNode: async (title, subtitle, locationHandle, description) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('scene');
          const x = 240 + Math.floor(Math.random() * 280);
          const y = 120 + Math.floor(Math.random() * 220);
          const node: MysterySceneNode = {
            id: temp,
            title,
            subtitle,
            locationHandle,
            status: 'unlocked',
            x,
            y,
            description,
            clues: [],
          };
          set((state) => ({ mysteryNodes: [...state.mysteryNodes, node] }));
          const rollback = () => set((s) => ({ mysteryNodes: s.mysteryNodes.filter((n) => n.id !== temp) }));
          return commitCreate(temp, 'salvar a cena', rollback, async () =>
            (await convexClient.mutation(api.plots.createScene, {
              sessionToken,
              campaignId,
              ...sceneCreateBody(node),
            })) as string
          );
        },

        addMysteryClue: async (nodeId, name, description, targetSceneId, type) => {
          const { sessionToken } = sess();
          const temp = tempId('clue');
          const undo = snap('mysteryNodes');
          set((state) => ({
            mysteryNodes: state.mysteryNodes.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    clues: [...n.clues, { id: temp, name, description, targetSceneId, discovered: false, type }],
                  }
                : n
            ),
          }));
          const id = await commitCreate(temp, 'salvar a pista', undo, async () =>
            (await convexClient.mutation(api.plots.addClue, {
              sessionToken,
              sceneId: await resolveId(nodeId),
              name,
              description,
              targetSceneId: targetSceneId ? await resolveId(targetSceneId) : '',
              type,
            })) as string
          );
          return id !== null;
        },

        deleteMysteryNode: async (nodeId) => {
          const { sessionToken } = sess();
          const undo = snap('mysteryNodes');
          set((state) => ({ mysteryNodes: state.mysteryNodes.filter((n) => n.id !== nodeId) }));
          return mutate('excluir a cena', undo, async () => {
            const sceneId = await resolveId(nodeId);
            await convexClient.mutation(api.plots.removeScene, { sessionToken, sceneId });
          });
        },

        // ===================================================================
        // GERADORES
        // ===================================================================
        recordGeneratedItem: (item) =>
          set((state) => ({ recentGeneratedItems: [item, ...state.recentGeneratedItems.slice(0, 11)] })),
        removeGeneratedItem: (id) =>
          set((state) => ({ recentGeneratedItems: state.recentGeneratedItems.filter((item) => item.id !== id) })),
        clearGeneratedItems: () => set({ recentGeneratedItems: [] }),

        saveGeneratedItemToDatabase: (item, pinToSession = false) => {
          const categoryMap: Record<GeneratedEmergencyItem['type'], EntityCategory> = {
            npc: 'npc',
            tavern: 'location',
            rumor: 'lore',
            loot: 'item',
          };
          const publicDetails = item.details.filter((d) => !d.isSecret);
          const secretDetails = item.details.filter((d) => d.isSecret);
          return get().addEntity({
            name: item.title,
            subtitle: item.subtitle,
            handle: item.rawHandle,
            category: categoryMap[item.type],
            tags: ['Gerado em mesa', item.type.toUpperCase()],
            // O resumo só usa informação pública; segredos nunca vazam para ele.
            summary: publicDetails[0]?.value || item.subtitle,
            publicContent: publicDetails.map((d) => `• ${d.label}: ${d.value}`).join('\n'),
            secrets: secretDetails.map((s, i) => ({
              id: `sec-gen-${Date.now()}-${i}`,
              title: s.label,
              content: s.value,
              isRevealed: false,
            })),
            pinnedInSession: pinToSession,
            isPublicToPlayers: false,
          });
        },

        // ===================================================================
        // SESSÃO
        // ===================================================================
        addScratchpadLine: async (text) => {
          const { sessionToken, campaignId } = sess();
          const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const temp = tempId('scr');
          set((state) => ({ scratchpad: [{ id: temp, text, timestamp }, ...state.scratchpad] }));
          const rollback = () => set((s) => ({ scratchpad: s.scratchpad.filter((l) => l.id !== temp) }));
          const id = await commitCreate(temp, 'salvar a nota', rollback, async () =>
            (await convexClient.mutation(api.session.addScratchpad, {
              sessionToken,
              campaignId,
              text,
              timestamp,
            })) as string
          );
          return id !== null;
        },

        deleteScratchpadLine: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('scratchpad');
          set((state) => ({ scratchpad: state.scratchpad.filter((s) => s.id !== id) }));
          return mutate('excluir a nota', undo, async () => {
            const noteId = await resolveId(id);
            await convexClient.mutation(api.session.removeScratchpad, { sessionToken, id: noteId });
          });
        },

        convertScratchpadLineToEntity: async (lineId, category) => {
          const { sessionToken } = sess();
          const line = get().scratchpad.find((s) => s.id === lineId);
          if (!line) return false;
          const parts = line.text.split(/[-—:]/);
          const rawTitle = parts[0].trim().slice(0, 42) || 'Entrada de sessão';
          // Criada oculta: o Mestre revisa o texto antes de revelar a entrada.
          const created = await get().addEntity({
            name: rawTitle.replace(/^[@#]/, ''),
            subtitle: `Convertido do bloco de notas (${line.timestamp})`,
            category,
            summary: line.text.slice(0, 140),
            publicContent: line.text,
            pinnedInSession: true,
            isPublicToPlayers: false,
          });
          if (!created) return false;
          const handleString = `${created.mentionPrefix}${created.handle}`;
          const undo = snap('scratchpad');
          set((state) => ({
            scratchpad: state.scratchpad.map((s) =>
              s.id === lineId ? { ...s, convertedEntityHandle: handleString } : s
            ),
          }));
          return mutate('marcar a nota como convertida', undo, async () => {
            const noteId = await resolveId(lineId);
            await convexClient.mutation(api.session.markScratchpadConverted, {
              sessionToken,
              id: noteId,
              convertedEntityHandle: handleString,
            });
          });
        },

        adjustCombatantHp: async (id, delta) => {
          const { sessionToken } = sess();
          const undo = snap('combatants');
          set((state) => ({
            combatants: state.combatants.map((c) =>
              c.id === id && c.hp !== undefined
                ? { ...c, hp: Math.max(0, Math.min(c.maxHp ?? c.hp, c.hp + delta)) }
                : c
            ),
          }));
          return mutate('ajustar os pontos de vida', undo, async () => {
            const combId = await resolveId(id);
            await convexClient.mutation(api.session.adjustHp, { sessionToken, id: combId, delta });
          });
        },

        toggleCombatantCondition: async (id, condition) => {
          const { sessionToken } = sess();
          const undo = snap('combatants');
          set((state) => ({
            combatants: state.combatants.map((c) => {
              if (c.id !== id) return c;
              const has = c.conditions.includes(condition);
              return {
                ...c,
                conditions: has ? c.conditions.filter((cond) => cond !== condition) : [...c.conditions, condition],
              };
            }),
          }));
          return mutate('alterar a condição', undo, async () => {
            const combId = await resolveId(id);
            await convexClient.mutation(api.session.toggleCondition, { sessionToken, id: combId, condition });
          });
        },

        setCombatantHidden: async (id, hidden) => {
          const { sessionToken } = sess();
          const undo = snap('combatants');
          set((state) => ({
            combatants: state.combatants.map((c) => (c.id === id ? { ...c, isHidden: hidden } : c)),
          }));
          return mutate(hidden ? 'ocultar o combatente' : 'revelar o combatente', undo, async () => {
            const combId = await resolveId(id);
            await convexClient.mutation(api.session.setCombatantHidden, { sessionToken, id: combId, isHidden: hidden });
          });
        },

        nextCombatTurn: () => {
          const { sessionToken, campaignId } = sess();
          // Sem previsão local: o servidor é a fonte do turno e da rodada.
          return mutate('passar o turno', undefined, () =>
            convexClient.mutation(api.session.nextTurn, { sessionToken, campaignId })
          );
        },

        rollAllInitiatives: () => {
          const { sessionToken, campaignId } = sess();
          return mutate(
            'rolar as iniciativas',
            undefined,
            () => convexClient.mutation(api.session.rollAllInitiatives, { sessionToken, campaignId }),
            'Iniciativas roladas para toda a mesa.'
          );
        },

        addCombatant: async (c) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('comb');
          set((state) => ({
            combatants: [...state.combatants, { ...c, id: temp }].sort((a, b) => b.initiative - a.initiative),
          }));
          const rollback = () => set((s) => ({ combatants: s.combatants.filter((x) => x.id !== temp) }));
          return commitCreate(temp, 'adicionar o combatente', rollback, async () =>
            (await convexClient.mutation(api.session.addCombatant, {
              sessionToken,
              campaignId,
              ...combatantCreateBody(c),
              entityId: await resolveOptionalId(c.entityId),
            })) as string
          );
        },

        removeCombatant: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('combatants');
          // O turno ativo é recalculado pelo servidor; não alteramos o índice localmente.
          set((state) => ({ combatants: state.combatants.filter((c) => c.id !== id) }));
          return mutate('remover o combatente', undo, async () => {
            const combId = await resolveId(id);
            await convexClient.mutation(api.session.removeCombatant, { sessionToken, id: combId });
          });
        },

        clearCombatants: async () => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('combatants', 'activeCombatTurnIndex', 'activeCombatantId', 'combatRound');
          set({ combatants: [], activeCombatTurnIndex: 0, activeCombatantId: null, combatRound: 1 });
          return mutate(
            'limpar o combate',
            undo,
            () => convexClient.mutation(api.session.clearCombatants, { sessionToken, campaignId }),
            'Encontro de combate limpo.'
          );
        },

        rollDice: async (sides, count = 1, modifier = 0, label = 'Rolagem rápida') => {
          const { sessionToken, campaignId } = sess();
          if (!campaignId) {
            get().showToast('Selecione uma campanha para rolar dados.', 'error');
            return null;
          }
          set({ isRollingDice: true });
          const result = await runMutation('rolar os dados', undefined, () =>
            convexClient.mutation(api.session.addDiceRoll, { sessionToken, campaignId, sides, count, modifier, label })
          );
          set({ isRollingDice: false });
          if (!result.ok) return null;
          // O resultado é o do servidor; a assinatura em tempo real traz a mesma rolagem (mesmo id).
          const roll = result.value as unknown as DiceRollLog;
          if (get().activeCampaignId === campaignId) {
            set((s) => ({ diceLogs: [roll, ...s.diceLogs.filter((l) => l.id !== roll.id)].slice(0, 30) }));
          }
          return roll;
        },

        clearDiceLogs: async () => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('diceLogs');
          set({ diceLogs: [] });
          return mutate('limpar o histórico de dados', undo, () =>
            convexClient.mutation(api.session.clearDiceRolls, { sessionToken, campaignId })
          );
        },

        // ===================================================================
        // PORTAL
        // ===================================================================
        toggleQuestObjective: async (questId, objectiveId) => {
          const { sessionToken } = sess();
          const undo = snap('quests');
          set((state) => ({
            quests: state.quests.map((q) =>
              q.id === questId
                ? {
                    ...q,
                    objectives: q.objectives.map((o) => (o.id === objectiveId ? { ...o, completed: !o.completed } : o)),
                  }
                : q
            ),
          }));
          return mutate('atualizar o objetivo', undo, async () => {
            const realQuest = await resolveId(questId);
            await convexClient.mutation(api.portal.toggleObjective, { sessionToken, questId: realQuest, objectiveId });
          });
        },

        updateQuestStatus: async (questId, status) => {
          const { sessionToken } = sess();
          const undo = snap('quests');
          set((state) => ({ quests: state.quests.map((q) => (q.id === questId ? { ...q, status } : q)) }));
          return mutate('atualizar a missão', undo, async () => {
            const realQuest = await resolveId(questId);
            await convexClient.mutation(api.portal.updateQuestStatus, { sessionToken, questId: realQuest, status });
          });
        },

        addQuest: async (q) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('quest');
          set((state) => ({ quests: [{ ...q, id: temp }, ...state.quests] }));
          const rollback = () => set((s) => ({ quests: s.quests.filter((x) => x.id !== temp) }));
          return commitCreate(
            temp,
            'salvar a missão',
            rollback,
            async () =>
              (await convexClient.mutation(api.portal.createQuest, {
                sessionToken,
                campaignId,
                ...questCreateBody(q),
              })) as string,
            `Missão "${q.title}" adicionada ao mural.`
          );
        },

        deleteQuest: async (questId) => {
          const { sessionToken } = sess();
          const undo = snap('quests');
          set((state) => ({ quests: state.quests.filter((q) => q.id !== questId) }));
          return mutate(
            'excluir a missão',
            undo,
            async () => {
              const realQuest = await resolveId(questId);
              await convexClient.mutation(api.portal.removeQuest, { sessionToken, questId: realQuest });
            },
            'Missão removida do mural.'
          );
        },

        addJournalEntry: async (entry) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('jour');
          set((state) => ({
            journal: [{ ...entry, id: temp, canEdit: true }, ...state.journal],
          }));
          const rollback = () => set((s) => ({ journal: s.journal.filter((j) => j.id !== temp) }));
          return commitCreate(
            temp,
            'salvar a crônica',
            rollback,
            async () =>
              (await convexClient.mutation(api.portal.addJournal, {
                sessionToken,
                campaignId,
                ...journalCreateBody(entry),
              })) as string,
            `Crônica da sessão ${entry.sessionNumber} salva.`
          );
        },

        updateJournalEntry: (id, updates) => {
          const { sessionToken } = sess();
          const undo = snap('journal');
          set((state) => ({ journal: state.journal.map((j) => (j.id === id ? { ...j, ...updates } : j)) }));
          const send = async (patch: Partial<SessionJournalEntry>) => {
            const journalId = await resolveId(id);
            await convexClient.mutation(api.portal.updateJournal, {
              sessionToken,
              journalId,
              title: patch.title,
              content: patch.content,
              isPublic: patch.isPublic,
            });
          };
          if ('title' in updates || 'content' in updates) {
            return scheduleWrite({
              key: draftKey.journal(id),
              patch: updates as Record<string, unknown>,
              label: 'salvar a crônica',
              rollback: undo,
              flush: (merged) => send(merged as Partial<SessionJournalEntry>),
            });
          }
          return mutate('atualizar a crônica', undo, () => send(updates));
        },

        deleteJournalEntry: async (journalId) => {
          const { sessionToken } = sess();
          const undo = snap('journal');
          set((state) => ({ journal: state.journal.filter((j) => j.id !== journalId) }));
          return mutate(
            'excluir a crônica',
            undo,
            async () => {
              await flushPendingWrites(draftKey.journal(journalId));
              const realId = await resolveId(journalId);
              await convexClient.mutation(api.portal.removeJournal, { sessionToken, journalId: realId });
            },
            'Crônica removida do diário.'
          );
        },

        addPersonalJournalNote: async (note) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('pnote');
          const newNote: PersonalJournalNote = {
            ...note,
            playerId: get().currentUser?.id || note.playerId || '',
            id: temp,
            updatedAt: new Date().toISOString(),
            isOwn: true,
          };
          set((state) => ({ personalJournalNotes: [newNote, ...state.personalJournalNotes] }));
          const rollback = () =>
            set((s) => ({ personalJournalNotes: s.personalJournalNotes.filter((n) => n.id !== temp) }));
          return commitCreate(
            temp,
            'salvar a anotação',
            rollback,
            async () =>
              (await convexClient.mutation(api.portal.addPersonalNote, {
                sessionToken,
                campaignId,
                playerName: note.playerName,
                characterName: note.characterName,
                title: note.title,
                content: note.content,
                category: note.category,
                sharedWithDm: Boolean(note.sharedWithDm),
              })) as string,
            'Anotação salva no diário pessoal.'
          );
        },

        updatePersonalJournalNote: (id, updates) => {
          const { sessionToken } = sess();
          const undo = snap('personalJournalNotes');
          set((state) => ({
            personalJournalNotes: state.personalJournalNotes.map((n) =>
              n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
            ),
          }));
          const send = async (patch: Partial<PersonalJournalNote>) => {
            const noteId = await resolveId(id);
            await convexClient.mutation(api.portal.updatePersonalNote, {
              sessionToken,
              id: noteId,
              title: patch.title,
              content: patch.content,
              category: patch.category,
              sharedWithDm: patch.sharedWithDm,
            });
          };
          if ('title' in updates || 'content' in updates) {
            return scheduleWrite({
              key: draftKey.personalNote(id),
              patch: updates as Record<string, unknown>,
              label: 'salvar a anotação',
              rollback: undo,
              flush: (merged) => send(merged as Partial<PersonalJournalNote>),
            });
          }
          return mutate('atualizar a anotação', undo, () => send(updates));
        },

        deletePersonalJournalNote: async (id) => {
          const { sessionToken } = sess();
          const undo = snap('personalJournalNotes');
          set((state) => ({ personalJournalNotes: state.personalJournalNotes.filter((n) => n.id !== id) }));
          return mutate(
            'excluir a anotação',
            undo,
            async () => {
              await flushPendingWrites(draftKey.personalNote(id));
              const noteId = await resolveId(id);
              await convexClient.mutation(api.portal.removePersonalNote, { sessionToken, id: noteId });
            },
            'Anotação excluída.'
          );
        },

        togglePersonalNoteDmAccess: async (id) => {
          const { sessionToken } = sess();
          const target = get().personalJournalNotes.find((n) => n.id === id);
          if (!target) return false;
          const nextShared = !target.sharedWithDm;
          const undo = snap('personalJournalNotes');
          set((state) => ({
            personalJournalNotes: state.personalJournalNotes.map((n) =>
              n.id === id ? { ...n, sharedWithDm: nextShared } : n
            ),
          }));
          return mutate(
            'alterar o compartilhamento',
            undo,
            async () => {
              const noteId = await resolveId(id);
              await convexClient.mutation(api.portal.updatePersonalNote, {
                sessionToken,
                id: noteId,
                sharedWithDm: nextShared,
              });
            },
            nextShared ? 'Nota compartilhada com o Mestre.' : 'Nota visível só para você.'
          );
        },

        adjustPartyCurrency: async (type, delta) => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('partyResources');
          set((state) => ({
            partyResources: {
              ...state.partyResources,
              [type]: Math.max(0, state.partyResources[type] + delta),
            },
          }));
          return mutate('atualizar os recursos', undo, () =>
            convexClient.mutation(api.portal.updateCurrency, { sessionToken, campaignId, field: type, delta })
          );
        },

        addPartyInventoryItem: async (name, quantity, holder, category, notes) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('pitem');
          const undo = snap('partyResources');
          set((state) => ({
            partyResources: {
              ...state.partyResources,
              items: [...state.partyResources.items, { id: temp, name, quantity, holder, category, notes }],
            },
          }));
          const id = await commitCreate(temp, 'salvar o item', undo, async () =>
            (await convexClient.mutation(api.portal.addInventoryItem, {
              sessionToken,
              campaignId,
              name,
              quantity,
              holder,
              category,
              notes,
            })) as string
          );
          return id !== null;
        },

        removePartyInventoryItem: async (id) => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('partyResources');
          set((state) => ({
            partyResources: {
              ...state.partyResources,
              items: state.partyResources.items.filter((i) => i.id !== id),
            },
          }));
          return mutate('remover o item', undo, async () => {
            const itemId = await resolveId(id);
            await convexClient.mutation(api.portal.removeInventoryItem, { sessionToken, campaignId, itemId });
          });
        },

        toggleStrongholdUpgrade: async (upgradeId) => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('partyResources');
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
          return mutate('atualizar a melhoria', undo, async () => {
            const realUpgrade = await resolveId(upgradeId);
            await convexClient.mutation(api.portal.toggleStrongholdUpgrade, {
              sessionToken,
              campaignId,
              upgradeId: realUpgrade,
            });
          });
        },

        updateStronghold: (updates) => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('partyResources');
          set((state) => ({
            partyResources: {
              ...state.partyResources,
              stronghold: { ...state.partyResources.stronghold, ...updates },
            },
          }));
          return scheduleWrite({
            key: draftKey.stronghold(campaignId),
            patch: updates as Record<string, unknown>,
            label: 'salvar a base',
            rollback: undo,
            flush: (merged) =>
              convexClient.mutation(api.portal.updateStronghold, {
                sessionToken,
                campaignId,
                ...(merged as Partial<Omit<PartyResources['stronghold'], 'upgrades'>>),
              }),
          });
        },

        addStrongholdUpgrade: async (name, cost, benefit) => {
          const { sessionToken, campaignId } = sess();
          const temp = tempId('upg');
          const undo = snap('partyResources');
          set((state) => ({
            partyResources: {
              ...state.partyResources,
              stronghold: {
                ...state.partyResources.stronghold,
                upgrades: [
                  ...state.partyResources.stronghold.upgrades,
                  { id: temp, name, cost, benefit, installed: false },
                ],
              },
            },
          }));
          const id = await commitCreate(
            temp,
            'salvar a melhoria',
            undo,
            async () =>
              (await convexClient.mutation(api.portal.addStrongholdUpgrade, {
                sessionToken,
                campaignId,
                name,
                cost,
                benefit,
              })) as string,
            `Melhoria "${name}" adicionada à base.`
          );
          return id !== null;
        },

        removeStrongholdUpgrade: async (upgradeId) => {
          const { sessionToken, campaignId } = sess();
          const undo = snap('partyResources');
          set((state) => ({
            partyResources: {
              ...state.partyResources,
              stronghold: {
                ...state.partyResources.stronghold,
                upgrades: state.partyResources.stronghold.upgrades.filter((u) => u.id !== upgradeId),
              },
            },
          }));
          return mutate('remover a melhoria', undo, async () => {
            const realUpgrade = await resolveId(upgradeId);
            await convexClient.mutation(api.portal.removeStrongholdUpgrade, {
              sessionToken,
              campaignId,
              upgradeId: realUpgrade,
            });
          });
        },
      };

      // ---------- escrita serial do array de formas de um mapa ----------
      // (declarada por último para poder usar `set`/`get` do fechamento)
      function writeShapes(
        mapId: string,
        transform: (shapes: MapDrawingShape[]) => MapDrawingShape[],
        label: string,
        success?: string
      ): Promise<boolean> {
        const { sessionToken } = sess();
        const undo = snap('maps');
        let nextShapes: MapDrawingShape[] = [];
        set((state) => ({
          maps: state.maps.map((m) => {
            if (m.id !== mapId) return m;
            nextShapes = transform(m.shapes || []);
            return { ...m, shapes: nextShapes };
          }),
        }));
        const toSend = nextShapes;
        // Uma fila por mapa garante que a última versão das formas seja a que fica no servidor.
        return mutate(
          label,
          undo,
          () =>
            enqueue(`shapes:${mapId}`, async () => {
              const realMap = await resolveId(mapId);
              await convexClient.mutation(api.maps.updateShapes, {
                sessionToken,
                mapId: realMap,
                shapes: shapesBody(toSend),
              });
            }),
          success
        );
      }
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => quotaSafeLocalStorage),
      partialize: (state) => ({
        sessionToken: state.sessionToken,
        currentUser: state.currentUser,
        activeCampaignId: state.activeCampaignId,
        activeCharacterId: state.activeCharacterId,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CampaignState>;
        const merged: CampaignState = { ...current, ...p };
        if (p.sessionToken && p.currentUser) {
          let fromUrl: AppRoute | null = null;
          try {
            fromUrl = parseRoute(window.location.pathname);
          } catch {
            fromUrl = null;
          }
          merged.currentRoute = fromUrl && fromUrl !== '/login' ? fromUrl : '/campaigns';
        }
        return merged;
      },
    }
  )
);

// A store registra o toast na infraestrutura de escrita (evita importação circular).
bindToast((msg, variant) => useCampaignStore.getState().showToast(msg, variant));

// `viewRole` é um espelho derivado de `useIsDm()`: mantido para as telas ainda não migradas.
useCampaignStore.subscribe((s) => {
  const derived: ViewRole = selectIsDm(s) ? 'gm' : 'player';
  if (s.viewRole !== derived) useCampaignStore.setState({ viewRole: derived });
});

// ===========================================================================
// Hooks
// ===========================================================================

/** Campanha ativa (ou undefined). Substitui o antigo `campaignName` da store. */
export const useActiveCampaign = (): CampaignSummary | undefined => useCampaignStore(selectActiveCampaign);

/**
 * "Sou Mestre aqui?" Verdadeiro apenas se o usuário é Mestre da campanha ativa e
 * não está pré-visualizando como jogador. Use para exibir/ocultar controles de Mestre.
 */
export const useIsDm = (): boolean => useCampaignStore(selectIsDm);

/** Papel real na campanha ativa, ignorando a pré-visualização (para navegação e menus do Mestre). */
export const useIsCampaignDm = (): boolean => useCampaignStore(selectIsCampaignDm);

/** Id real de uma criação ainda pendente? (a interface pode mostrar "Salvando"). */
export const isCreationPending = (id: string | undefined | null): boolean => isPendingCreation(id);
export { isTempId, pendingCreations };
