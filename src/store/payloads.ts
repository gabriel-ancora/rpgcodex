/**
 * Montagem dos corpos das mutations do Convex. Usada pelas ações da store e pela
 * importação de backup, para que as duas gravem exatamente os mesmos campos.
 * Os corpos NÃO incluem `sessionToken`/`campaignId`; o chamador os acrescenta.
 */
import type { Id } from '../../convex/_generated/dataModel';
import type {
  CalendarConfig,
  CampaignMap,
  Combatant,
  Entity,
  ManualGraphNode,
  MapDrawingShape,
  MapPin,
  MysterySceneNode,
  PartyResources,
  Quest,
  RelationshipEdge,
  SessionJournalEntry,
  ThreatFront,
  TimelineEvent,
} from '../types/campaign';

export const slugHandle = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

export function mentionPrefixFor(category: Entity['category']): '@' | '#' {
  return category === 'npc' || category === 'faction' || category === 'monster' ? '@' : '#';
}

type NewEntity = Pick<
  Entity,
  | 'handle'
  | 'mentionPrefix'
  | 'name'
  | 'subtitle'
  | 'category'
  | 'tags'
  | 'summary'
  | 'publicContent'
  | 'pinnedInSession'
  | 'isPublicToPlayers'
  | 'imageUrl'
  | 'secrets'
  | 'attributes'
>;

export const entityCreateBody = (e: NewEntity) => ({
  handle: e.handle,
  mentionPrefix: e.mentionPrefix,
  name: e.name,
  subtitle: e.subtitle,
  category: e.category,
  tags: e.tags,
  summary: e.summary,
  publicContent: e.publicContent,
  pinnedInSession: Boolean(e.pinnedInSession),
  // Explícito: nunca presume visibilidade pública.
  isPublicToPlayers: e.isPublicToPlayers === true,
  imageUrl: e.imageUrl,
  initialSecrets: e.secrets.map((s) => ({
    title: s.title,
    content: s.content,
    isRevealed: Boolean(s.isRevealed),
  })),
  initialAttributes: e.attributes.map((a) => ({
    label: a.label,
    value: a.value,
    max: a.max,
    category: a.category,
  })),
});

export const entityUpdateBody = (u: Partial<Entity>) => ({
  name: u.name,
  subtitle: u.subtitle,
  summary: u.summary,
  publicContent: u.publicContent,
  tags: u.tags,
  pinnedInSession: u.pinnedInSession,
  isPublicToPlayers: u.isPublicToPlayers,
  imageUrl: u.imageUrl,
});

export const mapCreateBody = (
  m: Pick<CampaignMap, 'name' | 'subtitle' | 'regionType' | 'presetSvgType' | 'customImageUrl'>,
  storageId?: Id<'_storage'>
) => ({
  name: m.name,
  subtitle: m.subtitle,
  regionType: m.regionType,
  presetSvgType: m.presetSvgType,
  customImageUrl: m.customImageUrl,
  storageId,
});

export const pinCreateBody = (pin: Omit<MapPin, 'id'>) => ({
  x: pin.x,
  y: pin.y,
  label: pin.label,
  subtitle: pin.subtitle,
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

export const pinUpdateBody = (u: Partial<MapPin>) => ({
  x: u.x,
  y: u.y,
  label: u.label,
  subtitle: u.subtitle,
  linkedMapId: u.linkedMapId,
  layer: u.layer,
  iconType: u.iconType,
  description: u.description,
  monsters: u.monsters,
  treasures: u.treasures,
  secretNote: u.secretNote,
  isSecret: u.isSecret,
  isRevealed: u.isRevealed,
});

/** Remove campos `undefined` e valores que o Convex não aceita nas formas vetoriais. */
export const shapesBody = (shapes: MapDrawingShape[]) =>
  shapes.map((s) => JSON.parse(JSON.stringify(s)) as MapDrawingShape);

export const relationshipCreateBody = (edge: Omit<RelationshipEdge, 'id'>) => ({
  label: edge.label,
  type: edge.type,
  notes: edge.notes,
  isSecret: Boolean(edge.isSecret),
  isRevealed: Boolean(edge.isRevealed),
});

export const manualNodeBody = (node: Omit<ManualGraphNode, 'id'>) => ({
  label: node.label,
  subtitle: node.subtitle,
  category: node.category,
  x: node.x,
  y: node.y,
});

export const calendarBody = (c: Partial<CalendarConfig>) => ({
  calendarName: c.calendarName,
  epochName: c.epochName,
  currentYear: c.currentYear,
  currentMonthIndex: c.currentMonthIndex,
  currentDay: c.currentDay,
  weekdays: c.weekdays,
  months: c.months?.map((m) => ({ id: m.id, name: m.name, days: m.days, season: m.season })),
  moons: c.moons?.map((mn) => ({
    id: mn.id,
    name: mn.name,
    cycleDays: mn.cycleDays,
    offset: mn.offset,
    color: mn.color,
    lore: mn.lore,
  })),
  availableEras: c.availableEras,
});

export const eventCreateBody = (ev: Omit<TimelineEvent, 'id'>, fallbackEpoch: string, sortOrder: number) => ({
  year: ev.year,
  monthIndex: ev.monthIndex,
  day: ev.day,
  epoch: ev.epoch || fallbackEpoch,
  category: ev.category || ('historical' as const),
  visualTag: ev.visualTag,
  linkedWikiHandles: ev.linkedWikiHandles,
  sortOrder,
  sessionNumber: ev.sessionNumber,
  title: ev.title,
  description: ev.description,
  isSecret: Boolean(ev.isSecret),
  isRevealed: Boolean(ev.isRevealed),
});

export const eventUpdateBody = (u: Partial<TimelineEvent>) => ({
  year: u.year,
  monthIndex: u.monthIndex,
  day: u.day,
  epoch: u.epoch,
  category: u.category,
  visualTag: u.visualTag,
  linkedWikiHandles: u.linkedWikiHandles,
  sessionNumber: u.sessionNumber,
  title: u.title,
  description: u.description,
  isSecret: u.isSecret,
  isRevealed: u.isRevealed,
});

export const frontCreateBody = (f: Omit<ThreatFront, 'id'>) => ({
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

export const frontUpdateBody = (u: Partial<ThreatFront>) => ({
  name: u.name,
  subtitle: u.subtitle,
  associatedEntityHandle: u.associatedEntityHandle,
  description: u.description,
  clockSegments: u.clockSegments,
  clockFilled: u.clockFilled,
  impendingDoom: u.impendingDoom,
  ignoreConsequence: u.ignoreConsequence,
  grimPortents: u.grimPortents,
  status: u.status,
  isSecret: u.isSecret,
});

export const sceneCreateBody = (
  s: Pick<MysterySceneNode, 'title' | 'subtitle' | 'locationHandle' | 'status' | 'x' | 'y' | 'description'>
) => ({
  title: s.title,
  subtitle: s.subtitle,
  locationHandle: s.locationHandle,
  status: s.status,
  x: s.x,
  y: s.y,
  description: s.description,
});

export const questCreateBody = (q: Omit<Quest, 'id'>) => ({
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

export const journalCreateBody = (j: Omit<SessionJournalEntry, 'id'>) => ({
  sessionNumber: j.sessionNumber,
  title: j.title,
  inGameDate: j.inGameDate,
  author: j.author,
  content: j.content,
  isPublic: Boolean(j.isPublic),
});

export const combatantCreateBody = (c: Omit<Combatant, 'id'>) => ({
  name: c.name,
  type: c.type,
  initiative: c.initiative,
  hp: c.hp ?? 0,
  maxHp: c.maxHp ?? 0,
  armorClass: c.armorClass ?? 10,
  conditions: c.conditions,
  notes: c.notes ?? '',
  isHidden: Boolean(c.isHidden),
});

export const resourcesBody = (r: PartyResources) => ({
  gold: r.gold,
  silver: r.silver,
  copper: r.copper,
  rations: r.rations,
  torches: r.torches,
  healerKits: r.healerKits,
  items: r.items || [],
  stronghold: r.stronghold,
});
