import type { Ability, SkillId } from './types';

export const ABILITIES: { id: Ability; name: string; short: string }[] = [
  { id: 'str', name: 'Força', short: 'FOR' },
  { id: 'dex', name: 'Destreza', short: 'DES' },
  { id: 'con', name: 'Constituição', short: 'CON' },
  { id: 'int', name: 'Inteligência', short: 'INT' },
  { id: 'wis', name: 'Sabedoria', short: 'SAB' },
  { id: 'cha', name: 'Carisma', short: 'CAR' },
];

export const ABILITY_NAME: Record<Ability, string> = Object.fromEntries(
  ABILITIES.map((a) => [a.id, a.name])
) as Record<Ability, string>;

export const ABILITY_SHORT: Record<Ability, string> = Object.fromEntries(
  ABILITIES.map((a) => [a.id, a.short])
) as Record<Ability, string>;

export const SKILLS: { id: SkillId; name: string; ability: Ability }[] = [
  { id: 'acrobatics', name: 'Acrobacia', ability: 'dex' },
  { id: 'animal-handling', name: 'Adestrar Animais', ability: 'wis' },
  { id: 'arcana', name: 'Arcanismo', ability: 'int' },
  { id: 'athletics', name: 'Atletismo', ability: 'str' },
  { id: 'performance', name: 'Atuação', ability: 'cha' },
  { id: 'deception', name: 'Enganação', ability: 'cha' },
  { id: 'stealth', name: 'Furtividade', ability: 'dex' },
  { id: 'history', name: 'História', ability: 'int' },
  { id: 'intimidation', name: 'Intimidação', ability: 'cha' },
  { id: 'insight', name: 'Intuição', ability: 'wis' },
  { id: 'investigation', name: 'Investigação', ability: 'int' },
  { id: 'medicine', name: 'Medicina', ability: 'wis' },
  { id: 'nature', name: 'Natureza', ability: 'int' },
  { id: 'perception', name: 'Percepção', ability: 'wis' },
  { id: 'persuasion', name: 'Persuasão', ability: 'cha' },
  { id: 'sleight-of-hand', name: 'Prestidigitação', ability: 'dex' },
  { id: 'religion', name: 'Religião', ability: 'int' },
  { id: 'survival', name: 'Sobrevivência', ability: 'wis' },
];

export const ALL_SKILL_IDS: SkillId[] = SKILLS.map((s) => s.id);

export const SKILL_NAME: Record<SkillId, string> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.name])
) as Record<SkillId, string>;

/** Converte nomes de perícia antigos (texto livre) para ids. */
export function skillIdFromName(name: string): SkillId | undefined {
  const n = name.trim().toLowerCase();
  return SKILLS.find((s) => s.name.toLowerCase() === n || s.id === n)?.id;
}

export const STANDARD_LANGUAGES = [
  'Comum',
  'Língua de Sinais Comum',
  'Dracônico',
  'Anão',
  'Élfico',
  'Gigante',
  'Gnômico',
  'Goblin',
  'Halfling',
  'Orc',
];

export const RARE_LANGUAGES = [
  'Abissal',
  'Celestial',
  'Dialeto Subterrâneo',
  'Druídico',
  'Infernal',
  'Primordial',
  'Silvestre',
  'Gíria de Ladrão',
  'Subcomum',
];

export const ALIGNMENTS = [
  'Leal e Bom',
  'Neutro e Bom',
  'Caótico e Bom',
  'Leal e Neutro',
  'Neutro',
  'Caótico e Neutro',
  'Leal e Mau',
  'Neutro e Mau',
  'Caótico e Mau',
];

export const ARTISAN_TOOLS = [
  'Ferramentas de Alquimista',
  'Suprimentos de Cervejeiro',
  'Suprimentos de Calígrafo',
  'Ferramentas de Carpinteiro',
  'Ferramentas de Cartógrafo',
  'Ferramentas de Sapateiro',
  'Utensílios de Cozinheiro',
  'Ferramentas de Vidreiro',
  'Ferramentas de Joalheiro',
  'Ferramentas de Coureiro',
  'Ferramentas de Pedreiro',
  'Suprimentos de Pintor',
  'Ferramentas de Oleiro',
  'Ferramentas de Ferreiro',
  'Ferramentas de Funileiro',
  'Ferramentas de Tecelão',
  'Ferramentas de Entalhador',
];

export const MUSICAL_INSTRUMENTS = [
  'Alaúde',
  'Charamela',
  'Cornamusa',
  'Flauta',
  'Flauta de Pã',
  'Lira',
  'Saltério',
  'Tambor',
  'Trompa',
  'Viola',
];

export const GAMING_SETS = ['Dados', 'Baralho de Dragões', 'Cartas', 'Jogo de Três Dragões'];

export const OTHER_TOOLS = [
  'Kit de Disfarce',
  'Kit de Falsificação',
  'Kit de Herbalismo',
  'Ferramentas de Navegador',
  'Kit de Venenos',
  'Ferramentas de Ladrão',
];

/** Proficiência por nível de personagem (1–20). */
export function proficiencyBonusForLevel(level: number): number {
  return Math.ceil(Math.max(1, Math.min(20, level)) / 4) + 1;
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Converte pés em metros no padrão da edição brasileira (5 pés = 1,5 m). */
export function feetToMeters(feet: number): string {
  const m = (feet / 5) * 1.5;
  return `${Number.isInteger(m) ? m : m.toFixed(1).replace('.', ',')} m`;
}
