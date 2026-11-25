import type {
  Entity,
  ManualGraphNode,
  Quest,
  RelationType,
  RelationshipEdge,
  ThreatFront,
} from '../../../types/campaign';
import type { AiSuggestedRelationship } from '../../../services/geminiService';

export type NodeCategory =
  | 'npc'
  | 'faction'
  | 'location'
  | 'player'
  | 'item'
  | 'monster'
  | 'lore'
  | 'note';

export interface UnifiedGraphNode {
  id: string;
  label: string;
  subtitle: string;
  roleOrTag?: string;
  category: NodeCategory;
  isManual: boolean;
  entityId?: string;
  isHiddenFromPlayers?: boolean;
  summary?: string;
}

export type GraphLayoutMode = 'force' | 'hierarchical' | 'radial' | 'clusters';

export const RELATION_META: Record<
  RelationType,
  {
    label: string;
    badge: string;
    stroke: string;
    pillBorder: string;
    dashed?: boolean;
  }
> = {
  hostile: {
    label: 'Hostilidade / Rivalidade',
    badge: 'badge-danger',
    stroke: '#e5484d',
    pillBorder: 'rgba(229, 72, 77, 0.45)',
  },
  allied: {
    label: 'Aliança / Lealdade',
    badge: 'badge-success',
    stroke: '#22a06b',
    pillBorder: 'rgba(34, 160, 107, 0.45)',
  },
  secret: {
    label: 'Conspiração / Segredo',
    badge: 'badge-warning',
    stroke: '#a855f7',
    pillBorder: 'rgba(168, 85, 247, 0.45)',
    dashed: true,
  },
  patron: {
    label: 'Domínio / Hierarquia',
    badge: 'badge-info',
    stroke: '#d99a1c',
    pillBorder: 'rgba(217, 154, 28, 0.45)',
  },
  blood: {
    label: 'Sangue / Linhagem',
    badge: 'badge-accent',
    stroke: '#ec4899',
    pillBorder: 'rgba(236, 72, 153, 0.45)',
  },
  neutral: {
    label: 'Comercial / Neutro',
    badge: '',
    stroke: '#71717a',
    pillBorder: 'rgba(113, 113, 122, 0.4)',
  },
};

export const NODE_CATEGORY_META: Record<
  NodeCategory,
  {
    badge: string;
    pluralLabel: string;
    color: string;
    tier: number; // for hierarchical layout (0 = top, 3 = bottom)
  }
> = {
  faction: { badge: 'Facção', pluralLabel: 'Facções', color: '#f59e0b', tier: 0 },
  location: { badge: 'Local', pluralLabel: 'Locais', color: '#10b981', tier: 1 },
  player: { badge: 'PJ', pluralLabel: 'Jogadores', color: '#38bdf8', tier: 1 },
  npc: { badge: 'NPC', pluralLabel: 'NPCs', color: '#818cf8', tier: 2 },
  monster: { badge: 'Ameaça', pluralLabel: 'Ameaças', color: '#ef4444', tier: 2 },
  item: { badge: 'Item', pluralLabel: 'Itens', color: '#eab308', tier: 3 },
  lore: { badge: 'Lore', pluralLabel: 'Lore', color: '#a855f7', tier: 3 },
  note: { badge: 'Nota', pluralLabel: 'Notas', color: '#94a3b8', tier: 3 },
};

export const GRAPH_CANVAS_CENTER = { x: 900, y: 560 };

// ============================================================================
// PROFESSIONAL GRAPH LAYOUT ALGORITHMS
// ============================================================================

/** Minimum pixel separation between two node centers so cards never overlap. */
const MIN_NODE_DIST_X = 210;
const MIN_NODE_DIST_Y = 128;

function resolveCollisions(
  pos: Map<string, { x: number; y: number }>,
  ids: string[],
  passes = 18
) {
  for (let iter = 0; iter < passes; iter++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!;
        const b = pos.get(ids[j])!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = MIN_NODE_DIST_X - Math.abs(dx);
        const overlapY = MIN_NODE_DIST_Y - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          moved = true;
          if (overlapX < overlapY) {
            const sign = dx === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dx);
            const push = overlapX * 0.52;
            a.x -= sign * push;
            b.x += sign * push;
          } else {
            const sign = dy === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dy);
            const push = overlapY * 0.52;
            a.y -= sign * push;
            b.y += sign * push;
          }
        }
      }
    }
    if (!moved) break;
  }
}

function recenterPositions(
  pos: Map<string, { x: number; y: number }>,
  cx = GRAPH_CANVAS_CENTER.x,
  cy = GRAPH_CANVAS_CENTER.y
): { entityId: string; x: number; y: number }[] {
  const entries = Array.from(pos.entries());
  if (entries.length === 0) return [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [, p] of entries) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const shiftX = cx - (minX + maxX) / 2;
  const shiftY = cy - (minY + maxY) / 2;
  return entries.map(([entityId, p]) => ({
    entityId,
    x: Math.round(p.x + shiftX),
    y: Math.round(p.y + shiftY),
  }));
}

export function computeGraphLayout(
  mode: GraphLayoutMode,
  nodes: UnifiedGraphNode[],
  edges: RelationshipEdge[],
  focusNodeId?: string
): { entityId: string; x: number; y: number }[] {
  if (nodes.length === 0) return [];
  const nodeIds = nodes.map((n) => n.id);
  const nodeSet = new Set(nodeIds);
  const validEdges = edges.filter(
    (e) => nodeSet.has(e.sourceId) && nodeSet.has(e.targetId) && e.sourceId !== e.targetId
  );

  // Adjacency & degree lookup
  const adj = new Map<string, Set<string>>();
  for (const id of nodeIds) adj.set(id, new Set());
  for (const e of validEdges) {
    adj.get(e.sourceId)!.add(e.targetId);
    adj.get(e.targetId)!.add(e.sourceId);
  }

  const pos = new Map<string, { x: number; y: number }>();

  // -------------------------------------------------------------------------
  // 1. RADIAL / EGO-CENTRIC ORBITS
  // -------------------------------------------------------------------------
  if (mode === 'radial') {
    let centerId =
      focusNodeId && nodeSet.has(focusNodeId) ? focusNodeId : '';
    if (!centerId) {
      // Pick highest-degree hub
      centerId = [...nodeIds].sort(
        (a, b) => (adj.get(b)?.size || 0) - (adj.get(a)?.size || 0)
      )[0];
    }

    // BFS distance from centerId
    const dist = new Map<string, number>([[centerId, 0]]);
    const queue = [centerId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const d = dist.get(curr)!;
      for (const nb of adj.get(curr) || []) {
        if (!dist.has(nb)) {
          dist.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }

    const rings = new Map<number, UnifiedGraphNode[]>();
    const disconnected: UnifiedGraphNode[] = [];
    for (const n of nodes) {
      const d = dist.get(n.id);
      if (d === undefined) {
        disconnected.push(n);
      } else {
        const list = rings.get(d) || [];
        list.push(n);
        rings.set(d, list);
      }
    }

    pos.set(centerId, { x: GRAPH_CANVAS_CENTER.x, y: GRAPH_CANVAS_CENTER.y });
    const sortedRings = Array.from(rings.keys())
      .filter((r) => r > 0)
      .sort((a, b) => a - b);

    let maxRadiusUsed = 0;
    for (const rIdx of sortedRings) {
      const ringNodes = rings.get(rIdx)!;
      const minCircumference = ringNodes.length * 215;
      const radius = Math.max(rIdx * 245, minCircumference / (2 * Math.PI));
      maxRadiusUsed = Math.max(maxRadiusUsed, radius);
      ringNodes.forEach((n, idx) => {
        const angle = (idx / ringNodes.length) * Math.PI * 2 - Math.PI / 2;
        pos.set(n.id, {
          x: GRAPH_CANVAS_CENTER.x + Math.cos(angle) * radius,
          y: GRAPH_CANVAS_CENTER.y + Math.sin(angle) * radius * 0.84,
        });
      });
    }

    if (disconnected.length > 0) {
      const outerR = maxRadiusUsed + 250;
      disconnected.forEach((n, idx) => {
        const angle = (idx / disconnected.length) * Math.PI * 2;
        pos.set(n.id, {
          x: GRAPH_CANVAS_CENTER.x + Math.cos(angle) * outerR,
          y: GRAPH_CANVAS_CENTER.y + Math.sin(angle) * outerR * 0.82,
        });
      });
    }

    resolveCollisions(pos, nodeIds, 14);
    return recenterPositions(pos);
  }

  // -------------------------------------------------------------------------
  // 2. HIERARCHICAL / POWER & FACTION TIERS (Sugiyama + Barycenter)
  // -------------------------------------------------------------------------
  if (mode === 'hierarchical') {
    const tiers = new Map<number, UnifiedGraphNode[]>();
    for (const n of nodes) {
      const meta = NODE_CATEGORY_META[n.category] || NODE_CATEGORY_META.npc;
      let t = meta.tier;
      // Promote major NPC hubs (degree >= 4) up a tier
      const deg = adj.get(n.id)?.size || 0;
      if (n.category === 'npc' && deg >= 4) t = 1;
      else if (n.category === 'npc' && deg === 0) t = 3;
      const list = tiers.get(t) || [];
      list.push(n);
      tiers.set(t, list);
    }

    const sortedTierKeys = Array.from(tiers.keys()).sort((a, b) => a - b);
    const tierYGap = 210;
    const xGap = 235;

    // Initial ordering within each tier by degree descending
    sortedTierKeys.forEach((tKey, rowIdx) => {
      const list = tiers.get(tKey)!;
      list.sort((a, b) => (adj.get(b.id)?.size || 0) - (adj.get(a.id)?.size || 0));
      const rowWidth = (list.length - 1) * xGap;
      list.forEach((n, colIdx) => {
        pos.set(n.id, {
          x: GRAPH_CANVAS_CENTER.x - rowWidth / 2 + colIdx * xGap,
          y: 200 + rowIdx * tierYGap,
        });
      });
    });

    // 4 passes of Barycenter horizontal sweep to untangle crossed edges!
    for (let sweep = 0; sweep < 4; sweep++) {
      for (const tKey of sortedTierKeys) {
        const list = tiers.get(tKey)!;
        if (list.length <= 1) continue;
        const scored = list.map((n) => {
          const neighbors = Array.from(adj.get(n.id) || []);
          if (neighbors.length === 0) return { node: n, bx: pos.get(n.id)!.x };
          const avgX =
            neighbors.reduce((acc, nb) => acc + (pos.get(nb)?.x || 0), 0) /
            neighbors.length;
          return { node: n, bx: avgX };
        });
        scored.sort((a, b) => a.bx - b.bx);
        const rowY = pos.get(list[0].id)!.y;
        const rowWidth = (scored.length - 1) * xGap;
        scored.forEach((item, colIdx) => {
          pos.set(item.node.id, {
            x: GRAPH_CANVAS_CENTER.x - rowWidth / 2 + colIdx * xGap,
            y: rowY,
          });
        });
      }
    }

    resolveCollisions(pos, nodeIds, 10);
    return recenterPositions(pos);
  }

  // -------------------------------------------------------------------------
  // 3. CATEGORY CLUSTERS (Spatial Quadrants per Archetype)
  // -------------------------------------------------------------------------
  if (mode === 'clusters') {
    const groups: { key: string; filter: (c: NodeCategory) => boolean }[] = [
      { key: 'factions', filter: (c) => c === 'faction' },
      { key: 'npcs', filter: (c) => c === 'npc' || c === 'player' },
      { key: 'locations', filter: (c) => c === 'location' },
      { key: 'others', filter: (c) => c === 'monster' || c === 'item' || c === 'lore' || c === 'note' },
    ];

    const populated = groups
      .map((g) => ({
        key: g.key,
        items: nodes.filter((n) => g.filter(n.category)),
      }))
      .filter((g) => g.items.length > 0);

    const sectorRadius = populated.length <= 1 ? 0 : 370;
    populated.forEach((grp, gIdx) => {
      const sectorAngle = (gIdx / populated.length) * Math.PI * 2 - Math.PI / 2;
      const cx = GRAPH_CANVAS_CENTER.x + Math.cos(sectorAngle) * sectorRadius;
      const cy = GRAPH_CANVAS_CENTER.y + Math.sin(sectorAngle) * sectorRadius * 0.78;

      const cols = Math.max(1, Math.ceil(Math.sqrt(grp.items.length)));
      grp.items.forEach((n, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const rowsTotal = Math.ceil(grp.items.length / cols);
        pos.set(n.id, {
          x: cx + (col - (cols - 1) / 2) * 220,
          y: cy + (row - (rowsTotal - 1) / 2) * 140,
        });
      });
    });

    resolveCollisions(pos, nodeIds, 16);
    return recenterPositions(pos);
  }

  // -------------------------------------------------------------------------
  // 4. ORGANIC FORCE-DIRECTED + CONNECTED COMPONENT ISLAND PACKING
  // -------------------------------------------------------------------------
  // Partition into connected components so isolated nodes don't drift away!
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const id of nodeIds) {
    if (visited.has(id)) continue;
    const comp: string[] = [];
    const stack = [id];
    visited.add(id);
    while (stack.length > 0) {
      const curr = stack.pop()!;
      comp.push(curr);
      for (const nb of adj.get(curr) || []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          stack.push(nb);
        }
      }
    }
    components.push(comp);
  }
  components.sort((a, b) => b.length - a.length);

  // Separate connected components (>1 node) from isolated singletons
  const multiComponents = components.filter((c) => c.length > 1);
  const singletons = components.filter((c) => c.length === 1).map((c) => c[0]);

  let currentOffsetX = 0;
  let maxCompHeight = 0;

  for (const comp of multiComponents) {
    const count = comp.length;
    const areaW = Math.max(520, Math.sqrt(count) * 310);
    const areaH = Math.max(420, Math.sqrt(count) * 250);
    const k = Math.sqrt((areaW * areaH) / Math.max(1, count)) * 0.92;

    // Deterministic golden-angle spiral initialization (sorted by degree)
    const sortedComp = [...comp].sort(
      (a, b) => (adj.get(b)?.size || 0) - (adj.get(a)?.size || 0)
    );
    const localPos = new Map<string, { x: number; y: number }>();
    sortedComp.forEach((id, idx) => {
      const r = idx === 0 ? 0 : 95 * Math.sqrt(idx);
      const theta = idx * 2.399963; // golden angle
      localPos.set(id, {
        x: Math.cos(theta) * r,
        y: Math.sin(theta) * r * 0.85,
      });
    });

    const compSet = new Set(comp);
    const compEdges = validEdges.filter(
      (e) => compSet.has(e.sourceId) && compSet.has(e.targetId)
    );

    const iterations = 90;
    for (let it = 0; it < iterations; it++) {
      const temp = (1 - it / iterations) * 85 + 4;
      const disp = new Map<string, { dx: number; dy: number }>();
      for (const id of comp) disp.set(id, { dx: 0, dy: 0 });

      // Repulsive forces
      for (let i = 0; i < comp.length; i++) {
        for (let j = i + 1; j < comp.length; j++) {
          const u = comp[i];
          const v = comp[j];
          const pu = localPos.get(u)!;
          const pv = localPos.get(v)!;
          const dx = pu.x - pv.x;
          const dy = pu.y - pv.y;
          const dist = Math.max(12, Math.hypot(dx, dy));
          const force = (k * k) / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          disp.get(u)!.dx += fx;
          disp.get(u)!.dy += fy;
          disp.get(v)!.dx -= fx;
          disp.get(v)!.dy -= fy;
        }
      }

      // Attractive spring forces
      for (const e of compEdges) {
        const pu = localPos.get(e.sourceId)!;
        const pv = localPos.get(e.targetId)!;
        const dx = pu.x - pv.x;
        const dy = pu.y - pv.y;
        const dist = Math.max(12, Math.hypot(dx, dy));
        const ideal = 240;
        const force = ((dist - ideal) * dist) / (k * 1.15);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp.get(e.sourceId)!.dx -= fx;
        disp.get(e.sourceId)!.dy -= fy;
        disp.get(e.targetId)!.dx += fx;
        disp.get(e.targetId)!.dy += fy;
      }

      // Gentle centering gravity
      for (const id of comp) {
        const p = localPos.get(id)!;
        const d = disp.get(id)!;
        d.dx -= p.x * 0.04;
        d.dy -= p.y * 0.045;
        const mag = Math.hypot(d.dx, d.dy);
        if (mag > 0) {
          const step = Math.min(mag, temp);
          p.x += (d.dx / mag) * step;
          p.y += (d.dy / mag) * step;
        }
      }
    }

    resolveCollisions(localPos, comp, 20);

    // Measure local bounds and place component neatly side-by-side
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const id of comp) {
      const p = localPos.get(id)!;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const compW = maxX - minX + 240;
    const compH = maxY - minY;
    maxCompHeight = Math.max(maxCompHeight, compH);

    for (const id of comp) {
      const p = localPos.get(id)!;
      pos.set(id, {
        x: currentOffsetX + (p.x - minX),
        y: p.y - (minY + maxY) / 2,
      });
    }
    currentOffsetX += compW + 110;
  }

  // Neatly arrange unconnected singleton nodes in a clean grid row below the main web
  if (singletons.length > 0) {
    const cols = Math.max(3, Math.min(7, Math.ceil(Math.sqrt(singletons.length * 1.6))));
    const baseY = multiComponents.length > 0 ? maxCompHeight / 2 + 210 : 0;
    const centerRefX = multiComponents.length > 0 ? (currentOffsetX - 110) / 2 : 0;
    singletons.forEach((id, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const colsInRow = Math.min(cols, singletons.length - row * cols);
      pos.set(id, {
        x: centerRefX + (col - (colsInRow - 1) / 2) * 225,
        y: baseY + row * 140,
      });
    });
  }

  resolveCollisions(pos, nodeIds, 12);
  return recenterPositions(pos);
}

// ============================================================================
// DETERMINISTIC LOCAL LORE & @/# MENTION RELATIONSHIP SCANNER
// ============================================================================

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function classifyContextSnippet(snippet: string, fromSecret: boolean): {
  type: RelationType;
  label: string;
} {
  const low = snippet.toLowerCase();
  if (
    /inimig|rival|odei|matar|assassin|caça|guerra|destru|traiu|traidor|hostil|ataq|ameaç/.test(
      low
    )
  ) {
    return { type: 'hostile', label: fromSecret ? 'Alvo / Rival oculto' : 'Rivalidade / Conflito' };
  }
  if (/irmã|irmão|pai|mãe|filh|sangue|linhagem|família|herdeir|parente|primo|espos/.test(low)) {
    return { type: 'blood', label: 'Laço de sangue' };
  }
  if (/serve|vassal|mestre|patrono|chefe|líder|comanda|financia|deve|dívida|contrat/.test(low)) {
    return { type: 'patron', label: 'Domínio / Patronato' };
  }
  if (
    fromSecret ||
    /segredo|conspira|espiã|infiltrad|ocult|chantag|culto|sombra/.test(low)
  ) {
    return { type: 'secret', label: 'Conspiração / Segredo' };
  }
  if (/aliad|amig|leal|proteg|apoia|membro|parceir|irmandade|junto/.test(low)) {
    return { type: 'allied', label: 'Aliança / Cooperação' };
  }
  return { type: 'neutral', label: 'Citado no Códice' };
}

export function inferGraphRelationshipsLocally(params: {
  entities: Entity[];
  manualNodes: ManualGraphNode[];
  existingRelationships: RelationshipEdge[];
  quests: Quest[];
  fronts: ThreatFront[];
}): AiSuggestedRelationship[] {
  const { entities, existingRelationships, quests, fronts } = params;
  const existingPairs = new Set<string>();
  for (const r of existingRelationships) {
    existingPairs.add(`${r.sourceId}::${r.targetId}`);
    existingPairs.add(`${r.targetId}::${r.sourceId}`);
  }

  const suggestions: AiSuggestedRelationship[] = [];
  const addedPairs = new Set<string>();

  const matchers = entities
    .filter((e) => e.handle.trim().length >= 2)
    .map((e) => ({
      entity: e,
      regex: new RegExp(
        `(?:^|[^\\p{L}\\p{N}_-])[@#]${escapeRegex(e.handle)}(?![\\p{L}\\p{N}_-])`,
        'iu'
      ),
      nameRegex:
        e.name.trim().length >= 4
          ? new RegExp(`\\b${escapeRegex(e.name.trim())}\\b`, 'iu')
          : null,
    }));

  // 1. Scan Entity -> Entity mentions (publicContent, summary, secrets)
  for (const src of entities) {
    const publicText = `${src.summary || ''}\n${src.publicContent || ''}`;
    for (const m of matchers) {
      if (m.entity.id === src.id) continue;
      const pairKey = [src.id, m.entity.id].sort().join('::');
      if (existingPairs.has(`${src.id}::${m.entity.id}`) || addedPairs.has(pairKey)) continue;

      let matchedSecret: { title: string; content: string } | undefined;
      for (const sec of src.secrets) {
        if (m.regex.test(sec.content) || (m.nameRegex && m.nameRegex.test(sec.content))) {
          matchedSecret = sec;
          break;
        }
      }

      const matchedPublic =
        m.regex.test(publicText) || (m.nameRegex ? m.nameRegex.test(publicText) : false);

      if (matchedSecret || matchedPublic) {
        const textToClassify = matchedSecret ? matchedSecret.content : publicText;
        const { type, label } = classifyContextSnippet(
          textToClassify,
          Boolean(matchedSecret)
        );
        addedPairs.add(pairKey);
        suggestions.push({
          id: `local-rel-${src.id}-${m.entity.id}`,
          sourceId: src.id,
          targetId: m.entity.id,
          label,
          type,
          isSecret: Boolean(matchedSecret),
          rationale: matchedSecret
            ? `Mencionado no segredo "${matchedSecret.title}" de ${src.name}.`
            : `${src.name} menciona ${m.entity.name} diretamente no Códice.`,
        });
      }
    }
  }

  // 2. Scan Quests connecting giverHandle <-> locationHandle
  const byHandle = new Map<string, Entity>();
  for (const e of entities) {
    byHandle.set(e.handle.toLowerCase(), e);
    byHandle.set(`${e.mentionPrefix}${e.handle}`.toLowerCase(), e);
  }

  for (const q of quests) {
    const giver = byHandle.get(q.giverHandle.trim().toLowerCase());
    const loc = byHandle.get(q.locationHandle.trim().toLowerCase());
    if (giver && loc && giver.id !== loc.id) {
      const pairKey = [giver.id, loc.id].sort().join('::');
      if (!existingPairs.has(`${giver.id}::${loc.id}`) && !addedPairs.has(pairKey)) {
        addedPairs.add(pairKey);
        suggestions.push({
          id: `local-quest-${q.id}`,
          sourceId: giver.id,
          targetId: loc.id,
          label: `Missão: ${q.title.slice(0, 26)}`,
          type: 'patron',
          isSecret: !q.isPublic,
          rationale: `Conectados pela missão "${q.title}".`,
        });
      }
    }
  }

  // 3. Scan Threat Fronts for co-mentioned entities
  for (const fr of fronts) {
    const owner = byHandle.get(fr.associatedEntityHandle.trim().toLowerCase());
    if (!owner) continue;
    const blob = `${fr.description} ${fr.impendingDoom} ${fr.grimPortents
      .map((g) => g.text)
      .join(' ')}`;
    for (const m of matchers) {
      if (m.entity.id === owner.id) continue;
      const pairKey = [owner.id, m.entity.id].sort().join('::');
      if (existingPairs.has(`${owner.id}::${m.entity.id}`) || addedPairs.has(pairKey))
        continue;
      if (m.regex.test(blob) || (m.nameRegex && m.nameRegex.test(blob))) {
        addedPairs.add(pairKey);
        suggestions.push({
          id: `local-front-${fr.id}-${m.entity.id}`,
          sourceId: owner.id,
          targetId: m.entity.id,
          label: 'Alvo de frente de ameaça',
          type: 'hostile',
          isSecret: fr.isSecret,
          rationale: `Conectados na Frente de Ameaça "${fr.name}".`,
        });
      }
    }
  }

  return suggestions.slice(0, 20);
}
