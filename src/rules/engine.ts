/**
 * Motor de regras do D&D 5.5 (Livro do Jogador 2024).
 * Recebe um CharacterBuild e calcula todos os valores derivados da ficha.
 * É a ÚNICA fonte de cálculo: criador, ficha e telas do Mestre usam este módulo.
 */
import {
  ABILITIES,
  SKILLS,
  SKILL_NAME,
  SPECIES_BY_ID,
  BACKGROUNDS_BY_ID,
  CLASSES_BY_ID,
  FEATS_BY_ID,
  SPELLS,
  SPELLS_BY_ID,
  ITEMS_BY_ID,
  CLASS_STARTING_EQUIPMENT,
  STANDARD_LANGUAGES,
  RARE_LANGUAGES,
  abilityModifier,
  proficiencyBonusForLevel,
  feetToMeters,
  isArmor,
} from '../data/dnd2024';
import type {
  Ability,
  ClassData,
  ClassId,
  SkillId,
  SpellData,
  SubclassData,
  SpeciesData,
  BackgroundData,
  LineageOption,
  StartingEquipmentOption,
  OptionGroupData,
  FeatData,
} from '../data/dnd2024';
import type { CharacterBuild } from './build';
import type { CharacterEquipmentItem, CharacterFeature, CharacterSpellSlots } from '../types/campaign';

// ---------------------------------------------------------------------------
// Tabelas de conjuração (Livro do Jogador 2024)
// ---------------------------------------------------------------------------

const FULL_SLOTS: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

const HALF_SLOTS: number[][] = [
  [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
  [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
];

const THIRD_SLOTS: number[][] = [
  [], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3],
  [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
];

/** [quantidade, círculo] dos espaços de Magia de Pacto do Bruxo por nível */
const PACT_SLOTS: [number, number][] = [
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
];

const PREPARED_FULL = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22];
const PREPARED: Partial<Record<ClassId, number[]>> = {
  bard: PREPARED_FULL,
  cleric: PREPARED_FULL,
  druid: PREPARED_FULL,
  sorcerer: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  wizard: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25],
  paladin: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  ranger: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
};
const PREPARED_THIRD = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];

const step = (lvl: number, a: number, b: number, c: number) => (lvl >= 10 ? c : lvl >= 4 ? b : a);

function cantripsKnown(classId: ClassId, subclassId: string | undefined, level: number): number {
  switch (classId) {
    case 'bard':
    case 'druid':
    case 'warlock':
      return step(level, 2, 3, 4);
    case 'cleric':
    case 'wizard':
      return step(level, 3, 4, 5);
    case 'sorcerer':
      return step(level, 4, 5, 6);
    case 'fighter':
      return subclassId === 'eldritch-knight' && level >= 3 ? (level >= 10 ? 3 : 2) : 0;
    case 'rogue':
      return subclassId === 'arcane-trickster' && level >= 3 ? (level >= 10 ? 4 : 3) : 0;
    default:
      return 0;
  }
}

export const SPELLCASTING_ABILITY: Partial<Record<ClassId, Ability>> = {
  bard: 'cha',
  cleric: 'wis',
  druid: 'wis',
  paladin: 'cha',
  ranger: 'wis',
  sorcerer: 'cha',
  warlock: 'cha',
  wizard: 'int',
  fighter: 'int', // Cavaleiro Arcano
  rogue: 'int', // Trapaceiro Arcano
};

export type CasterKind = 'full' | 'half' | 'third' | 'pact' | 'none';

export function casterKind(classId: ClassId, subclassId?: string): CasterKind {
  if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(classId)) return 'full';
  if (classId === 'paladin' || classId === 'ranger') return 'half';
  if (classId === 'warlock') return 'pact';
  if (classId === 'fighter' && subclassId === 'eldritch-knight') return 'third';
  if (classId === 'rogue' && subclassId === 'arcane-trickster') return 'third';
  return 'none';
}

/** Lista de magias usada pela classe (Cavaleiro Arcano e Trapaceiro usam a de Mago). */
export function spellListFor(classId: ClassId, subclassId?: string): ClassId | null {
  const kind = casterKind(classId, subclassId);
  if (kind === 'none') return null;
  if (kind === 'third') return 'wizard';
  return classId;
}

/** Círculo máximo da Arcana Mística do Bruxo (6º no nível 11 … 9º no 17). */
export function mysticArcanumMaxLevel(level: number): number {
  return level >= 17 ? 9 : level >= 15 ? 8 : level >= 13 ? 7 : level >= 11 ? 6 : 0;
}

// ---------------------------------------------------------------------------
// Progressão por classe
// ---------------------------------------------------------------------------

export function asiLevels(classId: ClassId): number[] {
  if (classId === 'fighter') return [4, 6, 8, 12, 14, 16];
  if (classId === 'rogue') return [4, 8, 10, 12, 16];
  return [4, 8, 12, 16];
}

export function weaponMasteryCount(classId: ClassId, level: number): number {
  switch (classId) {
    case 'barbarian':
      return level >= 10 ? 4 : level >= 4 ? 3 : 2;
    case 'fighter':
      return level >= 16 ? 6 : level >= 10 ? 5 : level >= 4 ? 4 : 3;
    case 'paladin':
    case 'ranger':
    case 'rogue':
      return 2;
    default:
      return 0;
  }
}

export function fightingStyleCount(classId: ClassId, subclassId: string | undefined, level: number): number {
  if (classId === 'fighter') return 1 + (subclassId === 'champion' && level >= 7 ? 1 : 0);
  if ((classId === 'paladin' || classId === 'ranger') && level >= 2) return 1;
  return 0;
}

export interface ExpertiseRule {
  count: number;
  /** restrição de perícias (Mago — Estudioso) */
  options?: SkillId[];
}

export function expertiseRule(classId: ClassId, level: number): ExpertiseRule {
  switch (classId) {
    case 'rogue':
      return { count: level >= 6 ? 4 : 2 };
    case 'bard':
      return { count: level >= 9 ? 4 : level >= 2 ? 2 : 0 };
    case 'ranger':
      return { count: level >= 9 ? 3 : level >= 2 ? 1 : 0 };
    case 'wizard':
      return level >= 2
        ? { count: 1, options: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'] }
        : { count: 0 };
    default:
      return { count: 0 };
  }
}

/** Ferramentas/instrumentos que a classe deixa escolher. */
export function classToolChoiceRule(classId: ClassId): { count: number; kind: 'instrument' | 'artisan-or-instrument' } | null {
  if (classId === 'bard') return { count: 3, kind: 'instrument' };
  if (classId === 'monk') return { count: 1, kind: 'artisan-or-instrument' };
  return null;
}

/** Idiomas escolhíveis: 2 (Livro 2024) + 1 do Ladino (Gíria) + 2 do Explorador Hábil do Patrulheiro. */
export function languageChoiceCount(classId: ClassId, level: number): number {
  return 2 + (classId === 'rogue' ? 1 : 0) + (classId === 'ranger' && level >= 2 ? 2 : 0);
}

/** Idiomas que podem ser escolhidos (Gíria de Ladrão e Druídico vêm só da classe). */
export const CHOOSABLE_LANGUAGES = [
  ...STANDARD_LANGUAGES.filter((l) => l !== 'Comum'),
  ...RARE_LANGUAGES.filter((l) => l !== 'Gíria de Ladrão' && l !== 'Druídico'),
];

/** Perícias de classe: Bárbaro ganha uma extra no nível 3 (Conhecimento Primitivo). */
export function classSkillCount(cls: ClassData, level: number): number {
  return cls.skillChoices.count + (cls.id === 'barbarian' && level >= 3 ? 1 : 0);
}

/** Grupos de opções que se aplicam à classe/subclasse no nível. */
export function activeOptionGroups(cls: ClassData, subclassId: string | undefined, level: number): OptionGroupData[] {
  return (cls.optionGroups || []).filter(
    (g) => g.level <= level && (!g.subclassId || g.subclassId === subclassId) && (g.countByLevel[level - 1] || 0) > 0
  );
}

// ---------------------------------------------------------------------------
// Talentos
// ---------------------------------------------------------------------------

export interface FeatInstance {
  feat: FeatData;
  /** chave usada em skilledChoices / magicInitiate / featChoices */
  key: string;
  source: string;
}

/** Todos os talentos ativos do personagem, com a chave de suas escolhas. */
export function featInstances(
  build: CharacterBuild,
  background: BackgroundData | undefined,
  cls: ClassData,
  subclassId: string | undefined,
  level: number
): FeatInstance[] {
  const out: FeatInstance[] = [];
  const push = (id: string | undefined, key: string, source: string) => {
    const feat = id ? FEATS_BY_ID[id] : undefined;
    if (feat) out.push({ feat, key, source });
  };
  if (background) push(background.feat, 'background', `Antecedente: ${background.name}`);
  if (build.speciesFeat) push(build.speciesFeat, 'species', 'Humano (Versátil)');
  for (const fs of build.fightingStyles.slice(0, fightingStyleCount(cls.id, subclassId, level))) {
    push(fs, `style-${fs}`, 'Estilo de Luta');
  }
  const levels = asiLevels(cls.id);
  for (const a of build.asi) {
    if (a.type !== 'feat' || !a.featId) continue;
    const valid = a.level === 19 ? level >= 19 : levels.includes(a.level) && a.level <= level;
    if (valid) push(a.featId, `asi-${a.level}`, `Nível ${a.level}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Resultado calculado
// ---------------------------------------------------------------------------

export interface GrantedSpellInfo {
  spell: SpellData;
  source: string;
  /** concedidas não contam no limite de truques/preparadas */
  alwaysPrepared: boolean;
  note?: string;
}

export interface SkillLine {
  id: SkillId;
  name: string;
  ability: Ability;
  bonus: number;
  proficient: boolean;
  expertise: boolean;
  /** recebe metade do bônus de proficiência (Versatilidade do Bardo) */
  halfProficiency: boolean;
}

export interface ComputedCharacter {
  species?: SpeciesData;
  lineage?: LineageOption;
  background?: BackgroundData;
  cls: ClassData;
  subclass?: SubclassData;
  level: number;
  proficiencyBonus: number;
  scores: Record<Ability, number>;
  mods: Record<Ability, number>;
  backgroundBonus: Partial<Record<Ability, number>>;
  saveProficiencies: Ability[];
  saves: Record<Ability, number>;
  /** bônus somado a todos os testes de resistência (Aura de Proteção) */
  saveBonusAll: number;
  skills: SkillLine[];
  skillProficiencies: SkillId[];
  skillExpertise: SkillId[];
  jackOfAllTrades: boolean;
  initiative: number;
  passivePerception: number;
  maxHp: number;
  hitDice: string;
  speedFt: number;
  speedLabel: string;
  darkvisionFt?: number;
  size: string;
  armorTraining: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  languages: string[];
  feats: { id: string; name: string; source: string; description: string }[];
  featInstances: FeatInstance[];
  features: CharacterFeature[];
  resources: { label: string; value: string }[];
  casterKind: CasterKind;
  spellcastingAbility?: Ability;
  spellSaveDc?: number;
  spellAttack?: number;
  spellSlots: CharacterSpellSlots;
  maxSpellCircle: number;
  cantripLimit: number;
  preparedLimit: number;
  spellbookSize: number;
  classSpellLists: ClassId[];
  grantedSpells: GrantedSpellInfo[];
  skillChoiceCount: number;
  skillChoiceOptions: SkillId[];
  /** perícias já concedidas por antecedente/espécie/talentos (não contam na escolha da classe) */
  fixedSkills: SkillId[];
  expertise: ExpertiseRule;
  weaponMasteryCount: number;
  fightingStyleCount: number;
  optionGroups: OptionGroupData[];
  asiLevels: number[];
  languageChoices: number;
  classEquipmentOptions: StartingEquipmentOption[];
  backgroundEquipmentOptions: StartingEquipmentOption[];
  startingGold: number;
}

function findLineage(species: SpeciesData | undefined, lineageId?: string) {
  return species?.lineage?.options.find((o) => o.id === lineageId);
}

export function computeAbilityScores(build: CharacterBuild, background?: BackgroundData) {
  const scores: Record<Ability, number> = { ...build.baseScores };
  const backgroundBonus: Partial<Record<Ability, number>> = {};
  if (background) {
    if (build.abilityBonusMode === '1-1-1') {
      for (const a of background.abilities) backgroundBonus[a] = 1;
    } else {
      if (build.abilityPlus2 && background.abilities.includes(build.abilityPlus2)) backgroundBonus[build.abilityPlus2] = 2;
      if (build.abilityPlus1 && build.abilityPlus1 !== build.abilityPlus2 && background.abilities.includes(build.abilityPlus1)) {
        backgroundBonus[build.abilityPlus1] = 1;
      }
    }
  }
  for (const a of ABILITIES) scores[a.id] = Math.min(20, scores[a.id] + (backgroundBonus[a.id] || 0));

  const levels = asiLevels(build.classId);
  for (const choice of build.asi) {
    const isEpic = choice.level === 19;
    if (isEpic ? build.level < 19 : !levels.includes(choice.level) || choice.level > build.level) continue;
    for (const [ab, inc] of Object.entries(choice.increases)) {
      scores[ab as Ability] = Math.min(isEpic ? 30 : 20, scores[ab as Ability] + (inc || 0));
    }
  }

  if (build.classId === 'barbarian' && build.level >= 20) {
    scores.str = Math.min(25, scores.str + 4);
    scores.con = Math.min(25, scores.con + 4);
  }
  if (build.classId === 'monk' && build.level >= 20) {
    scores.dex = Math.min(25, scores.dex + 4);
    scores.wis = Math.min(25, scores.wis + 4);
  }
  return { scores, backgroundBonus };
}

function computeGrantedSpells(
  build: CharacterBuild,
  ctx: { species?: SpeciesData; lineage?: LineageOption; cls: ClassData; subclass?: SubclassData; feats: FeatInstance[] }
): GrantedSpellInfo[] {
  const out: GrantedSpellInfo[] = [];
  const add = (id: string | undefined, source: string, note?: string) => {
    const spell = id ? SPELLS_BY_ID[id] : undefined;
    if (!spell || out.some((g) => g.spell.id === spell.id)) return;
    out.push({ spell, source, alwaysPrepared: true, note });
  };
  const L = build.level;

  if (ctx.species) {
    for (const g of ctx.species.spells || []) if (L >= g.level) add(g.spellId, ctx.species.name, g.note);
    if (ctx.lineage) {
      for (const g of ctx.lineage.spells || []) {
        if (L >= g.level) add(g.spellId, `${ctx.species.lineage?.label}: ${ctx.lineage.name}`, g.note);
      }
    }
  }

  for (const f of ctx.feats) {
    if (f.feat.id === 'magic-initiate') {
      const mi = build.magicInitiate[f.key];
      if (!mi) continue;
      for (const c of mi.cantrips.slice(0, 2)) add(c, 'Iniciado em Magia', 'Truque');
      add(mi.spell, 'Iniciado em Magia', '1x por Descanso Longo sem espaço');
    }
    const eff = f.feat.effects;
    if (!eff) continue;
    for (const id of eff.spells || []) add(id, f.feat.name, '1x por Descanso Longo sem espaço');
    if (eff.spellChoice) add(build.featChoices[f.key]?.spell, f.feat.name, '1x por Descanso Longo sem espaço');
    if (eff.cantripChoice) {
      for (const id of (build.featChoices[f.key]?.picks || []).slice(0, eff.cantripChoice.count)) add(id, f.feat.name, 'Truque');
    }
  }

  const cid = build.classId;
  if (cid === 'ranger') add('hunters-mark', 'Inimigo Favorito');
  if (cid === 'paladin' && L >= 2) add('divine-smite', 'Destruição do Paladino');
  if (cid === 'paladin' && L >= 5) add('find-steed', 'Fiel Corcel');
  if (cid === 'druid') add('speak-with-animals', 'Druídico');
  if (cid === 'bard' && L >= 20) {
    add('power-word-heal', 'Palavras de Criação');
    add('power-word-kill', 'Palavras de Criação');
  }
  if (cid === 'rogue' && build.subclassId === 'arcane-trickster' && L >= 3) add('mage-hand', 'Trapaceiro Arcano', 'Truque');

  if (ctx.subclass && L >= 3) {
    for (const ap of ctx.subclass.alwaysPrepared || []) {
      if (L >= ap.level) for (const id of ap.spells) add(id, ctx.subclass.name);
    }
  }
  return out;
}

function buildSlots(kind: CasterKind, level: number): { slots: CharacterSpellSlots; maxCircle: number } {
  const row =
    kind === 'full' ? FULL_SLOTS[level - 1] : kind === 'half' ? HALF_SLOTS[level - 1] : kind === 'third' ? THIRD_SLOTS[level - 1] : [];
  const get = (i: number) => ({ used: 0, max: row[i] || 0 });
  const slots: CharacterSpellSlots = {
    level1: get(0),
    level2: get(1),
    level3: get(2),
    level4: get(3),
    level5: get(4),
    level6: get(5),
    level7: get(6),
    level8: get(7),
    level9: get(8),
  };
  let maxCircle = row.length;
  if (kind === 'pact') {
    const [count, circle] = PACT_SLOTS[level - 1];
    slots.pactSlots = { level: circle, used: 0, max: count };
    maxCircle = circle;
  }
  return { slots, maxCircle };
}

/** Classe de Armadura com base no equipamento vestido. */
export function computeArmorClass(
  build: Pick<CharacterBuild, 'classId' | 'subclassId' | 'level' | 'fightingStyles' | 'asi'>,
  mods: Record<Ability, number>,
  equipment: Pick<CharacterEquipmentItem, 'itemId' | 'equipped'>[]
): number {
  const equipped = equipment
    .filter((e) => e.equipped && e.itemId)
    .map((e) => ITEMS_BY_ID[e.itemId!])
    .filter(Boolean);
  const armor = equipped.find((i) => isArmor(i));
  const shield = equipped.find((i) => i.kind === 'shield');
  const shieldBonus = shield?.acBonus || 0;
  const mediumMaster = build.asi.some((a) => a.type === 'feat' && a.featId === 'medium-armor-master' && a.level <= build.level);

  const candidates: number[] = [];
  if (armor?.ac) {
    const cap = armor.kind === 'medium-armor' && mediumMaster ? 3 : 2;
    const dex = armor.ac.dex === 'full' ? mods.dex : armor.ac.dex === 'max2' ? Math.min(cap, mods.dex) : 0;
    const defense = build.fightingStyles.includes('defense') ? 1 : 0;
    candidates.push(armor.ac.base + dex + shieldBonus + defense);
  } else {
    candidates.push(10 + mods.dex + shieldBonus);
    if (build.classId === 'barbarian') candidates.push(10 + mods.dex + mods.con + shieldBonus);
    if (build.classId === 'monk' && !shield) candidates.push(10 + mods.dex + mods.wis);
    if (build.classId === 'sorcerer' && build.subclassId === 'draconic-sorcery' && build.level >= 3) {
      candidates.push(10 + mods.dex + mods.cha + shieldBonus);
    }
  }
  return Math.max(...candidates);
}

const CATEGORY_LABEL: Record<string, string> = {
  'simple-melee': 'Arma Simples',
  'simple-ranged': 'Arma Simples',
  'martial-melee': 'Arma Marcial',
  'martial-ranged': 'Arma Marcial',
  'light-armor': 'Armadura Leve',
  'medium-armor': 'Armadura Média',
  'heavy-armor': 'Armadura Pesada',
  shield: 'Escudo',
  ammunition: 'Munição',
  focus: 'Foco de Conjuração',
  pack: 'Pacote',
  tool: 'Ferramenta',
  instrument: 'Instrumento',
  gear: 'Equipamento',
};

let itemSeq = 0;

/** Converte um item do catálogo em linha de inventário (usado pelo criador e pela ficha). */
export function inventoryItemFromCatalog(itemId: string, opts: { quantity?: number; label?: string; equipped?: boolean } = {}): CharacterEquipmentItem | null {
  const data = ITEMS_BY_ID[itemId];
  if (!data) return null;
  itemSeq += 1;
  const ac = data.ac
    ? `CA ${data.ac.base}${data.ac.dex === 'full' ? ' + Des' : data.ac.dex === 'max2' ? ' + Des (máx. 2)' : ''}`
    : data.acBonus
    ? `+${data.acBonus} CA`
    : undefined;
  const wearable = ['light-armor', 'medium-armor', 'heavy-armor', 'shield'].includes(data.kind) || /melee|ranged/.test(data.kind);
  return {
    id: `eq-${Date.now().toString(36)}-${itemSeq}`,
    itemId: data.id,
    name: opts.label || data.name,
    category: CATEGORY_LABEL[data.kind] || 'Equipamento',
    damage: data.damage,
    armorClass: ac,
    mastery: data.mastery,
    properties: data.properties,
    weight: data.weightKg ? `${String(data.weightKg).replace('.', ',')} kg` : undefined,
    quantity: opts.quantity || 1,
    equipped: opts.equipped ?? wearable,
    notes: data.description,
  };
}

/** Itens do equipamento inicial convertidos em linhas de inventário. */
export function equipmentFromOptions(options: (StartingEquipmentOption | undefined)[]): {
  items: CharacterEquipmentItem[];
  gold: number;
} {
  const items: CharacterEquipmentItem[] = [];
  let gold = 0;
  for (const opt of options) {
    if (!opt) continue;
    gold += opt.gold;
    for (const line of opt.items) {
      const qty = line.quantity || 1;
      const name = line.label || ITEMS_BY_ID[line.itemId]?.name;
      const existing = items.find((i) => i.itemId === line.itemId && i.name === name);
      if (existing) {
        existing.quantity += qty;
        continue;
      }
      const item = inventoryItemFromCatalog(line.itemId, { quantity: qty, label: line.label });
      if (item) items.push(item);
    }
  }
  return { items, gold };
}

const isSubclassPlaceholder = (name: string) => /^Característica de Subclasse/i.test(name) || /^Subclasse de /i.test(name);

// ---------------------------------------------------------------------------
// Cálculo principal
// ---------------------------------------------------------------------------

export function computeCharacter(input: CharacterBuild): ComputedCharacter {
  const level = Math.max(1, Math.min(20, Math.round(input.level || 1)));
  const build: CharacterBuild = { ...input, level };
  const species = SPECIES_BY_ID[build.speciesId];
  const lineage = findLineage(species, build.lineageId);
  const background = BACKGROUNDS_BY_ID[build.backgroundId];
  const cls = CLASSES_BY_ID[build.classId] || CLASSES_BY_ID.fighter;
  const subclass = level >= 3 ? cls.subclasses.find((s) => s.id === build.subclassId) : undefined;
  const pb = proficiencyBonusForLevel(level);

  const { scores, backgroundBonus } = computeAbilityScores(build, background);
  const mods = Object.fromEntries(ABILITIES.map((a) => [a.id, abilityModifier(scores[a.id])])) as Record<Ability, number>;

  const instances = featInstances(build, background, cls, subclass?.id, level);
  const feats = instances.map((f) => ({ id: f.feat.id, name: f.feat.name, source: f.source, description: f.feat.description }));
  const hasFeat = (id: string) => instances.some((f) => f.feat.id === id);

  // ---- Testes de resistência ---------------------------------------------
  const saveProficiencies = new Set<Ability>(cls.savingThrows);
  for (const a of build.asi) {
    if (a.type === 'feat' && a.featId === 'resilient' && a.level <= level) {
      const ab = Object.keys(a.increases)[0] as Ability | undefined;
      if (ab) saveProficiencies.add(ab);
    }
  }
  if (cls.id === 'monk' && level >= 14) ABILITIES.forEach((a) => saveProficiencies.add(a.id));
  if (cls.id === 'rogue' && level >= 15) {
    saveProficiencies.add('wis');
    saveProficiencies.add('cha');
  }
  const saveBonusAll = cls.id === 'paladin' && level >= 6 ? Math.max(1, mods.cha) : 0;
  const saves = Object.fromEntries(
    ABILITIES.map((a) => [a.id, mods[a.id] + (saveProficiencies.has(a.id) ? pb : 0) + saveBonusAll])
  ) as Record<Ability, number>;

  // ---- Perícias -----------------------------------------------------------
  const fixed = new Set<SkillId>();
  background?.skills.forEach((s) => fixed.add(s));
  build.speciesSkills.forEach((s) => fixed.add(s));
  const extraExpertise = new Set<SkillId>();
  let expertiseChoiceSlots = 0;
  for (const f of instances) {
    if (f.feat.id === 'skilled') {
      for (const choice of build.skilledChoices[f.key] || []) if (SKILL_NAME[choice as SkillId]) fixed.add(choice as SkillId);
    }
    const eff = f.feat.effects;
    if (!eff) continue;
    if (eff.allSkills) SKILLS.forEach((s) => fixed.add(s.id));
    if (eff.skillChoice) {
      for (const pick of (build.featChoices[f.key]?.picks || []).slice(0, eff.skillChoice.count)) {
        const sid = pick as SkillId;
        if (!SKILL_NAME[sid]) continue;
        if (eff.skillChoice.expertiseIfProficient && fixed.has(sid)) extraExpertise.add(sid);
        else fixed.add(sid);
      }
    }
    if (eff.expertiseChoice) {
      expertiseChoiceSlots += eff.expertiseChoice;
      for (const e of (build.featChoices[f.key]?.expertise || []).slice(0, eff.expertiseChoice)) extraExpertise.add(e as SkillId);
    }
  }
  const skillChoiceCount = classSkillCount(cls, level);
  const profSet = new Set<SkillId>(fixed);
  build.classSkills
    .filter((s) => cls.skillChoices.options.includes(s) && !fixed.has(s))
    .slice(0, skillChoiceCount)
    .forEach((s) => profSet.add(s));

  const expRule = expertiseRule(cls.id, level);
  const classExpertise = build.expertise
    .filter((s) => profSet.has(s) && (!expRule.options || expRule.options.includes(s)))
    .slice(0, expRule.count);
  const expertiseSet = new Set<SkillId>([...classExpertise, ...Array.from(extraExpertise).filter((s) => profSet.has(s))]);

  // Versatilidade (2024): metade da proficiência em testes de perícia sem proficiência.
  const jackOfAllTrades = cls.id === 'bard' && level >= 2;
  const orderChoice = (group: string) => build.options[group]?.[0];
  const thaumaturge = cls.id === 'cleric' && orderChoice('divine-order') === 'thaumaturge';
  const magician = cls.id === 'druid' && orderChoice('primal-order') === 'magician';

  const skills: SkillLine[] = SKILLS.map((s) => {
    const proficient = profSet.has(s.id);
    const expertise = proficient && expertiseSet.has(s.id);
    const half = jackOfAllTrades && !proficient;
    let bonus = mods[s.ability] + (proficient ? pb : 0) + (expertise ? pb : 0) + (half ? Math.floor(pb / 2) : 0);
    if (thaumaturge && (s.id === 'arcana' || s.id === 'religion')) bonus += Math.max(1, mods.wis);
    if (magician && (s.id === 'arcana' || s.id === 'nature')) bonus += Math.max(1, mods.wis);
    return { id: s.id, name: s.name, ability: s.ability, bonus, proficient, expertise, halfProficiency: half };
  });

  const initiative = mods.dex + (hasFeat('alert') ? pb : 0);
  const passivePerception = 10 + skills.find((s) => s.id === 'perception')!.bonus;

  // ---- Pontos de Vida -----------------------------------------------------
  const avg = cls.hitDie / 2 + 1;
  let maxHp = cls.hitDie + mods.con;
  for (let lv = 2; lv <= level; lv++) {
    const roll = build.hpMethod === 'rolled' ? build.hpRolls[lv - 2] : undefined;
    maxHp += Math.max(1, (roll && roll >= 1 && roll <= cls.hitDie ? roll : avg) + mods.con);
  }
  if (species?.hpPerLevel) maxHp += species.hpPerLevel * level;
  if (hasFeat('tough')) maxHp += 2 * level;
  if (cls.id === 'sorcerer' && subclass?.id === 'draconic-sorcery') maxHp += level;
  for (const f of instances) maxHp += f.feat.effects?.hpFlat || 0;
  maxHp = Math.max(1, maxHp);

  // ---- Deslocamento -------------------------------------------------------
  let speedFt = lineage?.speedFt || species?.speedFt || 30;
  const notes: string[] = [];
  if (cls.id === 'monk' && level >= 2) {
    speedFt += level >= 18 ? 30 : level >= 14 ? 25 : level >= 10 ? 20 : level >= 6 ? 15 : 10;
    notes.push('sem armadura e sem escudo');
  }
  if (cls.id === 'barbarian' && level >= 5) {
    speedFt += 10;
    notes.push('sem armadura pesada');
  }
  if (cls.id === 'ranger' && level >= 6) {
    speedFt += 10;
    if (!notes.includes('sem armadura pesada')) notes.push('sem armadura pesada');
  }
  for (const f of instances) speedFt += f.feat.effects?.speedFt || 0;
  const speedLabel = `${feetToMeters(speedFt)}${notes.length ? ` (${notes.join('; ')})` : ''}`;

  // ---- Proficiências ------------------------------------------------------
  const armorTraining = [...cls.armorTraining];
  const weaponProficiencies = [...cls.weaponProficiencies];
  if (cls.id === 'cleric' && orderChoice('divine-order') === 'protector') {
    armorTraining.push('Armaduras Pesadas');
    weaponProficiencies.push('Armas Marciais');
  }
  if (cls.id === 'druid' && orderChoice('primal-order') === 'warden') {
    armorTraining.push('Armaduras Médias');
    weaponProficiencies.push('Armas Marciais');
  }
  if (subclass?.id === 'college-of-valor') {
    armorTraining.push('Armaduras Médias', 'Escudos');
    weaponProficiencies.push('Armas Marciais');
  }

  const toolProficiencies: string[] = [];
  const toolRule = classToolChoiceRule(cls.id);
  if (toolRule) toolProficiencies.push(...build.classToolChoices.filter(Boolean).slice(0, toolRule.count));
  else toolProficiencies.push(...cls.toolProficiencies);
  if (background) toolProficiencies.push(background.toolChoice ? build.backgroundToolChoice || background.tool : background.tool);
  for (const f of instances) {
    if (f.feat.id === 'skilled') {
      for (const choice of build.skilledChoices[f.key] || []) if (!SKILL_NAME[choice as SkillId]) toolProficiencies.push(choice);
    }
    const eff = f.feat.effects;
    if (!eff) continue;
    armorTraining.push(...(eff.armorTraining || []));
    weaponProficiencies.push(...(eff.weaponProficiencies || []));
    toolProficiencies.push(...(eff.tools || []));
    if (eff.toolChoice) toolProficiencies.push(...(build.featChoices[f.key]?.picks || []).slice(0, eff.toolChoice.count));
  }

  const languageChoices = languageChoiceCount(cls.id, level);
  const languages = ['Comum', ...build.languages.filter((l) => CHOOSABLE_LANGUAGES.includes(l)).slice(0, languageChoices)];
  if (cls.id === 'rogue') languages.push('Gíria de Ladrão');
  if (cls.id === 'druid') languages.push('Druídico');

  // ---- Conjuração ---------------------------------------------------------
  const kind = casterKind(cls.id, subclass?.id);
  const { slots: spellSlots, maxCircle } = buildSlots(kind, level);
  const spellcastingAbility = kind !== 'none' ? SPELLCASTING_ABILITY[cls.id] : undefined;
  const spellSaveDc = spellcastingAbility ? 8 + pb + mods[spellcastingAbility] : undefined;
  const spellAttack = spellcastingAbility ? pb + mods[spellcastingAbility] : undefined;
  let cantripLimit = cantripsKnown(cls.id, subclass?.id, level);
  if (thaumaturge || magician) cantripLimit += 1;
  if (cls.id === 'rogue' && subclass?.id === 'arcane-trickster') cantripLimit -= 1; // Mão Mágica é concedida
  const preparedLimit = kind === 'third' ? PREPARED_THIRD[level - 1] : kind === 'none' ? 0 : PREPARED[cls.id]?.[level - 1] || 0;
  const spellbookSize = cls.id === 'wizard' ? 6 + 2 * (level - 1) : 0;
  const ownList = spellListFor(cls.id, subclass?.id);
  const classSpellLists: ClassId[] = ownList ? [ownList] : [];
  if (cls.id === 'bard' && level >= 10) classSpellLists.push('cleric', 'druid', 'wizard');

  const grantedSpells = computeGrantedSpells(build, { species, lineage, cls, subclass, feats: instances });

  // ---- Características ----------------------------------------------------
  const optionGroups = activeOptionGroups(cls, subclass?.id, level);
  const features: CharacterFeature[] = [];
  for (const f of cls.features) {
    if (f.level > level) continue;
    if (subclass && isSubclassPlaceholder(f.name) && f.level > 3) continue;
    features.push({ level: f.level, name: f.name, source: cls.name, description: f.description });
  }
  if (subclass) {
    for (const f of subclass.features) {
      if (f.level <= level) features.push({ level: f.level, name: f.name, source: subclass.name, description: f.description });
    }
  }
  for (const group of optionGroups) {
    for (const optId of (build.options[group.id] || []).slice(0, group.countByLevel[level - 1])) {
      const opt = group.options.find((o) => o.id === optId);
      if (opt) features.push({ level: group.level, name: `${group.name}: ${opt.name}`, source: cls.name, description: opt.description });
    }
  }
  if (species) {
    for (const t of species.traits) {
      if ((t.level || 1) <= level) features.push({ level: t.level || 1, name: t.name, source: species.name, description: t.description });
    }
    if (lineage) features.push({ level: 1, name: `${species.lineage?.label}: ${lineage.name}`, source: species.name, description: lineage.description });
  }
  for (const feat of feats) features.push({ level: 1, name: `Talento: ${feat.name}`, source: feat.source, description: feat.description });
  features.sort((a, b) => a.level - b.level);

  const resources = cls.tableColumns
    .map((col) => ({ label: col.label, value: col.values[level - 1] || '—' }))
    .filter((r) => r.value && r.value !== '—' && r.label !== 'Maestria em Armas');
  const wm = weaponMasteryCount(cls.id, level);
  if (wm > 0) resources.push({ label: 'Maestria em Armas', value: String(wm) });

  const classEquipmentOptions = CLASS_STARTING_EQUIPMENT[cls.id] || [];
  const backgroundEquipmentOptions = background?.equipment || [];
  const startingGold =
    (classEquipmentOptions.find((o) => o.id === build.classEquipment)?.gold || 0) +
    (backgroundEquipmentOptions.find((o) => o.id === build.backgroundEquipment)?.gold || 0);

  void expertiseChoiceSlots;

  return {
    species,
    lineage,
    background,
    cls,
    subclass,
    level,
    proficiencyBonus: pb,
    scores,
    mods,
    backgroundBonus,
    saveProficiencies: Array.from(saveProficiencies),
    saves,
    saveBonusAll,
    skills,
    skillProficiencies: Array.from(profSet),
    skillExpertise: Array.from(expertiseSet),
    jackOfAllTrades,
    initiative,
    passivePerception,
    maxHp,
    hitDice: `${level}d${cls.hitDie}`,
    speedFt,
    speedLabel,
    darkvisionFt: lineage?.darkvisionFt || species?.darkvisionFt,
    size: build.size || species?.sizeOptions[0] || 'Médio',
    armorTraining: Array.from(new Set(armorTraining)),
    weaponProficiencies: Array.from(new Set(weaponProficiencies)),
    toolProficiencies: Array.from(new Set(toolProficiencies.filter(Boolean))),
    languages: Array.from(new Set(languages)),
    feats,
    featInstances: instances,
    features,
    resources,
    casterKind: kind,
    spellcastingAbility,
    spellSaveDc,
    spellAttack,
    spellSlots,
    maxSpellCircle: maxCircle,
    cantripLimit: Math.max(0, cantripLimit),
    preparedLimit,
    spellbookSize,
    classSpellLists,
    grantedSpells,
    skillChoiceCount,
    skillChoiceOptions: cls.skillChoices.options,
    fixedSkills: Array.from(fixed),
    expertise: expRule,
    weaponMasteryCount: wm,
    fightingStyleCount: fightingStyleCount(cls.id, subclass?.id, level),
    optionGroups,
    asiLevels: [...asiLevels(cls.id).filter((l) => l <= level), ...(level >= 19 ? [19] : [])],
    languageChoices,
    classEquipmentOptions,
    backgroundEquipmentOptions,
    startingGold,
  };
}

/** Magias disponíveis para as listas e o círculo máximo informados. */
export function spellsForLists(lists: ClassId[], maxLevel: number, minLevel = 0): SpellData[] {
  return SPELLS.filter((s) => s.level >= minLevel && s.level <= maxLevel && s.classes.some((c) => lists.includes(c)));
}

// ---------------------------------------------------------------------------
// Limpeza e validação
// ---------------------------------------------------------------------------

const uniq = <T,>(list: T[]) => Array.from(new Set(list));

/**
 * Remove escolhas que deixaram de ser válidas (classe/espécie/antecedente/nível
 * trocados) e corta listas que excedem os limites. Chamado ao salvar.
 */
export function normalizeBuild(input: CharacterBuild): CharacterBuild {
  const b: CharacterBuild = JSON.parse(JSON.stringify(input));
  const c = computeCharacter(b);
  const granted = new Set(c.grantedSpells.map((g) => g.spell.id));
  const fixed = new Set(c.fixedSkills);

  b.level = c.level;
  if (b.level < 3) b.subclassId = undefined;
  b.classSkills = uniq(b.classSkills.filter((s) => c.skillChoiceOptions.includes(s) && !fixed.has(s))).slice(0, c.skillChoiceCount);
  b.expertise = uniq(b.expertise).filter((s) => c.skillProficiencies.includes(s)).slice(0, c.expertise.count);
  b.speciesSkills = c.species?.skillChoice ? b.speciesSkills.slice(0, c.species.skillChoice.count) : [];
  if (!c.species?.bonusOriginFeat) b.speciesFeat = undefined;
  b.languages = uniq(b.languages.filter((l) => CHOOSABLE_LANGUAGES.includes(l))).slice(0, c.languageChoices);

  const options: Record<string, string[]> = {};
  for (const g of c.optionGroups) {
    const max = g.countByLevel[c.level - 1] || 0;
    options[g.id] = uniq(b.options[g.id] || [])
      .filter((id) => {
        const opt = g.options.find((o) => o.id === id);
        return opt && !(typeof opt.minLevel === 'number' && opt.minLevel > c.level);
      })
      .slice(0, max);
  }
  if (c.cls.id === 'warlock') {
    const maxArc = mysticArcanumMaxLevel(c.level);
    options['mystic-arcanum'] = (b.options['mystic-arcanum'] || []).filter((id) => {
      const sp = SPELLS_BY_ID[id];
      return sp && sp.level >= 6 && sp.level <= maxArc && sp.classes.includes('warlock');
    });
  }
  b.options = options;

  b.fightingStyles = uniq(b.fightingStyles).slice(0, c.fightingStyleCount);
  b.weaponMasteries = uniq(b.weaponMasteries).slice(0, c.weaponMasteryCount);
  const toolRule = classToolChoiceRule(c.cls.id);
  b.classToolChoices = toolRule ? uniq(b.classToolChoices).slice(0, toolRule.count) : [];
  const levels = asiLevels(c.cls.id);
  b.asi = b.asi.filter((a) => (a.level === 19 ? c.level >= 19 : levels.includes(a.level) && a.level <= c.level));

  const lists = c.classSpellLists;
  const cantripPool = new Set(spellsForLists(lists.slice(0, 1), 0, 0).map((s) => s.id));
  b.cantrips = uniq(b.cantrips.filter((id) => cantripPool.has(id) && !granted.has(id))).slice(0, c.cantripLimit);
  const leveledPool = new Set(spellsForLists(lists, c.maxSpellCircle, 1).map((s) => s.id));
  if (c.cls.id === 'wizard') {
    b.spellbook = uniq(b.spellbook.filter((id) => leveledPool.has(id))).slice(0, c.spellbookSize);
    b.prepared = uniq(b.prepared.filter((id) => b.spellbook.includes(id) && !granted.has(id))).slice(0, c.preparedLimit);
  } else {
    b.spellbook = [];
    b.prepared = uniq(b.prepared.filter((id) => leveledPool.has(id) && !granted.has(id))).slice(0, c.preparedLimit);
  }

  // Escolhas de talentos que já não existem
  const keys = new Set(c.featInstances.map((f) => f.key));
  for (const k of Object.keys(b.magicInitiate)) if (!keys.has(k) || !b.magicInitiate[k]) delete b.magicInitiate[k];
  for (const k of Object.keys(b.skilledChoices)) if (!keys.has(k)) delete b.skilledChoices[k];
  for (const k of Object.keys(b.featChoices || {})) if (!keys.has(k)) delete b.featChoices[k];
  if (c.cls.id !== 'wizard') b.spellbook = [];
  return b;
}

export type BuildStep = 'class' | 'origin' | 'abilities' | 'choices' | 'spells' | 'equipment' | 'details';

export interface BuildIssue {
  step: BuildStep;
  text: string;
}

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

function countIssue(add: (step: BuildStep, text: string) => void, step: BuildStep, have: number, need: number, missing: string, extra: string) {
  if (have < need) add(step, missing.replace('{n}', String(need - have)));
  else if (have > need) add(step, extra.replace('{n}', String(have - need)));
}

/** Pendências do build, agrupáveis por etapa do criador. */
export function buildIssues(build: CharacterBuild, c: ComputedCharacter): BuildIssue[] {
  const issues: BuildIssue[] = [];
  const add = (step: BuildStep, text: string) => issues.push({ step, text });
  if (c.level >= 3 && !c.subclass) add('class', 'Escolha uma subclasse.');

  // Origem
  if (!c.background) add('origin', 'Escolha um antecedente.');
  if (c.background && build.abilityBonusMode === '2-1' && (!build.abilityPlus2 || !build.abilityPlus1 || build.abilityPlus1 === build.abilityPlus2)) {
    add('origin', 'Distribua os aumentos do antecedente (+2 e +1 em atributos diferentes).');
  }
  if (c.background?.toolChoice && !build.backgroundToolChoice) add('origin', 'Escolha a ferramenta do antecedente.');
  if (!c.species) add('origin', 'Escolha uma espécie.');
  if (c.species?.lineage && !c.lineage) add('origin', `Escolha: ${c.species.lineage.label}.`);
  if (c.species?.skillChoice && build.speciesSkills.length < c.species.skillChoice.count) {
    add('origin', `Escolha a perícia de ${c.species.skillChoice.label}.`);
  }
  if (c.species?.bonusOriginFeat && !build.speciesFeat) add('origin', 'Escolha o talento de Origem do Humano.');
  countIssue(add, 'origin', build.languages.filter((l) => CHOOSABLE_LANGUAGES.includes(l)).length, c.languageChoices, 'Escolha {n} idioma(s).', 'Remova {n} idioma(s).');

  // Talentos (qualquer origem)
  for (const f of c.featInstances) {
    const step: BuildStep = f.key.startsWith('asi-') ? 'abilities' : f.key.startsWith('style-') ? 'choices' : 'origin';
    const label = `${f.feat.name}${f.key.startsWith('asi-') ? ` (nível ${f.key.slice(4)})` : ''}`;
    if (f.feat.id === 'magic-initiate') {
      const mi = build.magicInitiate[f.key];
      if (!mi || mi.cantrips.length < 2 || !mi.spell) add(step, `${label}: escolha 2 truques e 1 magia de 1º círculo.`);
    }
    if (f.feat.id === 'skilled' && (build.skilledChoices[f.key] || []).length < 3) add(step, `${label}: escolha 3 perícias ou ferramentas.`);
    const eff = f.feat.effects;
    const ch = build.featChoices[f.key] || {};
    if (eff?.skillChoice && (ch.picks || []).length < eff.skillChoice.count) add(step, `${label}: escolha a perícia.`);
    if (eff?.expertiseChoice && (ch.expertise || []).length < eff.expertiseChoice) add(step, `${label}: escolha a Especialização.`);
    if (eff?.toolChoice && (ch.picks || []).length < eff.toolChoice.count) add(step, `${label}: escolha ${eff.toolChoice.count} ferramenta(s) ou instrumento(s).`);
    if (eff?.spellChoice && !ch.spell) add(step, `${label}: escolha a magia de 1º círculo.`);
    if (eff?.cantripChoice && (ch.picks || []).length < eff.cantripChoice.count) add(step, `${label}: escolha ${eff.cantripChoice.count} truques.`);
    const asiChoice = f.key.startsWith('asi-') ? build.asi.find((a) => `asi-${a.level}` === f.key) : undefined;
    if (asiChoice && f.feat.abilityIncrease && Object.keys(asiChoice.increases).length === 0) {
      add('abilities', `${label}: escolha o atributo que recebe +1.`);
    }
  }

  // Atributos
  const sorted = Object.values(build.baseScores).sort((a, b) => b - a);
  if (build.statMethod === 'standard' && sorted.join(',') !== STANDARD_ARRAY.join(',')) {
    add('abilities', 'O arranjo padrão deve usar 15, 14, 13, 12, 10 e 8, uma vez cada.');
  }
  if (build.statMethod === 'pointbuy') {
    const cost = Object.values(build.baseScores).reduce((s, v) => s + (POINT_COST[v] ?? 99), 0);
    if (cost > 27) add('abilities', 'A compra de pontos passou de 27 pontos.');
  }
  if (build.statMethod === 'roll4d6' && build.rolledScores?.length === 6) {
    const rolled = [...build.rolledScores].sort((a, b) => b - a);
    if (rolled.join(',') !== sorted.join(',')) add('abilities', 'Use cada valor rolado uma vez.');
  }
  for (const lvl of c.asiLevels) {
    const choice = build.asi.find((a) => a.level === lvl);
    const total = choice ? Object.values(choice.increases).reduce((sum, v) => sum + (v || 0), 0) : 0;
    if (!choice) add('abilities', `Nível ${lvl}: escolha Aumento no Valor de Atributo ou talento.`);
    else if (choice.type === 'asi' && total < 2) add('abilities', `Nível ${lvl}: distribua os 2 pontos de atributo.`);
    else if (choice.type === 'feat' && !choice.featId) add('abilities', `Nível ${lvl}: escolha o talento.`);
  }

  // Características
  const fixed = new Set(c.fixedSkills);
  const chosenSkills = build.classSkills.filter((s) => c.skillChoiceOptions.includes(s) && !fixed.has(s)).length;
  countIssue(add, 'choices', chosenSkills, c.skillChoiceCount, 'Escolha {n} perícia(s) de classe.', 'Remova {n} perícia(s) de classe.');
  if (c.expertise.count > 0) {
    const have = build.expertise.filter((s) => c.skillProficiencies.includes(s)).length;
    countIssue(add, 'choices', have, c.expertise.count, 'Escolha {n} perícia(s) para Especialização.', 'Remova {n} Especialização(ões).');
  }
  for (const group of c.optionGroups) {
    countIssue(add, 'choices', (build.options[group.id] || []).length, group.countByLevel[c.level - 1] || 0, `${group.name}: escolha {n} opção(ões).`, `${group.name}: remova {n} opção(ões).`);
  }
  countIssue(add, 'choices', build.fightingStyles.length, c.fightingStyleCount, 'Escolha o Estilo de Luta.', 'Remova {n} Estilo(s) de Luta.');
  countIssue(add, 'choices', build.weaponMasteries.length, c.weaponMasteryCount, 'Escolha {n} arma(s) para Maestria.', 'Remova {n} arma(s) de Maestria.');
  const toolRule = classToolChoiceRule(c.cls.id);
  if (toolRule) {
    countIssue(add, 'choices', build.classToolChoices.length, toolRule.count, 'Escolha {n} ferramenta(s) ou instrumento(s) da classe.', 'Remova {n} ferramenta(s).');
  }

  // Magias
  const granted = new Set(c.grantedSpells.map((g) => g.spell.id));
  const cantrips = build.cantrips.filter((id) => !granted.has(id)).length;
  const prepared = build.prepared.filter((id) => !granted.has(id)).length;
  if (c.cantripLimit > 0) countIssue(add, 'spells', cantrips, c.cantripLimit, 'Escolha {n} truque(s).', 'Remova {n} truque(s).');
  if (c.cls.id === 'wizard') countIssue(add, 'spells', build.spellbook.length, c.spellbookSize, 'Grimório: adicione {n} magia(s).', 'Grimório: remova {n} magia(s).');
  if (c.preparedLimit > 0) countIssue(add, 'spells', prepared, c.preparedLimit, 'Prepare {n} magia(s).', 'Desmarque {n} magia(s) preparada(s).');
  const tooHigh = [...build.cantrips, ...build.prepared].map((id) => SPELLS_BY_ID[id]).filter((s) => s && s.level > c.maxSpellCircle);
  if (tooHigh.length) add('spells', `Magias acima do círculo disponível: ${tooHigh.map((s) => s!.name).join(', ')}.`);
  if (c.cls.id === 'warlock') {
    const maxArc = mysticArcanumMaxLevel(c.level);
    const needed = maxArc >= 6 ? maxArc - 5 : 0;
    countIssue(add, 'spells', (build.options['mystic-arcanum'] || []).length, needed, 'Arcana Mística: escolha {n} magia(s).', 'Arcana Mística: remova {n} magia(s).');
  }
  return issues;
}
