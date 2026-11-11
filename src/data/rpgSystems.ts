export interface RegisteredRpgSystem {
  id: string;
  name: string;
  shortLabel: string;
  defaultTone: string;
  supportsAutoSheet: boolean;
  description: string;
}

/**
 * Catálogo inicial de sistemas cadastrados para criação de campanhas.
 * Preparado para expansão dinâmica quando o módulo de cadastro de sistemas for implementado.
 */
export const REGISTERED_RPG_SYSTEMS: RegisteredRpgSystem[] = [
  {
    id: 'dnd-55e',
    name: 'D&D 5.5e (2024)',
    shortLabel: 'D&D 5.5e',
    defaultTone: 'Fantasia Épica & Aventura',
    supportsAutoSheet: true,
    description: 'Regras atualizadas 2024 (SRD 5.2) com fichas progressivas Nv. 1–20 e Maestrias de Arma.',
  },
  {
    id: 'dnd-5e',
    name: 'D&D 5e (2014)',
    shortLabel: 'D&D 5e',
    defaultTone: 'Fantasia Clássica',
    supportsAutoSheet: true,
    description: 'Quinta edição clássica de Dungeons & Dragons.',
  },
  {
    id: 'tormenta-20',
    name: 'Tormenta20 (Jogo do Ano)',
    shortLabel: 'T20 JdA',
    defaultTone: 'Fantasia Heroica & Intriga',
    supportsAutoSheet: false,
    description: 'RPG brasileiro de alta fantasia com Pontos de Mana e Arton.',
  },
  {
    id: 'ordem-paranormal',
    name: 'Ordem Paranormal RPG',
    shortLabel: 'Ordem Paranormal',
    defaultTone: 'Investigação & Horror Oculto',
    supportsAutoSheet: false,
    description: 'Investigação paranormal urbana com NEX, Sanidade e Esforço.',
  },
  {
    id: 'pathfinder-2e',
    name: 'Pathfinder 2e Remaster',
    shortLabel: 'PF2e',
    defaultTone: 'Fantasia Tática',
    supportsAutoSheet: false,
    description: 'Sistema d20 tático de três ações por turno.',
  },
  {
    id: 'call-of-cthulhu-7e',
    name: 'Call of Cthulhu 7e',
    shortLabel: 'CoC 7e',
    defaultTone: 'Horror Cósmico & Mistério',
    supportsAutoSheet: false,
    description: 'Investigação de mistérios sobrenaturais baseada em d100.',
  },
  {
    id: 'vampire-5e',
    name: 'Vampiro: A Máscara 5ª Ed.',
    shortLabel: 'V5',
    defaultTone: 'Horror Pessoal & Política Sombria',
    supportsAutoSheet: false,
    description: 'Narrativa gótica urbana de intriga vampírica.',
  },
  {
    id: 'custom',
    name: 'Sistema Próprio / Genérico',
    shortLabel: 'Próprio',
    defaultTone: 'Sob medida',
    supportsAutoSheet: false,
    description: 'Cenário com regras próprias ou adaptação livre.',
  },
];
