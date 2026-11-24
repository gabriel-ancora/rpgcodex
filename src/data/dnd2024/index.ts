import type { ClassData, ClassId, SpellData } from './types';
import { SPELLS_LEVEL_0 } from './spells/level0';
import { SPELLS_LEVEL_1 } from './spells/level1';
import { SPELLS_LEVEL_2 } from './spells/level2';
import { SPELLS_LEVEL_3 } from './spells/level3';
import { SPELLS_LEVEL_4 } from './spells/level4';
import { SPELLS_LEVEL_5 } from './spells/level5';
import { SPELLS_LEVEL_6 } from './spells/level6';
import { SPELLS_LEVEL_7 } from './spells/level7';
import { SPELLS_LEVEL_8 } from './spells/level8';
import { SPELLS_LEVEL_9 } from './spells/level9';
import { BARBARIAN } from './classes/barbarian';
import { BARD } from './classes/bard';
import { CLERIC } from './classes/cleric';
import { DRUID } from './classes/druid';
import { FIGHTER } from './classes/fighter';
import { MONK } from './classes/monk';
import { PALADIN } from './classes/paladin';
import { RANGER } from './classes/ranger';
import { ROGUE } from './classes/rogue';
import { SORCERER } from './classes/sorcerer';
import { WARLOCK } from './classes/warlock';
import { WIZARD } from './classes/wizard';

export * from './types';
export * from './core';
export * from './species';
export * from './backgrounds';
export * from './feats';
export * from './equipment';

export const SPELLS: SpellData[] = [
  ...SPELLS_LEVEL_0,
  ...SPELLS_LEVEL_1,
  ...SPELLS_LEVEL_2,
  ...SPELLS_LEVEL_3,
  ...SPELLS_LEVEL_4,
  ...SPELLS_LEVEL_5,
  ...SPELLS_LEVEL_6,
  ...SPELLS_LEVEL_7,
  ...SPELLS_LEVEL_8,
  ...SPELLS_LEVEL_9,
];

export const SPELLS_BY_ID: Record<string, SpellData> = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

export const CLASSES: ClassData[] = [
  BARBARIAN,
  BARD,
  CLERIC,
  DRUID,
  FIGHTER,
  MONK,
  PALADIN,
  RANGER,
  ROGUE,
  SORCERER,
  WARLOCK,
  WIZARD,
].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

export const CLASSES_BY_ID: Record<ClassId, ClassData> = Object.fromEntries(
  CLASSES.map((c) => [c.id, c])
) as Record<ClassId, ClassData>;

export const SPELL_SCHOOLS = [
  'Abjuração',
  'Adivinhação',
  'Conjuração',
  'Encantamento',
  'Evocação',
  'Ilusão',
  'Necromancia',
  'Transmutação',
] as const;

/** Normaliza texto para busca: minúsculas e sem acentos. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
