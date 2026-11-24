import type { Ability, ClassId, SkillId } from '../data/dnd2024/types';
import type { StatGenerationMethod } from '../types/campaign';

/** Escolhas de um talento que concede magias (Iniciado em Magia). */
export interface MagicInitiateChoice {
  list: 'cleric' | 'druid' | 'wizard';
  ability: Ability;
  cantrips: string[];
  spell: string;
}

export interface FeatChoice {
  /** perícias, ferramentas ou truques escolhidos */
  picks?: string[];
  /** perícias escolhidas para Especialização */
  expertise?: string[];
  /** magia escolhida (Tocado pelas Fadas/Sombras) */
  spell?: string;
}

export interface AsiChoice {
  level: number;
  /** 'asi' = Aumento no Valor de Atributo; 'feat' = talento geral/dádiva épica */
  type: 'asi' | 'feat';
  featId?: string;
  /** aumentos aplicados (ASI: +2 em um ou +1 em dois; talento: +1 em um) */
  increases: Partial<Record<Ability, number>>;
}

/**
 * Todas as escolhas feitas no criador de personagem. É salvo na ficha
 * (campo `build`) para permitir reeditar e subir de nível com as regras.
 */
export interface CharacterBuild {
  version: 1;
  // Espécie
  speciesId: string;
  lineageId?: string;
  size?: 'Médio' | 'Pequeno';
  /** atributo de conjuração das magias de espécie (Elfo, Gnomo, Tiefling) */
  speciesSpellAbility?: Ability;
  /** perícia(s) escolhida(s) pela espécie (Elfo: Sentidos Aguçados; Humano: Hábil) */
  speciesSkills: SkillId[];
  /** Humano: talento de Origem adicional */
  speciesFeat?: string;
  // Antecedente
  backgroundId: string;
  abilityBonusMode: '2-1' | '1-1-1';
  abilityPlus2?: Ability;
  abilityPlus1?: Ability;
  backgroundToolChoice?: string;
  // Classe
  classId: ClassId;
  subclassId?: string;
  level: number;
  classSkills: SkillId[];
  expertise: SkillId[];
  /** escolhas de grupos de opções (Ordem Divina, Invocações, Metamagia, Manobras…) */
  options: Record<string, string[]>;
  fightingStyles: string[];
  /** ids de itens (armas) com Maestria */
  weaponMasteries: string[];
  asi: AsiChoice[];
  /** proficiência de ferramenta/instrumento da classe, quando é escolha */
  classToolChoices: string[];
  // Talentos com escolhas. A chave identifica a origem do talento:
  // 'background', 'species', 'asi-<nível>' ou 'style-<id>'.
  /** escolhas do Habilidoso (perícias ou ferramentas) */
  skilledChoices: Record<string, string[]>;
  magicInitiate: Record<string, MagicInitiateChoice>;
  /** demais escolhas de talento (perícias, especialização, ferramentas, truques, magia) */
  featChoices: Record<string, FeatChoice>;
  // Atributos
  statMethod: StatGenerationMethod;
  baseScores: Record<Ability, number>;
  /** valores obtidos na rolagem 4d6 (para distribuir entre os atributos) */
  rolledScores?: number[];
  // Magias da classe
  cantrips: string[];
  /** magias preparadas (ou conhecidas) da classe */
  prepared: string[];
  /** Mago: magias no grimório */
  spellbook: string[];
  // Equipamento inicial
  classEquipment: string; // 'A' | 'B' | 'C'
  backgroundEquipment: string; // 'A' | 'B'
  // Idiomas escolhidos (além de Comum)
  languages: string[];
  // Pontos de Vida
  hpMethod: 'average' | 'rolled';
  /** rolagens de PV dos níveis 2+ (índice 0 = nível 2) */
  hpRolls: number[];
}

/** Arranjo padrão já distribuído (prioridade do Guerreiro, a classe inicial). */
export const DEFAULT_BASE_SCORES: Record<Ability, number> = {
  str: 15,
  dex: 13,
  con: 14,
  int: 8,
  wis: 12,
  cha: 10,
};

export function createEmptyBuild(): CharacterBuild {
  return {
    version: 1,
    speciesId: '',
    speciesSkills: [],
    backgroundId: '',
    abilityBonusMode: '2-1',
    classId: 'fighter',
    level: 1,
    classSkills: [],
    expertise: [],
    options: {},
    fightingStyles: [],
    weaponMasteries: [],
    asi: [],
    classToolChoices: [],
    skilledChoices: {},
    magicInitiate: {},
    featChoices: {},
    statMethod: 'standard',
    baseScores: { ...DEFAULT_BASE_SCORES },
    cantrips: [],
    prepared: [],
    spellbook: [],
    classEquipment: 'A',
    backgroundEquipment: 'A',
    languages: [],
    hpMethod: 'average',
    hpRolls: [],
  };
}

/** Valida e completa um build vindo do banco (pode ser de versões anteriores). */
export function parseBuild(raw: unknown): CharacterBuild | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Partial<CharacterBuild>;
  if (b.version !== 1 || !b.classId) return null;
  return { ...createEmptyBuild(), ...b } as CharacterBuild;
}
