import {
  CampaignSummary,
  Entity,
  RelationshipEdge,
  GraphNodePosition,
  ManualGraphNode,
  CampaignMap,
  CalendarConfig,
  TimelineEvent,
  ThreatFront,
  MysterySceneNode,
  Quest,
  SessionJournalEntry,
  PersonalJournalNote,
  PartyResources,
  CharacterSheet,
} from '../types/campaign';

export interface ObsidianCodexBackupPayload {
  format: 'obsidian-codex-backup';
  version: '2.0';
  exportedAt: string;
  campaign: CampaignSummary;
  entities: Entity[];
  relationships: RelationshipEdge[];
  graphPositions: GraphNodePosition[];
  manualGraphNodes?: ManualGraphNode[];
  maps: CampaignMap[];
  calendar: CalendarConfig;
  timeline: TimelineEvent[];
  fronts: ThreatFront[];
  mysteryNodes: MysterySceneNode[];
  quests: Quest[];
  journal: SessionJournalEntry[];
  personalJournalNotes: PersonalJournalNote[];
  partyResources: PartyResources;
  characterSheets: CharacterSheet[];
}

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
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'campanha'
  );
}

/**
 * Converte menções @Handle e #Handle para [[WikiLinks]] nativos do Obsidian.md
 */
function convertMentionsToObsidianLinks(text: string, entities: Entity[]): string {
  return text.replace(/([@#][A-Za-zÀ-ÖØ-öø-ÿ0-9_]+)/g, (match) => {
    const raw = match.slice(1).toLowerCase();
    const found = entities.find((e) => e.handle.toLowerCase() === raw);
    if (found) {
      return `[[${found.name}|${match}]]`;
    }
    return `[[${match.slice(1)}]]`;
  });
}

export function exportCampaignAsJson(payload: Omit<ObsidianCodexBackupPayload, 'format' | 'version' | 'exportedAt'>) {
  const full: ObsidianCodexBackupPayload = {
    format: 'obsidian-codex-backup',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    ...payload,
  };
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `obsidian-codex-${slugifyFilename(payload.campaign.title)}-${dateTag}.json`;
  triggerFileDownload(filename, JSON.stringify(full, null, 2), 'application/json;charset=utf-8');
}

/**
 * Gera um Grimório Markdown completo compatível com Obsidian.md (YAML Frontmatter, [[WikiLinks]] e Callouts)
 */
export function exportCampaignAsObsidianMarkdown(payload: {
  campaign: CampaignSummary;
  entities: Entity[];
  fronts: ThreatFront[];
  quests: Quest[];
  journal: SessionJournalEntry[];
  characterSheets: CharacterSheet[];
  calendar: CalendarConfig;
  timeline: TimelineEvent[];
}) {
  const { campaign, entities, fronts, quests, journal, characterSheets, calendar, timeline } =
    payload;

  const lines: string[] = [
    '---',
    `title: "${campaign.title.replace(/"/g, '\\"')}"`,
    `system: "${campaign.system}"`,
    `tone: "${campaign.tone}"`,
    `dm: "${campaign.dmName}"`,
    `invite_code: "${campaign.inviteCode}"`,
    `exported_from: "Obsidian Codex TTRPG Suite"`,
    `exported_at: "${new Date().toISOString()}"`,
    'tags: [rpg, campanha, obsidian-codex]',
    '---',
    '',
    `# ${campaign.title}`,
    `> **Sistema:** ${campaign.system} | **Tom:** ${campaign.tone} | **Mestre:** ${campaign.dmName}`,
    `> **Data Atual no Mundo:** ${calendar.currentDay} de ${calendar.months[calendar.currentMonthIndex]?.name || 'Mês 1'}, ${calendar.currentYear} ${calendar.epochName}`,
    '',
    campaign.synopsis,
    '',
    '---',
    '## 1. Wiki Viva de Entidades (@NPCs, #Locais, Facções & Relíquias)',
    '',
  ];

  for (const ent of entities) {
    lines.push(`### ${ent.name} (\`${ent.mentionPrefix}${ent.handle}\`)`);
    lines.push(`*${ent.subtitle}* — **Categoria:** \`${ent.category.toUpperCase()}\` | **Tags:** ${ent.tags.map((t) => `#${t.replace(/\s+/g, '_')}`).join(' ')}`);
    lines.push('');
    if (ent.attributes.length > 0) {
      lines.push(
        ent.attributes.map((a) => `- **${a.label}:** ${a.value}${a.max ? `/${a.max}` : ''}`).join('\n')
      );
      lines.push('');
    }
    lines.push(convertMentionsToObsidianLinks(ent.publicContent, entities));
    lines.push('');

    if (ent.secrets.length > 0) {
      for (const sec of ent.secrets) {
        lines.push(
          `> [!${sec.isRevealed ? 'info' : 'warning'}] Segredo do Mestre (${sec.isRevealed ? 'Revelado' : 'Oculto na Névoa'}): ${sec.title}`
        );
        lines.push(`> ${convertMentionsToObsidianLinks(sec.content, entities)}`);
        lines.push('');
      }
    }
  }

  lines.push('---', '## 2. Frentes de Ameaça & Relógios do Apocalipse', '');
  for (const front of fronts) {
    lines.push(
      `### ${front.name} [${front.clockFilled}/${front.clockSegments}] (${front.status.toUpperCase()})`
    );
    lines.push(`- **Vínculo:** ${convertMentionsToObsidianLinks(front.associatedEntityHandle, entities)}`);
    lines.push(`- **Destino Implacável:** ${front.impendingDoom}`);
    lines.push('');
    for (const gp of front.grimPortents) {
      lines.push(`- [${gp.triggered ? 'x' : ' '}] Passo ${gp.step}: ${gp.text}`);
    }
    lines.push('');
  }

  lines.push('---', '## 3. Mural de Missões (Quests)', '');
  for (const q of quests) {
    lines.push(`### ${q.title} (${q.status.toUpperCase()})`);
    lines.push(convertMentionsToObsidianLinks(q.description, entities));
    lines.push(`- **Recompensa:** ${q.reward}`);
    for (const obj of q.objectives) {
      lines.push(`- [${obj.completed ? 'x' : ' '}] ${obj.text}`);
    }
    lines.push('');
  }

  lines.push('---', '## 4. Fichas do Grupo (D&D 5e)', '');
  for (const cs of characterSheets) {
    lines.push(
      `### ${cs.name} — ${cs.race} ${cs.className} Nv. ${cs.level} (Jogador: ${cs.playerName})`
    );
    lines.push(
      `- **PV:** ${cs.hp}/${cs.maxHp} | **CA:** ${cs.armorClass} | **Percepção Passiva:** ${cs.passivePerception}`
    );
    lines.push(
      `- **Atributos:** FOR ${cs.stats.str} | DES ${cs.stats.dex} | CON ${cs.stats.con} | INT ${cs.stats.int} | SAB ${cs.stats.wis} | CAR ${cs.stats.cha}`
    );
    lines.push('');
  }

  lines.push('---', '## 5. Linha do Tempo & Crônicas de Sessão', '');
  for (const ev of timeline) {
    lines.push(`- **Ano ${ev.year} ${ev.epoch}:** **${ev.title}** — ${convertMentionsToObsidianLinks(ev.description, entities)}`);
  }
  lines.push('');
  for (const j of journal) {
    lines.push(`### Sessão #${j.sessionNumber}: ${j.title} (${j.inGameDate})`);
    lines.push(`*Crônica por ${j.author}*`);
    lines.push('');
    lines.push(convertMentionsToObsidianLinks(j.content, entities));
    lines.push('');
  }

  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `grimorio-obsidian-${slugifyFilename(campaign.title)}-${dateTag}.md`;
  triggerFileDownload(filename, lines.join('\n'), 'text/markdown;charset=utf-8');
}

export async function parseCampaignJsonFile(file: File): Promise<ObsidianCodexBackupPayload> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<ObsidianCodexBackupPayload>;
  if (parsed.format !== 'obsidian-codex-backup' || !Array.isArray(parsed.entities)) {
    throw new Error(
      'Arquivo JSON inválido: selecione um backup exportado pelo Obsidian Codex.'
    );
  }
  return parsed as ObsidianCodexBackupPayload;
}

