/**
 * Importação de backup: sempre cria uma campanha NOVA no servidor e recria o conteúdo nela,
 * mapeando ids antigos para os ids devolvidos pelas criações. Nunca usa ids do arquivo no servidor.
 * Usa os mesmos montadores de payload das ações da store (`payloads.ts`).
 */
import { convexClient } from '../convexClient';
import { api } from '../../convex/_generated/api';
import type { CampaignSummary } from '../types/campaign';
import type { CodexBackupPayload } from '../utils/campaignBackup';
import { convexErrorMessage, sheetContentPayload } from '../utils/sheetPayload';
import {
  calendarBody,
  entityCreateBody,
  eventCreateBody,
  frontCreateBody,
  journalCreateBody,
  manualNodeBody,
  mapCreateBody,
  pinCreateBody,
  questCreateBody,
  relationshipCreateBody,
  resourcesBody,
  sceneCreateBody,
  shapesBody,
} from './payloads';

export interface ImportFailure {
  kind: string;
  name: string;
  error: string;
}

export interface ImportReport {
  /** Campanha criada (null se a criação falhou; nada foi importado). */
  campaign: CampaignSummary | null;
  title: string;
  imported: number;
  failed: ImportFailure[];
  /** Quantidade importada por tipo de item. */
  counts: Record<string, number>;
}

export function describeImportReport(r: ImportReport): string {
  if (!r.campaign) {
    return `Importação não realizada: ${r.failed[0]?.error || 'não foi possível criar a campanha.'}`;
  }
  const base = `"${r.title}" importada como nova campanha: ${r.imported} item(ns) restaurado(s)`;
  if (r.failed.length === 0) return `${base}.`;
  return `${base}, ${r.failed.length} com falha. Primeiro erro: ${r.failed[0].error}`;
}

export async function runCampaignImport(backup: CodexBackupPayload, sessionToken: string): Promise<ImportReport> {
  const report: ImportReport = { campaign: null, title: backup.campaign.title, imported: 0, failed: [], counts: {} };

  const attempt = async <T,>(kind: string, name: string, fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      const value = await fn();
      report.imported += 1;
      report.counts[kind] = (report.counts[kind] || 0) + 1;
      return value;
    } catch (err) {
      report.failed.push({ kind, name, error: convexErrorMessage(err) });
      return undefined;
    }
  };

  // 1. Campanha nova (o servidor gera id e código de convite).
  let campaignId: string;
  try {
    const created = await convexClient.mutation(api.campaign.create, {
      sessionToken,
      title: backup.campaign.title,
      synopsis: backup.campaign.synopsis,
      worldContext: backup.campaign.worldContext || '',
      system: backup.campaign.system,
      tone: backup.campaign.tone,
      coverUrl: backup.campaign.coverUrl || '',
    });
    campaignId = created.id;
    report.campaign = created.campaign as CampaignSummary;
  } catch (err) {
    report.failed.push({ kind: 'campanha', name: backup.campaign.title, error: convexErrorMessage(err) });
    return report;
  }
  const base = { sessionToken, campaignId };

  // 2. Entradas do códice.
  const entityIds = new Map<string, string>();
  for (const ent of backup.entities) {
    const id = await attempt('entradas', ent.name, () =>
      convexClient.mutation(api.entities.create, { ...base, ...entityCreateBody(ent) })
    );
    if (id) entityIds.set(ent.id, id as string);
  }

  // 3. Grafo: posições, nós manuais e relações (apenas referências que foram recriadas).
  for (const pos of backup.graphPositions) {
    const entityId = entityIds.get(pos.entityId);
    if (!entityId) continue;
    await attempt('posições do grafo', pos.entityId, () =>
      convexClient.mutation(api.relationships.updatePosition, { ...base, entityId, x: pos.x, y: pos.y })
    );
  }

  const nodeIds = new Map<string, string>();
  for (const node of backup.manualGraphNodes) {
    const id = await attempt('nós do grafo', node.label, () =>
      convexClient.mutation(api.relationships.addManualNode, {
        ...base,
        ...manualNodeBody(node),
        entityId: node.entityId ? entityIds.get(node.entityId) : undefined,
      })
    );
    if (id) nodeIds.set(node.id, id as string);
  }

  for (const rel of backup.relationships) {
    const sourceId = entityIds.get(rel.sourceId) ?? nodeIds.get(rel.sourceId);
    const targetId = entityIds.get(rel.targetId) ?? nodeIds.get(rel.targetId);
    if (!sourceId || !targetId) {
      report.failed.push({
        kind: 'relações',
        name: rel.label,
        error: 'Uma das pontas da relação não foi restaurada.',
      });
      continue;
    }
    await attempt('relações', rel.label, () =>
      convexClient.mutation(api.relationships.create, { ...base, sourceId, targetId, ...relationshipCreateBody(rel) })
    );
  }

  // 4. Mapas: cria todos antes dos marcadores, para resolver ligações entre mapas.
  const mapIds = new Map<string, string>();
  for (const m of backup.maps) {
    const id = await attempt('mapas', m.name, () =>
      convexClient.mutation(api.maps.create, { ...base, ...mapCreateBody(m) })
    );
    if (id) mapIds.set(m.id, id as string);
  }
  for (const m of backup.maps) {
    const mapId = mapIds.get(m.id);
    if (!mapId) continue;
    const mapRef = (id?: string) => (id ? entityIds.get(id) : undefined);
    const shapes = (m.shapes || []).map((s) => ({
      ...s,
      entityId: mapRef(s.entityId),
      linkedEntityIds: s.linkedEntityIds?.map((e) => entityIds.get(e)).filter((e): e is string => Boolean(e)),
    }));
    if (shapes.length > 0) {
      await attempt('desenhos de mapa', m.name, () =>
        convexClient.mutation(api.maps.updateShapes, { sessionToken, mapId, shapes: shapesBody(shapes) })
      );
    }
    for (const pin of m.pins) {
      await attempt('marcadores', pin.label, () =>
        convexClient.mutation(api.maps.addPin, {
          sessionToken,
          mapId,
          ...pinCreateBody(pin),
          entityId: mapRef(pin.entityId),
          linkedEntityIds: pin.linkedEntityIds?.map((e) => entityIds.get(e)).filter((e): e is string => Boolean(e)),
          linkedMapId: pin.linkedMapId ? mapIds.get(pin.linkedMapId) : undefined,
        })
      );
    }
  }

  // 5. Calendário e cronologia.
  if (backup.calendar) {
    await attempt('calendário', backup.calendar.calendarName, () =>
      convexClient.mutation(api.calendar.update, { ...base, ...calendarBody(backup.calendar!) })
    );
  }
  const epochFallback = backup.calendar?.epochName || 'Era Atual';
  for (let i = 0; i < backup.timeline.length; i++) {
    const ev = backup.timeline[i];
    await attempt('eventos', ev.title, () =>
      convexClient.mutation(api.calendar.addEvent, {
        ...base,
        ...eventCreateBody(ev, epochFallback, i),
      })
    );
  }

  // 6. Missões, frentes, cenas e pistas.
  for (const q of backup.quests) {
    await attempt('missões', q.title, () => convexClient.mutation(api.portal.createQuest, { ...base, ...questCreateBody(q) }));
  }
  for (const f of backup.fronts) {
    await attempt('frentes', f.name, () => convexClient.mutation(api.plots.createFront, { ...base, ...frontCreateBody(f) }));
  }
  const sceneIds = new Map<string, string>();
  for (const sc of backup.mysteryNodes) {
    const id = await attempt('cenas', sc.title, () =>
      convexClient.mutation(api.plots.createScene, { ...base, ...sceneCreateBody(sc) })
    );
    if (id) sceneIds.set(sc.id, id as string);
  }
  for (const sc of backup.mysteryNodes) {
    const sceneId = sceneIds.get(sc.id);
    if (!sceneId) continue;
    for (const cl of sc.clues) {
      await attempt('pistas', cl.name, () =>
        convexClient.mutation(api.plots.addClue, {
          sessionToken,
          sceneId,
          name: cl.name,
          description: cl.description,
          // Pista cujo destino não foi restaurado perde apenas a ligação.
          targetSceneId: sceneIds.get(cl.targetSceneId) ?? '',
          type: cl.type,
        })
      );
    }
  }

  // 7. Diário e recursos do grupo.
  for (const j of backup.journal) {
    await attempt('crônicas', j.title, () => convexClient.mutation(api.portal.addJournal, { ...base, ...journalCreateBody(j) }));
  }
  if (backup.partyResources) {
    await attempt('recursos do grupo', 'Recursos', () =>
      convexClient.mutation(api.portal.replaceResources, { ...base, ...resourcesBody(backup.partyResources!) })
    );
  }

  // 8. Fichas (recriadas em nome de quem importa, vinculadas à campanha nova).
  for (const sheet of backup.characterSheets) {
    await attempt('fichas', sheet.name, () =>
      convexClient.mutation(api.characters.create, {
        sessionToken,
        campaignId,
        campaignTitle: backup.campaign.title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(sheetContentPayload(sheet) as any),
      })
    );
  }

  return report;
}
