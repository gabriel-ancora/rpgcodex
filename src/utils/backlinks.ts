import {
  Entity,
  Quest,
  TimelineEvent,
  ThreatFront,
  SessionJournalEntry,
  ScratchpadLine,
  CampaignMap,
  ViewRole,
} from '../types/campaign';

export interface BacklinkItem {
  id: string;
  sourceType: 'entity' | 'quest' | 'timeline' | 'front' | 'journal' | 'scratchpad' | 'map';
  sourceTypeLabel: string;
  sourceTitle: string;
  sourceId: string;
  mapId?: string;
  pinId?: string;
  excerpt: string;
  isSecret: boolean;
}

export function computeBacklinksForEntity(
  target: Entity,
  data: {
    entities: Entity[];
    quests: Quest[];
    timeline: TimelineEvent[];
    fronts: ThreatFront[];
    journal: SessionJournalEntry[];
    scratchpad: ScratchpadLine[];
    maps?: CampaignMap[];
  },
  viewRole: ViewRole
): BacklinkItem[] {
  const results: BacklinkItem[] = [];
  const fullToken = `${target.mentionPrefix}${target.handle}`.toLowerCase();
  const bareHandle = target.handle.toLowerCase();

  const matchesMention = (text?: string): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return lower.includes(fullToken) || lower.includes(`@${bareHandle}`) || lower.includes(`#${bareHandle}`);
  };

  // 1. Other Entities
  for (const ent of data.entities) {
    if (ent.id === target.id) continue;
    if (matchesMention(ent.publicContent) || matchesMention(ent.summary)) {
      results.push({
        id: `bl-ent-pub-${ent.id}`,
        sourceType: 'entity',
        sourceTypeLabel: `Códice (${ent.category.toUpperCase()})`,
        sourceTitle: `${ent.mentionPrefix}${ent.handle} — ${ent.name}`,
        sourceId: ent.id,
        excerpt: ent.publicContent || ent.summary,
        isSecret: false,
      });
    }
    for (const sec of ent.secrets) {
      if (viewRole === 'player' && !sec.isRevealed) continue;
      if (matchesMention(sec.content)) {
        results.push({
          id: `bl-ent-sec-${ent.id}-${sec.id}`,
          sourceType: 'entity',
          sourceTypeLabel: sec.isRevealed ? 'Segredo Revelado' : 'Segredo do Mestre',
          sourceTitle: `${ent.name} (${sec.title})`,
          sourceId: ent.id,
          excerpt: sec.content,
          isSecret: !sec.isRevealed,
        });
      }
    }
  }

  // 2. Interactive Maps (Pins & Vector Territories)
  if (data.maps) {
    for (const map of data.maps) {
      for (const pin of map.pins) {
        const pinHiddenForPlayer = pin.isSecret && !pin.isRevealed;
        if (viewRole === 'player' && pinHiddenForPlayer) continue;

        const isDirectLink =
          pin.entityId === target.id ||
          Boolean(pin.linkedEntityIds && pin.linkedEntityIds.includes(target.id));
        const combinedText = `${pin.description} ${pin.monsters.join(' ')} ${pin.treasures.join(' ')}`;

        if (isDirectLink || matchesMention(combinedText)) {
          results.push({
            id: `bl-map-pin-${map.id}-${pin.id}`,
            sourceType: 'map',
            sourceTypeLabel: `Mapa · ${map.name}`,
            sourceTitle: `${pin.label}${pin.subtitle ? ` (${pin.subtitle})` : ''}`,
            sourceId: pin.id,
            mapId: map.id,
            pinId: pin.id,
            excerpt: pin.description || `Marcador vinculado em ${map.name}.`,
            isSecret: pinHiddenForPlayer,
          });
        }
      }

      for (const shape of map.shapes || []) {
        const shapeHiddenForPlayer = Boolean(shape.isSecret && !shape.isRevealed);
        if (viewRole === 'player' && shapeHiddenForPlayer) continue;

        const isShapeLinked =
          shape.entityId === target.id ||
          Boolean(shape.linkedEntityIds && shape.linkedEntityIds.includes(target.id));

        if (isShapeLinked || matchesMention(shape.label)) {
          results.push({
            id: `bl-map-shape-${map.id}-${shape.id}`,
            sourceType: 'map',
            sourceTypeLabel: `Território · ${map.name}`,
            sourceTitle: shape.label,
            sourceId: shape.id,
            mapId: map.id,
            excerpt: `Camada vetorial demarcada em ${map.name}.`,
            isSecret: shapeHiddenForPlayer,
          });
        }
      }
    }
  }

  // 3. Quests
  for (const q of data.quests) {
    if (viewRole === 'player' && !q.isPublic) continue;
    const combined = `${q.giverHandle} ${q.locationHandle} ${q.description} ${q.objectives.map((o) => o.text).join(' ')}`;
    if (matchesMention(combined)) {
      results.push({
        id: `bl-quest-${q.id}`,
        sourceType: 'quest',
        sourceTypeLabel: 'Mural de Missões',
        sourceTitle: q.title,
        sourceId: q.id,
        excerpt: q.description,
        isSecret: !q.isPublic,
      });
    }
  }

  // 4. Timeline
  for (const ev of data.timeline) {
    if (viewRole === 'player' && ev.isSecret && !ev.isRevealed) continue;
    if (matchesMention(ev.description) || matchesMention(ev.title)) {
      results.push({
        id: `bl-time-${ev.id}`,
        sourceType: 'timeline',
        sourceTypeLabel: `Linha do Tempo (${ev.year} ${ev.epoch})`,
        sourceTitle: ev.title,
        sourceId: ev.id,
        excerpt: ev.description,
        isSecret: ev.isSecret && !ev.isRevealed,
      });
    }
  }

  // 5. Threat Fronts
  for (const fr of data.fronts) {
    if (viewRole === 'player' && fr.isSecret) continue;
    const combined = `${fr.associatedEntityHandle} ${fr.description} ${fr.impendingDoom} ${fr.grimPortents.map((g) => g.text).join(' ')}`;
    if (matchesMention(combined)) {
      results.push({
        id: `bl-front-${fr.id}`,
        sourceType: 'front',
        sourceTypeLabel: 'Frente de Ameaça',
        sourceTitle: fr.name,
        sourceId: fr.id,
        excerpt: fr.description,
        isSecret: fr.isSecret,
      });
    }
  }

  // 6. Journal Entries
  for (const j of data.journal) {
    if (matchesMention(j.content)) {
      results.push({
        id: `bl-jour-${j.id}`,
        sourceType: 'journal',
        sourceTypeLabel: `Diário (Sessão #${j.sessionNumber})`,
        sourceTitle: j.title,
        sourceId: j.id,
        excerpt: j.content,
        isSecret: false,
      });
    }
  }

  // 7. Scratchpad (GM only)
  if (viewRole === 'gm') {
    for (const s of data.scratchpad) {
      if (matchesMention(s.text)) {
        results.push({
          id: `bl-scr-${s.id}`,
          sourceType: 'scratchpad',
          sourceTypeLabel: `Bloco de Notas (${s.timestamp})`,
          sourceTitle: 'Anotação Rápida de Sessão',
          sourceId: s.id,
          excerpt: s.text,
          isSecret: true,
        });
      }
    }
  }

  return results;
}
