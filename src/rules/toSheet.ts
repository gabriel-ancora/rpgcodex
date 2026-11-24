import type {
  CharacterSheet,
  CharacterSpell,
  CharacterEquipmentItem,
  CharacterSpellSlots,
} from '../types/campaign';
import {
  ABILITIES,
  ABILITY_NAME,
  SKILL_NAME,
  SPELLS_BY_ID,
  ITEMS_BY_ID,
  WEAPON_MASTERIES,
} from '../data/dnd2024';
import type { SpellData } from '../data/dnd2024';
import type { CharacterBuild } from './build';
import { computeArmorClass, equipmentFromOptions, mysticArcanumMaxLevel, type ComputedCharacter } from './engine';

function toCharacterSpell(
  spell: SpellData,
  opts: { prepared: boolean; alwaysPrepared?: boolean; source?: string }
): CharacterSpell {
  return {
    id: `sp-${spell.id}`,
    index: spell.id,
    name: spell.name,
    level: spell.level,
    school: spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    components: spell.components,
    duration: spell.duration,
    description: spell.description,
    higherLevels: spell.higherLevels,
    ritual: spell.ritual,
    concentration: spell.concentration,
    prepared: opts.prepared,
    alwaysPrepared: opts.alwaysPrepared,
    source: opts.source,
  };
}

/** Monta a lista de magias da ficha a partir do build. */
export function spellsFromBuild(build: CharacterBuild, c: ComputedCharacter): CharacterSpell[] {
  const out = new Map<string, CharacterSpell>();
  for (const g of c.grantedSpells) {
    out.set(g.spell.id, toCharacterSpell(g.spell, { prepared: true, alwaysPrepared: true, source: g.source }));
  }
  const classSource = c.subclass && c.casterKind === 'third' ? c.subclass.name : c.cls.name;
  const grantedIds = new Set(c.grantedSpells.map((g) => g.spell.id));
  for (const id of build.cantrips.filter((x) => !grantedIds.has(x)).slice(0, c.cantripLimit)) {
    const sp = SPELLS_BY_ID[id];
    if (sp && !out.has(id)) out.set(id, toCharacterSpell(sp, { prepared: true, source: classSource }));
  }
  if (c.cls.id === 'wizard') {
    for (const id of build.spellbook) {
      const sp = SPELLS_BY_ID[id];
      if (sp && !out.has(id)) {
        out.set(id, toCharacterSpell(sp, { prepared: build.prepared.includes(id), source: 'Grimório' }));
      }
    }
  }
  for (const id of build.prepared.filter((x) => !grantedIds.has(x)).slice(0, c.preparedLimit)) {
    const sp = SPELLS_BY_ID[id];
    if (sp && !out.has(id)) out.set(id, toCharacterSpell(sp, { prepared: true, source: classSource }));
  }
  if (c.cls.id === 'warlock') {
    for (const id of build.options['mystic-arcanum'] || []) {
      const sp = SPELLS_BY_ID[id];
      if (sp && sp.level <= mysticArcanumMaxLevel(c.level) && !out.has(id)) {
        out.set(id, toCharacterSpell(sp, { prepared: true, alwaysPrepared: true, source: 'Arcana Mística (1x por Descanso Longo)' }));
      }
    }
  }
  return Array.from(out.values()).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'pt-BR'));
}

/** Preserva os espaços já gastos quando a ficha é reeditada. */
function mergeSlots(next: CharacterSpellSlots, prev?: CharacterSpellSlots): CharacterSpellSlots {
  if (!prev) return next;
  const out = { ...next };
  (['level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'] as const).forEach((k) => {
    const n = next[k];
    const p = prev[k];
    if (n && p) out[k] = { max: n.max, used: Math.min(p.used, n.max) };
  });
  if (next.pactSlots && prev.pactSlots) {
    out.pactSlots = { ...next.pactSlots, used: Math.min(prev.pactSlots.used, next.pactSlots.max) };
  }
  return out;
}

export interface SheetIdentity {
  name: string;
  alignment: string;
  avatarUrl?: string;
  notes: string;
  campaignId: string;
  campaignTitle: string;
}

/**
 * Gera os campos da ficha. Se `previous` for informado (edição), mantém PV atuais,
 * espaços gastos, inventário e moedas, a menos que `resetEquipment` seja verdadeiro.
 */
export function sheetFromBuild(
  build: CharacterBuild,
  c: ComputedCharacter,
  identity: SheetIdentity,
  previous?: CharacterSheet,
  resetEquipment = !previous
): Omit<CharacterSheet, 'id' | 'updatedAt' | 'playerId' | 'playerName'> {
  let equipment: CharacterEquipmentItem[];
  let currency = previous?.currency || { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
  if (resetEquipment) {
    const classOpt = c.classEquipmentOptions.find((o) => o.id === build.classEquipment);
    const bgOpt = c.backgroundEquipmentOptions.find((o) => o.id === build.backgroundEquipment);
    const result = equipmentFromOptions([classOpt, bgOpt]);
    equipment = result.items;
    currency = { pp: 0, gp: result.gold, ep: 0, sp: 0, cp: 0 };
  } else {
    equipment = previous?.equipment || [];
  }

  const armorClass = computeArmorClass(build, c.mods, equipment);
  const spells = spellsFromBuild(build, c);

  const weaponMasteries = build.weaponMasteries
    .slice(0, c.weaponMasteryCount)
    .map((id) => {
      const item = ITEMS_BY_ID[id];
      if (!item) return null;
      return `${item.name} — ${item.mastery}: ${WEAPON_MASTERIES[item.mastery || ''] || ''}`.trim();
    })
    .filter((x): x is string => Boolean(x));

  const proficiencies = [
    ...c.armorTraining,
    ...c.weaponProficiencies,
    ...c.toolProficiencies,
    ...c.skillProficiencies.map((s) => SKILL_NAME[s]),
  ];

  const raceLabel = c.lineage ? `${c.species?.name} (${c.lineage.name})` : c.species?.name || '';
  const prevMax = previous?.maxHp ?? c.maxHp;
  const prevHp = previous?.hp ?? c.maxHp;
  // Ao ganhar PV máximos, o personagem recebe a diferença; nunca passa do máximo.
  const hp = previous ? Math.max(0, Math.min(c.maxHp, prevHp + (c.maxHp - prevMax))) : c.maxHp;

  return {
    campaignId: identity.campaignId,
    campaignTitle: identity.campaignTitle,
    name: identity.name.trim() || 'Personagem sem nome',
    avatarUrl: identity.avatarUrl ?? '',
    alignment: identity.alignment,
    notes: identity.notes,
    race: raceLabel,
    racialTraits: (c.species?.traits || [])
      .filter((t) => (t.level || 1) <= c.level)
      .map((t) => `${t.name}: ${t.description}`),
    className: c.cls.name,
    subclass: c.subclass?.name || '',
    level: c.level,
    background: c.background?.name || '',
    hp,
    maxHp: c.maxHp,
    tempHp: previous?.tempHp || 0,
    armorClass,
    speed: c.speedLabel,
    hitDice: c.hitDice,
    hitDiceUsed: Math.min(previous?.hitDiceUsed || 0, c.level),
    proficiencyBonus: c.proficiencyBonus,
    passivePerception: c.passivePerception,
    initiativeBonus: c.initiative,
    statGenerationMethod: build.statMethod,
    baseStats: { ...build.baseScores },
    stats: { ...c.scores },
    proficiencies,
    skillProficiencies: c.skillProficiencies,
    skillExpertise: c.skillExpertise,
    toolProficiencies: c.toolProficiencies,
    languages: c.languages,
    originFeat: c.feats.find((f) => f.source.startsWith('Antecedente'))?.name,
    savingThrows: c.saveProficiencies.map((a) => ABILITY_NAME[a]),
    weaponMasteries,
    classFeatures: c.features,
    classResources: c.resources,
    spellSlots: mergeSlots(c.spellSlots, previous?.spellSlots),
    spells,
    equipment,
    currency,
    heroicInspiration: previous?.heroicInspiration ?? c.species?.id === 'human',
    build: build as unknown,
  };
}

