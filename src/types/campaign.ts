export type EntityCategory = 'npc' | 'faction' | 'location' | 'item' | 'monster' | 'lore';

export type MentionPrefix = '@' | '#';

export interface SecretBlock {
  id: string;
  title: string;
  content: string;
  isRevealed: boolean;
  revealedAt?: string;
}

export interface CustomAttribute {
  id: string;
  label: string;
  value: string | number;
  max?: number;
  category?: 'stat' | 'resource' | 'meta';
}

export interface Entity {
  id: string;
  handle: string; // ex: "ArquimagoSolen" ou "CidadelaNorte"
  mentionPrefix: MentionPrefix; // '@' for NPCs/Factions/Monsters, '#' for Locations/Items/Lore
  name: string;
  subtitle: string;
  category: EntityCategory;
  tags: string[];
  summary: string;
  publicContent: string;
  secrets: SecretBlock[];
  attributes: CustomAttribute[];
  pinnedInSession: boolean;
  isPublicToPlayers: boolean;
  imageUrl?: string;
  updatedAt: string;
}

export type RelationType = 'hostile' | 'allied' | 'secret' | 'neutral' | 'patron' | 'blood';

export interface RelationshipEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string; // ex: "Odeia", "Chantageia", "Aliado Secreto"
  type: RelationType;
  notes?: string;
  isSecret: boolean;
  isRevealed?: boolean;
}

export interface GraphNodePosition {
  entityId: string;
  x: number;
  y: number;
}

export interface ManualGraphNode {
  id: string;
  label: string;
  subtitle?: string;
  category: 'npc' | 'faction' | 'location' | 'player' | 'item' | 'monster' | 'lore';
  entityId?: string;
  x: number;
  y: number;
}

export type MapLayer = 'locations' | 'dangers' | 'secrets' | 'quests';

export type MapPinIcon =
  | 'castle'
  | 'city'
  | 'village'
  | 'tavern'
  | 'dungeon'
  | 'skull'
  | 'ruins'
  | 'camp'
  | 'secret'
  | 'quest'
  | 'shrine'
  | 'port'
  | 'portal'
  | 'shop'
  | 'party';

export type DrawingToolType =
  | 'select'
  | 'pan'
  | 'pin'
  | 'text'
  | 'road'
  | 'river'
  | 'polygon'
  | 'circle'
  | 'rect'
  | 'fog'
  | 'ruler';

export interface MapDrawingShape {
  id: string;
  type: 'road' | 'river' | 'polygon' | 'circle' | 'rect' | 'text' | 'fog';
  label: string;
  color: string;
  strokeWidth: number;
  dashed?: boolean;
  opacity?: number;
  fontSize?: number;
  entityId?: string;
  linkedEntityIds?: string[];
  points: { x: number; y: number }[]; // percentage 0-100 coordinates
  radius?: number; // percentage for circle
  width?: number; // percentage for rect
  height?: number; // percentage for rect
  isSecret?: boolean;
  isRevealed?: boolean;
}

export interface MapPin {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  label: string;
  subtitle: string;
  entityId?: string; // links directly to primary Entity in Wiki
  linkedEntityIds?: string[]; // links to multiple other Wiki Entities (@NPCs, @Factions, #Items, etc.)
  linkedMapId?: string; // drill-down link to another CampaignMap (e.g. City -> Dungeon)
  layer: MapLayer;
  iconType: MapPinIcon;
  description: string;
  monsters: string[];
  treasures: string[];
  secretNote?: string;
  isSecret: boolean;
  isRevealed: boolean;
}

export interface CampaignMap {
  id: string;
  name: string;
  subtitle: string;
  regionType: 'regional' | 'tactical' | 'city';
  presetSvgType?: string;
  customImageUrl?: string;
  storageId?: string;
  pins: MapPin[];
  shapes?: MapDrawingShape[];
}

export interface CalendarMonth {
  id: string;
  name: string;
  days: number;
  season: string;
}

export interface CalendarMoon {
  id: string;
  name: string;
  cycleDays: number;
  offset: number;
  color: string;
  lore: string;
}

export interface CalendarConfig {
  calendarName: string;
  epochName: string; // ex: "EC (Era das Cinzas)"
  currentYear: number;
  currentMonthIndex: number;
  currentDay: number;
  weekdays: string[];
  months: CalendarMonth[];
  moons: CalendarMoon[];
  availableEras?: string[];
}

export type TimelineVisualTag = 'Batalha' | 'Política' | 'Mágica' | 'Marco do Grupo' | 'Cataclismo';

export interface TimelineEvent {
  id: string;
  title: string;
  year: number;
  monthIndex: number;
  day: number;
  epoch: string;
  category: 'historical' | 'session' | 'cataclysm' | 'intrigue';
  visualTag?: TimelineVisualTag;
  linkedWikiHandles?: string[];
  sortOrder?: number;
  sessionNumber?: number;
  description: string;
  isSecret: boolean;
  isRevealed: boolean;
}

export interface ThreatPortent {
  id: string;
  step: number;
  text: string;
  triggered: boolean;
}

export interface ThreatFront {
  id: string;
  name: string;
  subtitle: string;
  associatedEntityHandle: string; // ex: "@CultoCinzento"
  description: string;
  clockSegments: 4 | 6 | 8 | 12;
  clockFilled: number;
  impendingDoom: string;
  ignoreConsequence: string;
  grimPortents: ThreatPortent[];
  status: 'active' | 'triggered' | 'resolved';
  isSecret: boolean;
}

export interface SceneClue {
  id: string;
  name: string;
  description: string;
  targetSceneId: string;
  discovered: boolean;
  type: 'social' | 'investigation' | 'occult' | 'physical';
}

export interface MysterySceneNode {
  id: string;
  title: string;
  subtitle: string;
  locationHandle?: string; // ex: "#CaisAntigo"
  status: 'active' | 'visited' | 'unlocked' | 'locked';
  x: number;
  y: number;
  description: string;
  clues: SceneClue[];
}

export interface Combatant {
  id: string;
  name: string;
  type: 'pc' | 'npc' | 'monster';
  initiative: number;
  hp: number;
  maxHp: number;
  armorClass: number;
  conditions: string[];
  notes: string;
  entityId?: string;
}

export interface DiceRollLog {
  id: string;
  rollerName?: string;
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
  label: string;
  timestamp: string;
  isCrit?: boolean;
  isFumble?: boolean;
}

export interface QuestObjective {
  id: string;
  text: string;
  completed: boolean;
  isSecret?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  subtitle: string;
  giverHandle: string; // ex: "@CapitaoGuarda"
  locationHandle: string; // ex: "#RuinasNorte"
  status: 'active' | 'completed' | 'failed';
  isPublic: boolean;
  description: string;
  gmSecretNote?: string;
  reward: string;
  objectives: QuestObjective[];
}

export interface SessionJournalEntry {
  id: string;
  sessionNumber: number;
  title: string;
  inGameDate: string;
  author: string;
  content: string;
  isPublic: boolean;
}

export interface PersonalJournalNote {
  id: string;
  playerId: string;
  playerName: string;
  characterName: string;
  title: string;
  content: string;
  category: 'theory' | 'secret' | 'backstory' | 'goal';
  sharedWithDm: boolean;
  updatedAt: string;
}

export interface PartyInventoryItem {
  id: string;
  name: string;
  quantity: number;
  holder: string;
  category: 'weapon' | 'relic' | 'consumable' | 'document' | 'treasure';
  notes: string;
}

export interface StrongholdUpgrade {
  id: string;
  name: string;
  cost: string;
  benefit: string;
  installed: boolean;
}

export interface PartyResources {
  gold: number;
  silver: number;
  copper: number;
  rations: number;
  torches: number;
  healerKits: number;
  items: PartyInventoryItem[];
  stronghold: {
    name: string;
    type: string;
    locationHandle: string;
    integrity: number;
    maxIntegrity: number;
    upkeepPerMonth: string;
    description: string;
    upgrades: StrongholdUpgrade[];
  };
}

export interface ScratchpadLine {
  id: string;
  text: string;
  timestamp: string;
  convertedEntityHandle?: string;
}

export interface GeneratedEmergencyItem {
  id: string;
  type: 'npc' | 'tavern' | 'rumor' | 'loot';
  title: string;
  subtitle: string;
  details: { label: string; value: string; isSecret?: boolean }[];
  rawHandle: string;
  timestamp: string;
  aiGenerated?: boolean;
  contextUsed?: string;
}

// ============================================================================
// AUTH, HUBS & D&D 5e CHARACTER SHEETS
// ============================================================================

export type AppRoute =
  | '/login'
  | '/dm-dashboard'
  | '/player-dashboard'
  | '/campaign/session'
  | '/campaign/player-view';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'dm' | 'player';
  avatarUrl?: string;
}

export interface CampaignSummary {
  id: string;
  title: string;
  synopsis: string;
  worldContext?: string;
  system: string;
  tone: string;
  coverUrl: string;
  coverStorageId?: string;
  inviteCode: string;
  dmName: string;
  dmUserId?: string;
  isDm?: boolean;
  activePlayersCount: number;
  sessionsPlayed: number;
  updatedAt: string;
}

export interface CharacterSpell {
  id: string;
  index: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  prepared?: boolean;
}

export interface CharacterEquipmentItem {
  id: string;
  name: string;
  category: string;
  damage?: string;
  armorClass?: string;
  mastery?: string;
  weight?: string;
  quantity: number;
  equipped: boolean;
  notes?: string;
}

export interface CharacterFeature {
  level: number;
  name: string;
  source: string;
  description: string;
}

export interface CharacterClassResource {
  label: string;
  value: string;
}

export interface CharacterSpellSlots {
  level1: { used: number; max: number };
  level2: { used: number; max: number };
  level3: { used: number; max: number };
  level4?: { used: number; max: number };
  level5?: { used: number; max: number };
  level6?: { used: number; max: number };
  level7?: { used: number; max: number };
  level8?: { used: number; max: number };
  level9?: { used: number; max: number };
  pactSlots?: { level: number; used: number; max: number };
}

export type StatGenerationMethod = 'standard' | 'roll4d6' | 'random';

export interface CharacterSheet {
  id: string;
  playerId: string;
  playerName: string;
  campaignId: string;
  campaignTitle: string;
  name: string;
  avatarUrl?: string;
  race: string;
  racialTraits: string[];
  className: string;
  subclass?: string;
  level: number;
  background: string;
  alignment: string;
  hp: number;
  maxHp: number;
  tempHp: number;
  armorClass: number;
  speed: string;
  hitDice: string;
  hitDiceUsed: number;
  proficiencyBonus: number;
  passivePerception: number;
  statGenerationMethod?: StatGenerationMethod;
  baseStats?: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  proficiencies: string[];
  originFeat?: string;
  savingThrows?: string[];
  weaponMasteries?: string[];
  classFeatures?: CharacterFeature[];
  classResources?: CharacterClassResource[];
  spellSlots: CharacterSpellSlots;
  spells: CharacterSpell[];
  equipment: CharacterEquipmentItem[];
  notes: string;
  updatedAt: string;
}

export type ActiveModule = 'worldbuilding' | 'plots' | 'session' | 'portal';
export type ViewRole = 'gm' | 'player';
