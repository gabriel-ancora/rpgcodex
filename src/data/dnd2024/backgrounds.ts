import type { Ability, SkillId } from './types';
import type { StartingEquipmentOption } from './equipment';

export interface BackgroundData {
  id: string;
  name: string;
  nameEn: string;
  summary: string;
  /** os três atributos que o antecedente pode aumentar (+2/+1 ou +1/+1/+1) */
  abilities: [Ability, Ability, Ability];
  /** id do talento de origem (ver feats.ts) */
  feat: string;
  /** lista de magia do Iniciado em Magia, quando aplicável */
  magicInitiateList?: 'cleric' | 'druid' | 'wizard';
  skills: [SkillId, SkillId];
  /** proficiência em ferramenta (texto); "choice:<grupo>" indica escolha */
  tool: string;
  toolChoice?: 'artisan' | 'instrument' | 'gaming';
  equipment: StartingEquipmentOption[];
}

const GOLD_ONLY = (gold = 50): StartingEquipmentOption => ({ id: 'B', label: 'Opção B', gold, items: [] });

export const BACKGROUNDS: BackgroundData[] = [
  {
    id: 'acolyte',
    name: 'Acólito',
    nameEn: 'Acolyte',
    summary: 'Você serviu em um templo, aprendendo ritos e preces.',
    abilities: ['int', 'wis', 'cha'],
    feat: 'magic-initiate',
    magicInitiateList: 'cleric',
    skills: ['insight', 'religion'],
    tool: 'Suprimentos de Calígrafo',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 8, items: [{ itemId: 'calligraphers-supplies' }, { itemId: 'book', label: 'Livro (orações)' }, { itemId: 'holy-symbol-amulet' }, { itemId: 'parchment', quantity: 10 }, { itemId: 'robe' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'artisan',
    name: 'Artesão',
    nameEn: 'Artisan',
    summary: 'Você aprendeu um ofício como aprendiz em uma oficina.',
    abilities: ['str', 'dex', 'int'],
    feat: 'crafter',
    skills: ['investigation', 'persuasion'],
    tool: 'Ferramentas de Artesão (à escolha)',
    toolChoice: 'artisan',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 32, items: [{ itemId: 'artisans-tools', label: 'Ferramentas de Artesão (as mesmas da proficiência)' }, { itemId: 'pouch', quantity: 2 }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'charlatan',
    name: 'Charlatão',
    nameEn: 'Charlatan',
    summary: 'Você vivia de golpes, falsificações e identidades inventadas.',
    abilities: ['dex', 'con', 'cha'],
    feat: 'skilled',
    skills: ['deception', 'sleight-of-hand'],
    tool: 'Kit de Falsificação',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 15, items: [{ itemId: 'forgery-kit' }, { itemId: 'costume' }, { itemId: 'fine-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'criminal',
    name: 'Criminoso',
    nameEn: 'Criminal',
    summary: 'Você ganhava a vida nos becos, com furtos e pequenos crimes.',
    abilities: ['dex', 'con', 'int'],
    feat: 'alert',
    skills: ['sleight-of-hand', 'stealth'],
    tool: 'Ferramentas de Ladrão',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 16, items: [{ itemId: 'dagger', quantity: 2 }, { itemId: 'thieves-tools' }, { itemId: 'crowbar' }, { itemId: 'pouch', quantity: 2 }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'entertainer',
    name: 'Artista',
    nameEn: 'Entertainer',
    summary: 'Você se apresentava em feiras, tavernas e cortes.',
    abilities: ['str', 'dex', 'cha'],
    feat: 'musician',
    skills: ['acrobatics', 'performance'],
    tool: 'Instrumento Musical (à escolha)',
    toolChoice: 'instrument',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 11, items: [{ itemId: 'musical-instrument', label: 'Instrumento Musical (o mesmo da proficiência)' }, { itemId: 'costume', quantity: 2 }, { itemId: 'mirror' }, { itemId: 'perfume' }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'farmer',
    name: 'Fazendeiro',
    nameEn: 'Farmer',
    summary: 'Você cresceu cuidando da terra e dos animais.',
    abilities: ['str', 'con', 'wis'],
    feat: 'tough',
    skills: ['animal-handling', 'nature'],
    tool: 'Ferramentas de Carpinteiro',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 30, items: [{ itemId: 'sickle' }, { itemId: 'carpenters-tools' }, { itemId: 'healers-kit' }, { itemId: 'iron-pot' }, { itemId: 'shovel' }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'guard',
    name: 'Guarda',
    nameEn: 'Guard',
    summary: 'Você vigiou muralhas e portões, sempre atento a ameaças.',
    abilities: ['str', 'int', 'wis'],
    feat: 'alert',
    skills: ['athletics', 'perception'],
    tool: 'Jogo (à escolha)',
    toolChoice: 'gaming',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 12, items: [{ itemId: 'spear' }, { itemId: 'light-crossbow' }, { itemId: 'bolts' }, { itemId: 'gaming-set', label: 'Jogo (o mesmo da proficiência)' }, { itemId: 'hooded-lantern' }, { itemId: 'manacles' }, { itemId: 'quiver' }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'guide',
    name: 'Guia',
    nameEn: 'Guide',
    summary: 'Você conduzia viajantes por terras selvagens.',
    abilities: ['dex', 'con', 'wis'],
    feat: 'magic-initiate',
    magicInitiateList: 'druid',
    skills: ['stealth', 'survival'],
    tool: 'Ferramentas de Cartógrafo',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 3, items: [{ itemId: 'shortbow' }, { itemId: 'arrows' }, { itemId: 'cartographers-tools' }, { itemId: 'bedroll' }, { itemId: 'quiver' }, { itemId: 'tent' }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'hermit',
    name: 'Eremita',
    nameEn: 'Hermit',
    summary: 'Você viveu recluso, em contemplação e estudo.',
    abilities: ['con', 'wis', 'cha'],
    feat: 'healer',
    skills: ['medicine', 'religion'],
    tool: 'Kit de Herbalismo',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 16, items: [{ itemId: 'quarterstaff' }, { itemId: 'herbalism-kit' }, { itemId: 'bedroll' }, { itemId: 'book', label: 'Livro (filosofia)' }, { itemId: 'lamp' }, { itemId: 'oil', quantity: 3 }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'merchant',
    name: 'Mercador',
    nameEn: 'Merchant',
    summary: 'Você comprava e vendia mercadorias entre cidades.',
    abilities: ['con', 'int', 'cha'],
    feat: 'lucky',
    skills: ['animal-handling', 'persuasion'],
    tool: 'Ferramentas de Navegador',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 22, items: [{ itemId: 'navigators-tools' }, { itemId: 'pouch', quantity: 2 }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'noble',
    name: 'Nobre',
    nameEn: 'Noble',
    summary: 'Você cresceu entre privilégios e etiqueta de corte.',
    abilities: ['str', 'int', 'cha'],
    feat: 'skilled',
    skills: ['history', 'persuasion'],
    tool: 'Jogo (à escolha)',
    toolChoice: 'gaming',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 29, items: [{ itemId: 'gaming-set', label: 'Jogo (o mesmo da proficiência)' }, { itemId: 'fine-clothes' }, { itemId: 'perfume' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'sage',
    name: 'Sábio',
    nameEn: 'Sage',
    summary: 'Você passou anos estudando em bibliotecas e academias.',
    abilities: ['con', 'int', 'wis'],
    feat: 'magic-initiate',
    magicInitiateList: 'wizard',
    skills: ['arcana', 'history'],
    tool: 'Suprimentos de Calígrafo',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 8, items: [{ itemId: 'quarterstaff' }, { itemId: 'calligraphers-supplies' }, { itemId: 'book', label: 'Livro (história)' }, { itemId: 'parchment', quantity: 8 }, { itemId: 'robe' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'sailor',
    name: 'Marinheiro',
    nameEn: 'Sailor',
    summary: 'Você viveu no mar, enfrentando tempestades e brigas de porto.',
    abilities: ['str', 'dex', 'wis'],
    feat: 'tavern-brawler',
    skills: ['acrobatics', 'perception'],
    tool: 'Ferramentas de Navegador',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 20, items: [{ itemId: 'dagger' }, { itemId: 'navigators-tools' }, { itemId: 'rope' }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'scribe',
    name: 'Escriba',
    nameEn: 'Scribe',
    summary: 'Você copiava documentos e registrava acontecimentos com precisão.',
    abilities: ['dex', 'int', 'wis'],
    feat: 'skilled',
    skills: ['investigation', 'perception'],
    tool: 'Suprimentos de Calígrafo',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 23, items: [{ itemId: 'calligraphers-supplies' }, { itemId: 'fine-clothes' }, { itemId: 'lamp' }, { itemId: 'oil', quantity: 3 }, { itemId: 'parchment', quantity: 12 }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'soldier',
    name: 'Soldado',
    nameEn: 'Soldier',
    summary: 'Você treinou e lutou em um exército.',
    abilities: ['str', 'dex', 'con'],
    feat: 'savage-attacker',
    skills: ['athletics', 'intimidation'],
    tool: 'Jogo (à escolha)',
    toolChoice: 'gaming',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 14, items: [{ itemId: 'spear' }, { itemId: 'shortbow' }, { itemId: 'arrows' }, { itemId: 'gaming-set', label: 'Jogo (o mesmo da proficiência)' }, { itemId: 'healers-kit' }, { itemId: 'quiver' }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
  {
    id: 'wayfarer',
    name: 'Andarilho',
    nameEn: 'Wayfarer',
    summary: 'Você cresceu nas ruas, sobrevivendo com esperteza.',
    abilities: ['dex', 'wis', 'cha'],
    feat: 'lucky',
    skills: ['insight', 'stealth'],
    tool: 'Ferramentas de Ladrão',
    equipment: [
      { id: 'A', label: 'Opção A', gold: 16, items: [{ itemId: 'dagger', quantity: 2 }, { itemId: 'thieves-tools' }, { itemId: 'gaming-set', label: 'Jogo (à escolha)' }, { itemId: 'bedroll' }, { itemId: 'pouch', quantity: 2 }, { itemId: 'travelers-clothes' }] },
      GOLD_ONLY(),
    ],
  },
];

export const BACKGROUNDS_BY_ID: Record<string, BackgroundData> = Object.fromEntries(
  BACKGROUNDS.map((b) => [b.id, b])
);
