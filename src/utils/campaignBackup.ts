import {
  CalendarConfig,
  CampaignMap,
  CampaignSummary,
  CharacterSheet,
  Entity,
  EntityCategory,
  GraphNodePosition,
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
import { sheetContentPayload } from './sheetPayload';

/**
 * Backup de campanha (formato `codex-backup`).
 *
 * Inclui: dados da campanha (sem código de convite), entradas do códice com segredos e atributos,
 * relações, posições e nós manuais do grafo, mapas (marcadores e desenhos), calendário, cronologia,
 * frentes, cenas e pistas, missões, diário coletivo, recursos do grupo e fichas vinculadas A ESTA campanha.
 *
 * NÃO inclui (e a importação não restaura): código de convite, membros, chaves de API, imagens enviadas
 * ao armazenamento (mapas e capas mantêm apenas a URL), notas pessoais dos jogadores, bloco de notas,
 * combate e histórico de dados. Também não restaura fixações de sessão de marcadores já removidos.
 */

export const BACKUP_FORMAT = 'codex-backup' as const;
export const LEGACY_BACKUP_FORMAT = 'obsidian-codex-backup';
export const BACKUP_VERSION = '3.0' as const;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export type BackupCampaignInfo = Pick<CampaignSummary, 'title' | 'synopsis' | 'system' | 'tone' | 'coverUrl'> & {
  worldContext?: string;
};

export interface CodexBackupPayload {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  campaign: BackupCampaignInfo;
  entities: Entity[];
  relationships: RelationshipEdge[];
  graphPositions: GraphNodePosition[];
  manualGraphNodes: ManualGraphNode[];
  maps: CampaignMap[];
  calendar: CalendarConfig | null;
  timeline: TimelineEvent[];
  fronts: ThreatFront[];
  mysteryNodes: MysterySceneNode[];
  quests: Quest[];
  journal: SessionJournalEntry[];
  partyResources: PartyResources | null;
  characterSheets: CharacterSheet[];
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugifyFilename(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'campanha'
  );
}

// ---------------------------------------------------------------------------
// Exportação JSON
// ---------------------------------------------------------------------------

export interface BackupSourceState {
  campaign: CampaignSummary;
  entities: Entity[];
  relationships: RelationshipEdge[];
  graphPositions: GraphNodePosition[];
  manualGraphNodes: ManualGraphNode[];
  maps: CampaignMap[];
  calendar: CalendarConfig;
  timeline: TimelineEvent[];
  fronts: ThreatFront[];
  mysteryNodes: MysterySceneNode[];
  quests: Quest[];
  journal: SessionJournalEntry[];
  partyResources: PartyResources;
  characterSheets: CharacterSheet[];
}

/** Monta o backup apenas com campos próprios do conteúdo (sem ids de servidor, convite ou segredos de conta). */
export function buildBackupPayload(src: BackupSourceState): CodexBackupPayload {
  const c = src.campaign;
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    campaign: {
      title: c.title,
      synopsis: c.synopsis,
      worldContext: c.worldContext || '',
      system: c.system,
      tone: c.tone,
      // Capas hospedadas no armazenamento não são portáveis; só URLs externas.
      coverUrl: /^https?:\/\//i.test(c.coverUrl || '') ? c.coverUrl : '',
    },
    entities: src.entities.map((e) => ({
      id: e.id,
      handle: e.handle,
      mentionPrefix: e.mentionPrefix,
      name: e.name,
      subtitle: e.subtitle,
      category: e.category,
      tags: e.tags,
      summary: e.summary,
      publicContent: e.publicContent,
      secrets: e.secrets.map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        isRevealed: s.isRevealed,
      })),
      attributes: e.attributes.map((a) => ({
        id: a.id,
        label: a.label,
        value: a.value,
        max: a.max,
        category: a.category,
      })),
      pinnedInSession: e.pinnedInSession,
      isPublicToPlayers: e.isPublicToPlayers,
      imageUrl: e.imageUrl,
      updatedAt: e.updatedAt,
    })),
    relationships: src.relationships.map((r) => ({
      id: r.id,
      sourceId: r.sourceId,
      targetId: r.targetId,
      label: r.label,
      type: r.type,
      notes: r.notes,
      isSecret: r.isSecret,
      isRevealed: r.isRevealed,
    })),
    graphPositions: src.graphPositions.map((p) => ({ entityId: p.entityId, x: p.x, y: p.y })),
    manualGraphNodes: src.manualGraphNodes.map((n) => ({
      id: n.id,
      label: n.label,
      subtitle: n.subtitle,
      category: n.category,
      entityId: n.entityId,
      x: n.x,
      y: n.y,
    })),
    maps: src.maps.map((m) => ({
      id: m.id,
      name: m.name,
      subtitle: m.subtitle,
      regionType: m.regionType,
      presetSvgType: m.presetSvgType,
      customImageUrl: /^https?:\/\//i.test(m.customImageUrl || '') ? m.customImageUrl : undefined,
      isPublicToPlayers: m.isPublicToPlayers,
      canvasTheme: m.canvasTheme,
      gridMode: m.gridMode,
      gridSize: m.gridSize,
      gridOpacity: m.gridOpacity,
      imageOpacity: m.imageOpacity,
      stageWidth: m.stageWidth,
      stageHeight: m.stageHeight,
      scalePer100Pct: m.scalePer100Pct,
      pins: m.pins,
      shapes: m.shapes,
    })),
    calendar: src.calendar,
    timeline: src.timeline,
    fronts: src.fronts,
    mysteryNodes: src.mysteryNodes,
    quests: src.quests,
    journal: src.journal.map((j) => ({
      id: j.id,
      sessionNumber: j.sessionNumber,
      title: j.title,
      inGameDate: j.inGameDate,
      author: j.author,
      content: j.content,
      isPublic: j.isPublic,
    })),
    partyResources: src.partyResources,
    // Somente fichas vinculadas a esta campanha (nunca as de outras campanhas do usuário).
    characterSheets: src.characterSheets
      .filter((s) => s.campaignId === c.id)
      // Só conteúdo da ficha (sem ids de usuário); o importador a recria em nome de quem importa.
      .map((s) => ({ ...sheetContentPayload(s), playerName: s.playerName }) as unknown as CharacterSheet),
  };
}

export function exportCampaignAsJson(src: BackupSourceState) {
  const payload = buildBackupPayload(src);
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `codex-${slugifyFilename(src.campaign.title)}-${dateTag}.json`;
  triggerFileDownload(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}

// ---------------------------------------------------------------------------
// Exportação Markdown
// ---------------------------------------------------------------------------

/** Escapa um valor para uma string YAML entre aspas duplas (uma linha). */
export function yamlString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, '\\n')
    .replace(/\t/g, '\\t')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]/g, ' ');
  return `"${escaped}"`;
}

/** Converte menções @Handle e #Handle em [[WikiLinks]] (compatível com Obsidian). */
function convertMentionsToWikiLinks(text: string, entities: Entity[]): string {
  return text.replace(/([@#][A-Za-zÀ-ÖØ-öø-ÿ0-9_]+)/g, (match) => {
    const raw = match.slice(1).toLowerCase();
    const found = entities.find((e) => e.handle.toLowerCase() === raw);
    return found ? `[[${found.name}|${match}]]` : `[[${match.slice(1)}]]`;
  });
}

export function exportCampaignAsMarkdown(payload: {
  campaign: CampaignSummary;
  entities: Entity[];
  fronts: ThreatFront[];
  quests: Quest[];
  journal: SessionJournalEntry[];
  characterSheets: CharacterSheet[];
  calendar: CalendarConfig;
  timeline: TimelineEvent[];
}) {
  const { campaign, entities, fronts, quests, journal, calendar, timeline } = payload;
  const sheets = payload.characterSheets.filter((s) => s.campaignId === campaign.id);
  const link = (t: string) => convertMentionsToWikiLinks(t, entities);

  const lines: string[] = [
    '---',
    `title: ${yamlString(campaign.title)}`,
    `system: ${yamlString(campaign.system)}`,
    `tone: ${yamlString(campaign.tone)}`,
    `dm: ${yamlString(campaign.dmName)}`,
    `exported_from: "Codex"`,
    `exported_at: ${yamlString(new Date().toISOString())}`,
    'tags: [rpg, campanha, codex]',
    '---',
    '',
    `# ${campaign.title}`,
    `> **Sistema:** ${campaign.system} | **Tom:** ${campaign.tone} | **Mestre:** ${campaign.dmName}`,
    `> **Data atual no mundo:** ${calendar.currentDay} de ${calendar.months[calendar.currentMonthIndex]?.name || 'Mês 1'}, ${calendar.currentYear} ${calendar.epochName}`,
    '',
    campaign.synopsis,
    '',
    '---',
    '## 1. Códice',
    '',
  ];

  for (const ent of entities) {
    lines.push(`### ${ent.name} (\`${ent.mentionPrefix}${ent.handle}\`)`);
    lines.push(
      `*${ent.subtitle}* — **Categoria:** \`${ent.category.toUpperCase()}\` | **Visibilidade:** ${
        ent.isPublicToPlayers ? 'Visível aos jogadores' : 'Oculto'
      } | **Tags:** ${ent.tags.map((t) => `#${t.replace(/\s+/g, '_')}`).join(' ')}`
    );
    lines.push('');
    if (ent.attributes.length > 0) {
      lines.push(ent.attributes.map((a) => `- **${a.label}:** ${a.value}${a.max ? `/${a.max}` : ''}`).join('\n'));
      lines.push('');
    }
    lines.push(link(ent.publicContent));
    lines.push('');
    for (const sec of ent.secrets) {
      lines.push(`> [!${sec.isRevealed ? 'info' : 'warning'}] Segredo (${sec.isRevealed ? 'revelado' : 'oculto'}): ${sec.title}`);
      lines.push(`> ${link(sec.content).replace(/\n/g, '\n> ')}`);
      lines.push('');
    }
  }

  lines.push('---', '## 2. Frentes e relógios', '');
  for (const front of fronts) {
    lines.push(`### ${front.name} [${front.clockFilled}/${front.clockSegments}] (${front.status.toUpperCase()})`);
    lines.push(`- **Vínculo:** ${link(front.associatedEntityHandle)}`);
    lines.push(`- **Destino:** ${front.impendingDoom}`);
    lines.push('');
    for (const gp of front.grimPortents) {
      lines.push(`- [${gp.triggered ? 'x' : ' '}] Passo ${gp.step}: ${gp.text}`);
    }
    lines.push('');
  }

  lines.push('---', '## 3. Missões', '');
  for (const q of quests) {
    lines.push(`### ${q.title} (${q.status.toUpperCase()})`);
    lines.push(link(q.description));
    lines.push(`- **Recompensa:** ${q.reward}`);
    for (const obj of q.objectives) lines.push(`- [${obj.completed ? 'x' : ' '}] ${obj.text}`);
    lines.push('');
  }

  lines.push('---', '## 4. Fichas do grupo', '');
  for (const cs of sheets) {
    lines.push(`### ${cs.name} — ${cs.race} ${cs.className} nv. ${cs.level} (jogador: ${cs.playerName})`);
    lines.push(`- **PV:** ${cs.hp}/${cs.maxHp} | **CA:** ${cs.armorClass} | **Percepção passiva:** ${cs.passivePerception}`);
    lines.push(
      `- **Atributos:** FOR ${cs.stats.str} | DES ${cs.stats.dex} | CON ${cs.stats.con} | INT ${cs.stats.int} | SAB ${cs.stats.wis} | CAR ${cs.stats.cha}`
    );
    lines.push('');
  }

  lines.push('---', '## 5. Cronologia e diário', '');
  for (const ev of timeline) {
    lines.push(`- **Ano ${ev.year} ${ev.epoch}:** **${ev.title}** — ${link(ev.description)}`);
  }
  lines.push('');
  for (const j of journal) {
    lines.push(`### Sessão ${j.sessionNumber}: ${j.title} (${j.inGameDate})`);
    lines.push(`*Crônica de ${j.author}*`);
    lines.push('');
    lines.push(link(j.content));
    lines.push('');
  }

  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `codex-${slugifyFilename(campaign.title)}-${dateTag}.md`;
  triggerFileDownload(filename, lines.join('\n'), 'text/markdown;charset=utf-8');
}

// ---------------------------------------------------------------------------
// Validação (escrita à mão, sem dependências)
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const optStr = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d = false): boolean => (typeof v === 'boolean' ? v : d);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const oneOf = <T extends string | number>(v: unknown, allowed: readonly T[], d: T): T =>
  (allowed as readonly unknown[]).includes(v) ? (v as T) : d;
const objArr = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);

const CATEGORIES: readonly EntityCategory[] = ['npc', 'faction', 'location', 'item', 'monster', 'lore'];

class Skips {
  counts = new Map<string, number>();
  add(label: string) {
    this.counts.set(label, (this.counts.get(label) || 0) + 1);
  }
  toWarnings(): string[] {
    return Array.from(this.counts.entries()).map(([label, n]) => `${n} ${label} ignorado(s) por formato inválido.`);
  }
}

function mapList<T>(raw: unknown, label: string, skips: Skips, fn: (o: Obj, index: number) => T | null): T[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    skips.add(label);
    return [];
  }
  const out: T[] = [];
  raw.forEach((item, i) => {
    const r = isObj(item) ? fn(item, i) : null;
    if (r) out.push(r);
    else skips.add(label);
  });
  return out;
}

function normPoint(p: Obj) {
  return { x: num(p.x), y: num(p.y) };
}

function normShape(o: Obj, i: number): MapDrawingShape | null {
  const type = oneOf(
    o.type,
    [
      'road',
      'river',
      'polygon',
      'circle',
      'rect',
      'text',
      'fog',
      'fog_poly',
      'freehand',
      'highlighter',
      'arrow',
      'sticky',
      'frame',
      'stamp',
    ] as const,
    'polygon'
  );
  return {
    id: str(o.id, `shape-${i}`),
    type,
    label: str(o.label),
    color: str(o.color, '#71717a'),
    fillColor: optStr(o.fillColor),
    strokeWidth: num(o.strokeWidth, 2),
    strokeStyle:
      o.strokeStyle === 'solid' || o.strokeStyle === 'dashed' || o.strokeStyle === 'dotted'
        ? o.strokeStyle
        : undefined,
    dashed: typeof o.dashed === 'boolean' ? o.dashed : undefined,
    opacity: typeof o.opacity === 'number' ? o.opacity : undefined,
    fontSize: typeof o.fontSize === 'number' ? o.fontSize : undefined,
    fontFamily:
      o.fontFamily === 'sans' || o.fontFamily === 'serif' || o.fontFamily === 'mono'
        ? o.fontFamily
        : undefined,
    fontWeight: o.fontWeight === 'normal' || o.fontWeight === 'bold' ? o.fontWeight : undefined,
    fontStyle: o.fontStyle === 'normal' || o.fontStyle === 'italic' ? o.fontStyle : undefined,
    textAlign:
      o.textAlign === 'left' || o.textAlign === 'center' || o.textAlign === 'right'
        ? o.textAlign
        : undefined,
    rotation: typeof o.rotation === 'number' ? o.rotation : undefined,
    arrowStart: typeof o.arrowStart === 'boolean' ? o.arrowStart : undefined,
    arrowEnd: typeof o.arrowEnd === 'boolean' ? o.arrowEnd : undefined,
    curved: typeof o.curved === 'boolean' ? o.curved : undefined,
    stampType: optStr(o.stampType),
    locked: typeof o.locked === 'boolean' ? o.locked : undefined,
    zIndex: typeof o.zIndex === 'number' ? o.zIndex : undefined,
    closed: typeof o.closed === 'boolean' ? o.closed : undefined,
    entityId: optStr(o.entityId),
    linkedEntityIds: Array.isArray(o.linkedEntityIds) ? strArr(o.linkedEntityIds) : undefined,
    points: objArr(o.points).map(normPoint),
    radius: typeof o.radius === 'number' ? o.radius : undefined,
    width: typeof o.width === 'number' ? o.width : undefined,
    height: typeof o.height === 'number' ? o.height : undefined,
    isSecret: bool(o.isSecret),
    isRevealed: bool(o.isRevealed),
  };
}

function normPin(o: Obj, i: number): MapPin | null {
  return {
    id: str(o.id, `pin-${i}`),
    x: num(o.x),
    y: num(o.y),
    label: str(o.label),
    subtitle: str(o.subtitle),
    entityId: optStr(o.entityId),
    linkedEntityIds: Array.isArray(o.linkedEntityIds) ? strArr(o.linkedEntityIds) : undefined,
    linkedMapId: optStr(o.linkedMapId),
    layer: oneOf(o.layer, ['locations', 'dangers', 'secrets', 'quests'] as const, 'locations'),
    iconType: oneOf(
      o.iconType,
      ['castle', 'city', 'village', 'tavern', 'dungeon', 'skull', 'ruins', 'camp', 'secret', 'quest', 'shrine', 'port', 'portal', 'shop', 'party'] as const,
      'city'
    ),
    description: str(o.description),
    monsters: strArr(o.monsters),
    treasures: strArr(o.treasures),
    secretNote: optStr(o.secretNote),
    isSecret: bool(o.isSecret, true),
    isRevealed: bool(o.isRevealed),
  };
}

function normCalendar(raw: unknown): CalendarConfig | null {
  if (!isObj(raw)) return null;
  const months = objArr(raw.months).map((m, i) => ({
    id: str(m.id, `m${i + 1}`),
    name: str(m.name, `Mês ${i + 1}`),
    days: Math.max(1, Math.floor(num(m.days, 30))),
    season: str(m.season),
  }));
  if (months.length === 0) return null;
  return {
    calendarName: str(raw.calendarName, 'Calendário da Campanha'),
    epochName: str(raw.epochName, 'Era Atual'),
    currentYear: num(raw.currentYear, 1),
    currentMonthIndex: Math.min(months.length - 1, Math.max(0, Math.floor(num(raw.currentMonthIndex)))),
    currentDay: Math.max(1, Math.floor(num(raw.currentDay, 1))),
    weekdays: strArr(raw.weekdays),
    months,
    moons: objArr(raw.moons).map((m, i) => ({
      id: str(m.id, `moon-${i + 1}`),
      name: str(m.name, `Lua ${i + 1}`),
      cycleDays: Math.max(1, num(m.cycleDays, 28)),
      offset: num(m.offset),
      color: str(m.color, '#e2e8f0'),
      lore: str(m.lore),
    })),
    availableEras: Array.isArray(raw.availableEras) ? strArr(raw.availableEras) : undefined,
  };
}

function normResources(raw: unknown): PartyResources | null {
  if (!isObj(raw)) return null;
  const sh = isObj(raw.stronghold) ? raw.stronghold : {};
  return {
    gold: num(raw.gold),
    silver: num(raw.silver),
    copper: num(raw.copper),
    rations: num(raw.rations),
    torches: num(raw.torches),
    healerKits: num(raw.healerKits),
    items: objArr(raw.items).map((it, i) => ({
      id: str(it.id, `item-${i}`),
      name: str(it.name, 'Item'),
      quantity: Math.max(0, num(it.quantity, 1)),
      holder: str(it.holder),
      category: oneOf(it.category, ['weapon', 'relic', 'consumable', 'document', 'treasure'] as const, 'treasure'),
      notes: str(it.notes),
    })),
    stronghold: {
      name: str(sh.name, 'Base da Companhia'),
      type: str(sh.type, 'Refúgio'),
      locationHandle: str(sh.locationHandle),
      integrity: num(sh.integrity, 100),
      maxIntegrity: num(sh.maxIntegrity, 100),
      upkeepPerMonth: str(sh.upkeepPerMonth, '0 PO'),
      description: str(sh.description),
      upgrades: objArr(sh.upgrades).map((u, i) => ({
        id: str(u.id, `upg-${i}`),
        name: str(u.name, 'Melhoria'),
        cost: str(u.cost),
        benefit: str(u.benefit),
        installed: bool(u.installed),
      })),
    },
  };
}

/** Valida e normaliza o conteúdo de um backup. Lança Error (PT-BR) se o arquivo não é um backup do Codex. */
export function validateBackup(raw: unknown): { payload: CodexBackupPayload; warnings: string[] } {
  if (!isObj(raw)) throw new Error('Arquivo inválido: o conteúdo não é um backup do Codex.');
  if (raw.format !== BACKUP_FORMAT && raw.format !== LEGACY_BACKUP_FORMAT) {
    throw new Error('Arquivo inválido: formato não reconhecido. Selecione um backup exportado pelo Codex.');
  }
  if (!isObj(raw.campaign) || !str(raw.campaign.title).trim()) {
    throw new Error('Arquivo inválido: o backup não contém os dados da campanha.');
  }

  const skips = new Skips();
  const c = raw.campaign;

  const entities = mapList(raw.entities, 'entrada(s) do códice', skips, (o, i): Entity | null => {
    const name = str(o.name).trim();
    if (!name) return null;
    const category = oneOf(o.category, CATEGORIES, 'lore');
    return {
      id: str(o.id, `bk-ent-${i}`),
      handle: str(o.handle),
      mentionPrefix: oneOf(o.mentionPrefix, ['@', '#'] as const, category === 'npc' || category === 'faction' || category === 'monster' ? '@' : '#'),
      name,
      subtitle: str(o.subtitle),
      category,
      tags: strArr(o.tags),
      summary: str(o.summary),
      publicContent: str(o.publicContent),
      secrets: objArr(o.secrets).map((s, j) => ({
        id: str(s.id, `bk-sec-${i}-${j}`),
        title: str(s.title, 'Segredo'),
        content: str(s.content),
        isRevealed: bool(s.isRevealed),
      })),
      attributes: objArr(o.attributes)
        .filter((a) => str(a.label) !== '')
        .map((a, j) => ({
          id: str(a.id, `bk-attr-${i}-${j}`),
          label: str(a.label),
          value: typeof a.value === 'number' ? a.value : str(a.value),
          max: typeof a.max === 'number' ? a.max : undefined,
          category: oneOf(a.category, ['stat', 'resource', 'meta'] as const, 'stat'),
        })),
      pinnedInSession: bool(o.pinnedInSession),
      // Ausente no arquivo = oculto (nunca presume visibilidade pública).
      isPublicToPlayers: bool(o.isPublicToPlayers, false),
      imageUrl: optStr(o.imageUrl),
      updatedAt: str(o.updatedAt),
    };
  });

  const relationships = mapList(raw.relationships, 'relação(ões)', skips, (o, i): RelationshipEdge | null => {
    if (!str(o.sourceId) || !str(o.targetId)) return null;
    return {
      id: str(o.id, `bk-rel-${i}`),
      sourceId: str(o.sourceId),
      targetId: str(o.targetId),
      label: str(o.label),
      type: oneOf(o.type, ['hostile', 'allied', 'secret', 'neutral', 'patron', 'blood'] as const, 'neutral'),
      notes: optStr(o.notes),
      isSecret: bool(o.isSecret, true),
      isRevealed: bool(o.isRevealed),
    };
  });

  const graphPositions = mapList(raw.graphPositions, 'posição(ões) do grafo', skips, (o): GraphNodePosition | null =>
    str(o.entityId) ? { entityId: str(o.entityId), x: num(o.x), y: num(o.y) } : null
  );

  const manualGraphNodes = mapList(raw.manualGraphNodes, 'nó(s) manual(is)', skips, (o, i): ManualGraphNode | null =>
    str(o.label)
      ? {
          id: str(o.id, `bk-gnode-${i}`),
          label: str(o.label),
          subtitle: optStr(o.subtitle),
          category: oneOf(o.category, ['npc', 'faction', 'location', 'player', 'item', 'monster', 'lore', 'note'] as const, 'note'),
          entityId: optStr(o.entityId),
          x: num(o.x),
          y: num(o.y),
        }
      : null
  );

  const maps = mapList(raw.maps, 'mapa(s)', skips, (o, i): CampaignMap | null => {
    if (!str(o.name).trim()) return null;
    return {
      id: str(o.id, `bk-map-${i}`),
      name: str(o.name),
      subtitle: str(o.subtitle),
      regionType: oneOf(o.regionType, ['regional', 'tactical', 'city'] as const, 'regional'),
      presetSvgType: optStr(o.presetSvgType),
      customImageUrl: /^https?:\/\//i.test(str(o.customImageUrl)) ? str(o.customImageUrl) : undefined,
      isPublicToPlayers: typeof o.isPublicToPlayers === 'boolean' ? o.isPublicToPlayers : undefined,
      canvasTheme:
        o.canvasTheme === 'obsidian' ||
        o.canvasTheme === 'parchment' ||
        o.canvasTheme === 'paper' ||
        o.canvasTheme === 'blueprint'
          ? o.canvasTheme
          : undefined,
      gridMode:
        o.gridMode === 'off' || o.gridMode === 'dots' || o.gridMode === 'square' || o.gridMode === 'hex'
          ? o.gridMode
          : undefined,
      gridSize: typeof o.gridSize === 'number' ? o.gridSize : undefined,
      gridOpacity: typeof o.gridOpacity === 'number' ? o.gridOpacity : undefined,
      imageOpacity: typeof o.imageOpacity === 'number' ? o.imageOpacity : undefined,
      stageWidth: typeof o.stageWidth === 'number' ? o.stageWidth : undefined,
      stageHeight: typeof o.stageHeight === 'number' ? o.stageHeight : undefined,
      scalePer100Pct: typeof o.scalePer100Pct === 'number' ? o.scalePer100Pct : undefined,
      pins: objArr(o.pins).map(normPin).filter((p): p is MapPin => p !== null),
      shapes: objArr(o.shapes).map(normShape).filter((s): s is MapDrawingShape => s !== null),
    };
  });

  const timeline = mapList(raw.timeline, 'evento(s) da cronologia', skips, (o, i): TimelineEvent | null =>
    str(o.title).trim()
      ? {
          id: str(o.id, `bk-ev-${i}`),
          title: str(o.title),
          year: num(o.year, 1),
          monthIndex: Math.max(0, Math.floor(num(o.monthIndex))),
          day: Math.max(1, Math.floor(num(o.day, 1))),
          epoch: str(o.epoch),
          category: oneOf(o.category, ['historical', 'session', 'cataclysm', 'intrigue'] as const, 'historical'),
          visualTag: oneOf(o.visualTag, ['Batalha', 'Política', 'Mágica', 'Marco do Grupo', 'Cataclismo', ''] as const, '') || undefined,
          linkedWikiHandles: Array.isArray(o.linkedWikiHandles) ? strArr(o.linkedWikiHandles) : undefined,
          sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : undefined,
          sessionNumber: typeof o.sessionNumber === 'number' ? o.sessionNumber : undefined,
          description: str(o.description),
          isSecret: bool(o.isSecret, true),
          isRevealed: bool(o.isRevealed),
        }
      : null
  );

  const fronts = mapList(raw.fronts, 'frente(s)', skips, (o, i): ThreatFront | null =>
    str(o.name).trim()
      ? {
          id: str(o.id, `bk-front-${i}`),
          name: str(o.name),
          subtitle: str(o.subtitle),
          associatedEntityHandle: str(o.associatedEntityHandle),
          description: str(o.description),
          clockSegments: oneOf(o.clockSegments, [4, 6, 8, 12] as const, 6),
          clockFilled: Math.max(0, num(o.clockFilled)),
          impendingDoom: str(o.impendingDoom),
          ignoreConsequence: str(o.ignoreConsequence),
          grimPortents: objArr(o.grimPortents).map((g, j) => ({
            id: str(g.id, `bk-portent-${i}-${j}`),
            step: num(g.step, j + 1),
            text: str(g.text),
            triggered: bool(g.triggered),
          })),
          status: oneOf(o.status, ['active', 'triggered', 'resolved'] as const, 'active'),
          isSecret: bool(o.isSecret, true),
        }
      : null
  );

  const mysteryNodes = mapList(raw.mysteryNodes, 'cena(s)', skips, (o, i): MysterySceneNode | null =>
    str(o.title).trim()
      ? {
          id: str(o.id, `bk-scene-${i}`),
          title: str(o.title),
          subtitle: str(o.subtitle),
          locationHandle: optStr(o.locationHandle),
          status: oneOf(o.status, ['active', 'visited', 'unlocked', 'locked'] as const, 'locked'),
          x: num(o.x),
          y: num(o.y),
          description: str(o.description),
          clues: objArr(o.clues).map((cl, j) => ({
            id: str(cl.id, `bk-clue-${i}-${j}`),
            name: str(cl.name),
            description: str(cl.description),
            targetSceneId: str(cl.targetSceneId),
            discovered: bool(cl.discovered),
            type: oneOf(cl.type, ['social', 'investigation', 'occult', 'physical'] as const, 'investigation'),
          })),
        }
      : null
  );

  const quests = mapList(raw.quests, 'missão(ões)', skips, (o, i): Quest | null =>
    str(o.title).trim()
      ? {
          id: str(o.id, `bk-quest-${i}`),
          title: str(o.title),
          subtitle: str(o.subtitle),
          giverHandle: str(o.giverHandle),
          locationHandle: str(o.locationHandle),
          status: oneOf(o.status, ['active', 'completed', 'failed'] as const, 'active'),
          isPublic: bool(o.isPublic, false),
          description: str(o.description),
          gmSecretNote: optStr(o.gmSecretNote),
          reward: str(o.reward),
          objectives: objArr(o.objectives).map((ob, j) => ({
            id: str(ob.id, `bk-obj-${i}-${j}`),
            text: str(ob.text),
            completed: bool(ob.completed),
            isSecret: bool(ob.isSecret),
          })),
        }
      : null
  );

  const journal = mapList(raw.journal, 'crônica(s)', skips, (o, i): SessionJournalEntry | null =>
    str(o.title).trim()
      ? {
          id: str(o.id, `bk-jour-${i}`),
          sessionNumber: Math.max(0, Math.floor(num(o.sessionNumber, i + 1))),
          title: str(o.title),
          inGameDate: str(o.inGameDate),
          author: str(o.author),
          content: str(o.content),
          isPublic: bool(o.isPublic, false),
        }
      : null
  );

  const characterSheets = mapList(raw.characterSheets, 'ficha(s)', skips, (o): CharacterSheet | null =>
    str(o.name).trim() && isObj(o.stats) ? (o as unknown as CharacterSheet) : null
  );

  const payload: CodexBackupPayload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: str(raw.exportedAt, new Date().toISOString()),
    campaign: {
      title: str(c.title).trim().slice(0, 120),
      synopsis: str(c.synopsis),
      worldContext: str(c.worldContext),
      system: str(c.system, 'D&D 5.5e (2024)'),
      tone: str(c.tone, 'Fantasia'),
      coverUrl: /^https?:\/\//i.test(str(c.coverUrl)) ? str(c.coverUrl) : '',
    },
    entities,
    relationships,
    graphPositions,
    manualGraphNodes,
    maps,
    calendar: normCalendar(raw.calendar),
    timeline,
    fronts,
    mysteryNodes,
    quests,
    journal,
    partyResources: normResources(raw.partyResources),
    characterSheets,
  };

  const warnings = skips.toWarnings();
  if (raw.format === LEGACY_BACKUP_FORMAT) {
    warnings.unshift('Backup no formato antigo (obsidian-codex-backup): importado com as regras atuais.');
  }
  return { payload, warnings };
}

export async function parseCampaignJsonFile(
  file: File
): Promise<{ payload: CodexBackupPayload; warnings: string[] }> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new Error('Arquivo grande demais: o limite para backups é de 10 MB.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Arquivo inválido: o conteúdo não é um JSON legível.');
  }
  return validateBackup(parsed);
}
