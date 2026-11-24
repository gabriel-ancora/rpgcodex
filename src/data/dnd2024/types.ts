/**
 * Modelo de dados das regras de D&D 5.5 (Livro do Jogador 2024), em português.
 *
 * Convenções de IDs (estáveis, usados para persistência e referências cruzadas):
 * - Todos os IDs são slugs kebab-case do nome em INGLÊS do Livro do Jogador 2024,
 *   sem apóstrofos: "Hunter's Mark" → "hunters-mark", "Tasha's Hideous Laughter" →
 *   "tashas-hideous-laughter", "Fire Bolt" → "fire-bolt".
 * - Distâncias em metros (1,5 m = 5 pés), como na edição brasileira.
 */

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type ClassId =
  | 'barbarian'
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'fighter'
  | 'monk'
  | 'paladin'
  | 'ranger'
  | 'rogue'
  | 'sorcerer'
  | 'warlock'
  | 'wizard';

export type SkillId =
  | 'acrobatics'
  | 'animal-handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight-of-hand'
  | 'stealth'
  | 'survival';

export type SpellSchool =
  | 'Abjuração'
  | 'Adivinhação'
  | 'Conjuração'
  | 'Encantamento'
  | 'Evocação'
  | 'Ilusão'
  | 'Necromancia'
  | 'Transmutação';

export interface SpellData {
  /** slug do nome em inglês (ver convenções acima) */
  id: string;
  /** nome oficial em português (edição brasileira) */
  name: string;
  /** nome em inglês, para referência e busca */
  nameEn: string;
  /** 0 = truque */
  level: number;
  school: SpellSchool;
  /** ex.: "Ação", "Ação Bônus", "Reação, que você toma quando…", "1 minuto" */
  castingTime: string;
  ritual?: boolean;
  /** ex.: "36 metros", "Toque", "Pessoal", "Pessoal (cone de 4,5 metros)" */
  range: string;
  /** ex.: "V, S, M (um pouco de enxofre)" */
  components: string;
  concentration?: boolean;
  /** ex.: "Instantânea", "Concentração, até 1 minuto" */
  duration: string;
  /** listas de classe que contêm a magia (Livro do Jogador 2024) */
  classes: ClassId[];
  /** efeito completo em português, com todos os números de regra */
  description: string;
  /** "Aprimoramento de Truque" ou "Usando um Espaço de Magia de Círculo Superior" */
  higherLevels?: string;
}

export interface FeatureData {
  level: number;
  name: string;
  description: string;
}

export interface SubclassData {
  id: string;
  name: string;
  nameEn: string;
  summary: string;
  features: FeatureData[];
  /** magias sempre preparadas concedidas pela subclasse, por nível de classe */
  alwaysPrepared?: { level: number; spells: string[] }[];
}

export interface OptionData {
  id: string;
  name: string;
  description: string;
  /** pré-requisito em texto (ex.: "Nível 5+ de Bruxo") */
  prerequisite?: string;
  /** nível mínimo de classe para escolher a opção, se houver */
  minLevel?: number;
}

/**
 * Grupo de opções escolhíveis de uma classe (Invocações Místicas, Metamagia,
 * Ordem Divina, Ordem Primal, Dádiva de Pacto…).
 */
export interface OptionGroupData {
  id: string;
  name: string;
  /** quando definido, o grupo só existe para essa subclasse (ex.: Manobras do Mestre de Batalha) */
  subclassId?: string;
  /** nível de classe em que a escolha aparece pela primeira vez */
  level: number;
  /** quantidade de escolhas por nível de classe (20 valores, índice 0 = nível 1) */
  countByLevel: number[];
  options: OptionData[];
}

export interface ClassTableColumn {
  label: string;
  /** 20 valores, índice 0 = nível 1. Use "—" quando não se aplica. */
  values: string[];
}

export interface ClassData {
  id: ClassId;
  name: string;
  nameEn: string;
  summary: string;
  hitDie: 6 | 8 | 10 | 12;
  primaryAbilities: Ability[];
  savingThrows: Ability[];
  armorTraining: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  skillChoices: { count: number; options: SkillId[] };
  /** características da classe base, níveis 1 a 20 */
  features: FeatureData[];
  /** colunas específicas da tabela da classe (Fúrias, Ataque Furtivo, Pontos de Foco…) */
  tableColumns: ClassTableColumn[];
  subclasses: SubclassData[];
  optionGroups?: OptionGroupData[];
}
