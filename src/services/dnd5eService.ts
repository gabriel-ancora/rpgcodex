import {
  CharacterSpell,
  CharacterEquipmentItem,
  CharacterFeature,
  CharacterClassResource,
  CharacterSpellSlots,
} from '../types/campaign';

const DND_2024_API_BASE = 'https://www.dnd5eapi.co/api/2024';

// Cache em memória para respostas instantâneas da API 2024 durante a edição da ficha
const apiCache = new Map<string, unknown>();

async function fetch2024Json<T>(path: string): Promise<T | null> {
  const url = path.startsWith('http')
    ? path
    : path.startsWith('/api/2024')
    ? `https://www.dnd5eapi.co${path}`
    : `${DND_2024_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  if (apiCache.has(url)) {
    return apiCache.get(url) as T;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    apiCache.set(url, data);
    return data;
  } catch {
    return null;
  }
}

export type StatKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface DndSpeciesOption {
  index: string;
  apiIndex: string;
  name: string;
  size: string;
  speed: string;
  hpBonusPerLevel?: number;
  traits: string[];
  levelTraits?: { level: number; name: string; description: string }[];
}

export interface DndOriginOption {
  index: string;
  apiIndex?: string;
  name: string;
  primaryBoost: StatKey;
  secondaryBoost: StatKey;
  originFeat: string;
  originFeatDesc: string;
  hpBonusPerLevel?: number;
  skills: string[];
  tool: string;
  equipmentSummary: string;
}

export interface DndSubclassOption {
  index: string;
  apiIndex?: string;
  name: string;
  spellcasterThird?: boolean;
  draconicResilience?: boolean;
  features: { level: number; name: string; description: string }[];
}

export interface DndClassOption {
  index: string;
  name: string;
  hitDie: number;
  statPriority: [StatKey, StatKey, StatKey, StatKey, StatKey, StatKey];
  savingThrows: string[];
  proficiencies: string[];
  casterType: 'full' | 'half' | 'pact' | 'none';
  weaponMasteryCountAt1: number;
  subclasses: DndSubclassOption[];
  startingEquipment: Omit<CharacterEquipmentItem, 'id'>[];
  baseArmorFormula: (stats: Record<StatKey, number>) => number;
}

// ============================================================================
// 1. ESPÉCIES D&D 5.5E (2024) — SRD 5.2 + PHB 2024
// ============================================================================
export const DND_RACES_CATALOG: DndSpeciesOption[] = [
  {
    index: 'human',
    apiIndex: 'human',
    name: 'Humano (5.5e)',
    size: 'Médio ou Pequeno',
    speed: '9m (30 ft)',
    traits: [
      'Engenhoso (Recebe Inspiração Heroica após Descanso Longo)',
      'Habilidoso (Proficiência em 1 perícia extra à escolha)',
      'Versátil (1 Talento de Origem adicional no Nv. 1)',
    ],
  },
  {
    index: 'elf',
    apiIndex: 'elf',
    name: 'Elfo (5.5e)',
    size: 'Médio',
    speed: '9m (30 ft)',
    traits: [
      'Visão no Escuro (18m)',
      'Ancestral Feérico (Vantagem contra Enfeitiçado)',
      'Sentidos Aguçados (Percepção, Intuição ou Sobrevivência)',
      'Transe (Descanso Longo em 4h)',
      'Linhagem Élfica (Truque no Nv. 1)',
    ],
    levelTraits: [
      {
        level: 3,
        name: 'Linhagem Élfica (Nv. 3)',
        description: 'Desbloqueia magia de 1º círculo da linhagem (Detectar Magia, Passos Longos ou Fogo das Fadas) 1x/descanso longo.',
      },
      {
        level: 5,
        name: 'Linhagem Élfica (Nv. 5)',
        description: 'Desbloqueia magia de 2º círculo da linhagem (Passo Nebuloso, Passos sem Pegadas ou Escuridão) 1x/descanso longo.',
      },
    ],
  },
  {
    index: 'dwarf',
    apiIndex: 'dwarf',
    name: 'Anão (5.5e)',
    size: 'Médio',
    speed: '9m (30 ft)',
    hpBonusPerLevel: 1,
    traits: [
      'Visão no Escuro Superior (36m / 120 ft)',
      'Resiliência Anã (Resistência e Vantagem contra Veneno)',
      'Tenacidade Anã (+1 PV máximo por nível)',
      'Sentido Sísmico (Ação Bônus: Sentido Sísmico 18m em pedra por 10 min)',
    ],
  },
  {
    index: 'halfling',
    apiIndex: 'halfling',
    name: 'Halfling / Pequenino (5.5e)',
    size: 'Pequeno',
    speed: '9m (30 ft)',
    traits: [
      'Sorte (Rerola resultado 1 em qualquer Teste de d20)',
      'Bravura (Vantagem contra condição Amedrontado)',
      'Agilidade Halfling (Move-se pelo espaço de criaturas maiores)',
      'Furtividade Natural (Esconder-se atrás de aliado maior)',
    ],
  },
  {
    index: 'dragonborn',
    apiIndex: 'dragonborn',
    name: 'Draconato (5.5e)',
    size: 'Médio',
    speed: '9m (30 ft)',
    traits: [
      'Ancestral Dracônico (Tipo elemental escolhido)',
      'Arma de Sopro (Substitui 1 ataque: cone 4,5m ou linha 9m)',
      'Resistência Elemental',
      'Visão no Escuro (18m)',
    ],
    levelTraits: [
      {
        level: 5,
        name: 'Voo Dracônico & Sopro Aprimorado (2d10)',
        description: 'Ação Bônus: cria asas espectrais dracônicas com Deslocamento de Voo igual ao terrestre por 10 min (1x/descanso longo). Arma de Sopro sobe para 2d10.',
      },
      {
        level: 11,
        name: 'Arma de Sopro Aprimorada (3d10)',
        description: 'O dano da Arma de Sopro aumenta para 3d10.',
      },
      {
        level: 17,
        name: 'Arma de Sopro Suprema (4d10)',
        description: 'O dano da Arma de Sopro aumenta para 4d10.',
      },
    ],
  },
  {
    index: 'tiefling',
    apiIndex: 'tiefling',
    name: 'Tiefling (5.5e)',
    size: 'Médio ou Pequeno',
    speed: '9m (30 ft)',
    traits: [
      'Visão no Escuro (18m)',
      'Presença Sobrenatural (Truque Taumaturgia)',
      'Legado Ínfero (Abissal, Ctônico ou Infernal — Resistência + Truque)',
    ],
    levelTraits: [
      {
        level: 3,
        name: 'Legado Ínfero (Nv. 3)',
        description: 'Conjura Repreensão Infernal, Raio Adoecente ou Falsa Vida 1x/descanso longo sem gastar espaço.',
      },
      {
        level: 5,
        name: 'Legado Ínfero (Nv. 5)',
        description: 'Conjura Escuridão, Coroa da Loucura ou Raio do Enfraquecimento 1x/descanso longo sem gastar espaço.',
      },
    ],
  },
  {
    index: 'goliath',
    apiIndex: 'goliath',
    name: 'Golias (5.5e)',
    size: 'Médio',
    speed: '10,5m (35 ft)',
    traits: [
      'Ancestral Gigante (Dádiva sobrenatural de Gigante: Bônus de Proficiência usos/descanso)',
      'Porte Poderoso (Vantagem para encerrar Agarrado e carga dobrada)',
    ],
    levelTraits: [
      {
        level: 5,
        name: 'Forma Grande',
        description: 'Ação Bônus: cresce para tamanho Grande por 10 min (Vantagem em testes de Força e +3m de deslocamento, 1x/descanso longo).',
      },
    ],
  },
  {
    index: 'orc',
    apiIndex: 'orc',
    name: 'Orc (5.5e)',
    size: 'Médio',
    speed: '9m (30 ft)',
    traits: [
      'Visão no Escuro Superior (36m / 120 ft)',
      'Impulso de Adrenalina (Disparada como Ação Bônus + PV Temporários iguais ao Bônus de Proficiência)',
      'Resistência Implacável (Ao cair a 0 PV, volta a 1 PV 1x/descanso longo)',
    ],
  },
  {
    index: 'gnome',
    apiIndex: 'gnome',
    name: 'Gnomo (5.5e)',
    size: 'Pequeno',
    speed: '9m (30 ft)',
    traits: [
      'Visão no Escuro (18m)',
      'Astúcia Gnômica (Vantagem em Salvaguardas de Inteligência, Sabedoria e Carisma)',
      'Linhagem Gnômica (Gnomo da Floresta ou Gnomo das Rochas)',
    ],
  },
  {
    index: 'aasimar',
    apiIndex: 'human',
    name: 'Aasimar (5.5e)',
    size: 'Médio ou Pequeno',
    speed: '9m (30 ft)',
    traits: [
      'Visão no Escuro (18m)',
      'Resistência Celestial (Resistência a dano Necrótico e Radiante)',
      'Mãos Curativas (Cura número de d4s igual ao Bônus de Proficiência)',
      'Portador da Luz (Truque Luz)',
    ],
    levelTraits: [
      {
        level: 3,
        name: 'Revelação Celestial',
        description: 'Ação Bônus (1 min, 1x/descanso longo): Asas Celestiais (voo), Mortalha Necrótica ou Irradiação Interior (+Bônus de Proficiência em dano).',
      },
    ],
  },
];

// ============================================================================
// 2. ORIGENS / ANTECEDENTES D&D 5.5E (2024) — +2/+1 Atributos + Talento de Origem
// ============================================================================
export const DND_ORIGINS_CATALOG: DndOriginOption[] = [
  {
    index: 'soldier',
    apiIndex: 'soldier',
    name: 'Soldado',
    primaryBoost: 'str',
    secondaryBoost: 'con',
    originFeat: 'Atacante Selvagem (Savage Attacker)',
    originFeatDesc: '1x por turno ao acertar um ataque com arma, role os dados de dano da arma duas vezes e escolha o melhor.',
    skills: ['Atletismo', 'Intimidação'],
    tool: 'Conjunto de Jogo',
    equipmentSummary: 'Insígnia militar, Kit de Curandeiro, Aljava, 14 PO',
  },
  {
    index: 'acolyte',
    apiIndex: 'acolyte',
    name: 'Acólito',
    primaryBoost: 'wis',
    secondaryBoost: 'int',
    originFeat: 'Iniciado em Magia — Clérigo (Magic Initiate)',
    originFeatDesc: 'Aprende 2 truques de Clérigo e 1 magia de 1º círculo conjurável 1x/descanso longo sem gastar espaço.',
    skills: ['Intuição', 'Religião'],
    tool: 'Suprimentos de Calígrafo',
    equipmentSummary: 'Símbolo Sagrado, Livro de Orações, Túnica, 8 PO',
  },
  {
    index: 'criminal',
    apiIndex: 'criminal',
    name: 'Criminoso',
    primaryBoost: 'dex',
    secondaryBoost: 'con',
    originFeat: 'Alerta (Alert)',
    originFeatDesc: 'Soma o Bônus de Proficiência na Iniciativa e pode trocar de posição na Iniciativa com um aliado voluntário.',
    skills: ['Prestidigitação', 'Furtividade'],
    tool: 'Ferramentas de Ladrão',
    equipmentSummary: 'Ferramentas de Ladrão, Pé de Cabra, 2 Adagas, 16 PO',
  },
  {
    index: 'sage',
    apiIndex: 'sage',
    name: 'Sábio',
    primaryBoost: 'int',
    secondaryBoost: 'con',
    originFeat: 'Iniciado em Magia — Mago (Magic Initiate)',
    originFeatDesc: 'Aprende 2 truques de Mago e 1 magia de 1º círculo conjurável 1x/descanso longo sem gastar espaço.',
    skills: ['Arcanismo', 'História'],
    tool: 'Suprimentos de Calígrafo',
    equipmentSummary: 'Bordão, Livro de História, Pergaminhos, 8 PO',
  },
  {
    index: 'farmer',
    name: 'Fazendeiro',
    primaryBoost: 'con',
    secondaryBoost: 'str',
    originFeat: 'Vigoroso (Tough)',
    originFeatDesc: 'Seus Pontos de Vida máximos aumentam em +2 para cada nível de personagem.',
    hpBonusPerLevel: 2,
    skills: ['Adestrar Animais', 'Natureza'],
    tool: 'Ferramentas de Carpinteiro',
    equipmentSummary: 'Foice, Kit de Curandeiro, Pá de Ferro, 30 PO',
  },
  {
    index: 'charlatan',
    name: 'Charlatão',
    primaryBoost: 'cha',
    secondaryBoost: 'dex',
    originFeat: 'Habilidoso (Skilled)',
    originFeatDesc: 'Recebe proficiência em qualquer combinação de 3 perícias ou ferramentas extras.',
    skills: ['Enganação', 'Prestidigitação'],
    tool: 'Kit de Falsificação',
    equipmentSummary: 'Kit de Falsificação, Traje Fino, 15 PO',
  },
  {
    index: 'entertainer',
    name: 'Artista',
    primaryBoost: 'cha',
    secondaryBoost: 'dex',
    originFeat: 'Músico (Musician)',
    originFeatDesc: 'Após um Descanso Curto ou Longo, concede Inspiração Heroica a aliados igual ao seu Bônus de Proficiência.',
    skills: ['Acrobacia', 'Atuação'],
    tool: 'Instrumento Musical',
    equipmentSummary: 'Instrumento Musical, Fantasia, Espelho, 11 PO',
  },
  {
    index: 'guard',
    name: 'Guarda',
    primaryBoost: 'str',
    secondaryBoost: 'wis',
    originFeat: 'Alerta (Alert)',
    originFeatDesc: 'Soma o Bônus de Proficiência na Iniciativa e pode trocar de posição na Iniciativa com um aliado.',
    skills: ['Atletismo', 'Percepção'],
    tool: 'Conjunto de Jogo',
    equipmentSummary: 'Lança, Besta Leve, Algemas, Lanterna Coberta, 12 PO',
  },
  {
    index: 'guide',
    name: 'Guia',
    primaryBoost: 'wis',
    secondaryBoost: 'dex',
    originFeat: 'Iniciado em Magia — Druida (Magic Initiate)',
    originFeatDesc: 'Aprende 2 truques de Druida e 1 magia de 1º círculo conjurável 1x/descanso longo sem gastar espaço.',
    skills: ['Furtividade', 'Sobrevivência'],
    tool: 'Ferramentas de Cartógrafo',
    equipmentSummary: 'Arco Curto, Ferramentas de Cartógrafo, Tenda, 3 PO',
  },
  {
    index: 'hermit',
    name: 'Eremita',
    primaryBoost: 'wis',
    secondaryBoost: 'con',
    originFeat: 'Curandeiro (Healer)',
    originFeatDesc: 'Usa Kit de Curandeiro para permitir gasto de Dado de Vida + Bônus de Proficiência e rerola 1s em curas.',
    skills: ['Medicina', 'Religião'],
    tool: 'Kit de Herbalismo',
    equipmentSummary: 'Kit de Herbalismo, Bordão, Lâmpada, Óleo, 16 PO',
  },
  {
    index: 'noble',
    name: 'Nobre',
    primaryBoost: 'cha',
    secondaryBoost: 'str',
    originFeat: 'Habilidoso (Skilled)',
    originFeatDesc: 'Recebe proficiência em 3 perícias ou ferramentas adicionais.',
    skills: ['História', 'Persuasão'],
    tool: 'Conjunto de Jogo',
    equipmentSummary: 'Anel de Sinete, Trajes Finos, Perfume, 29 PO',
  },
  {
    index: 'wayfarer',
    name: 'Andarilho',
    primaryBoost: 'dex',
    secondaryBoost: 'cha',
    originFeat: 'Sortudo (Lucky)',
    originFeatDesc: 'Possui Pontos de Sorte iguais ao Bônus de Proficiência para conceder Vantagem em Testes de d20 ou impor Desvantagem contra ataques.',
    skills: ['Intuição', 'Furtividade'],
    tool: 'Ferramentas de Ladrão',
    equipmentSummary: '2 Adagas, Ferramentas de Ladrão, Saco de Dormir, 16 PO',
  },
];

// ============================================================================
// 3. TODAS AS 12 CLASSES & SUBCLASSES D&D 5.5E (2024)
// ============================================================================
export const DND_CLASSES_CATALOG: DndClassOption[] = [
  {
    index: 'fighter',
    name: 'Guerreiro (5.5e)',
    hitDie: 10,
    statPriority: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
    savingThrows: ['Força', 'Constituição'],
    proficiencies: ['Todas as Armaduras', 'Escudos', 'Armas Simples e Marciais', 'Atletismo', 'Percepção'],
    casterType: 'none',
    weaponMasteryCountAt1: 3,
    baseArmorFormula: () => 18, // Cota de Malha (16) + Escudo (+2)
    startingEquipment: [
      {
        name: 'Espada Longa (Longsword)',
        category: 'Arma Marcial Corpo a Corpo',
        damage: '1d8 Cortante (Versátil 1d10)',
        mastery: ' Afligir / Sap (Desvantagem no próximo ataque do alvo)',
        weight: '1,5 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Escudo Pesado (Shield)',
        category: 'Escudo',
        armorClass: '+2 CA',
        weight: '3,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Cota de Malha (Chain Mail)',
        category: 'Armadura Pesada',
        armorClass: 'CA 16',
        weight: '27,5 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Azagaia (Javelin)',
        category: 'Arma Simples de Arremesso',
        damage: '1d6 Perfurante (Alcance 9/36m)',
        mastery: 'Lentidão / Slow (-3m de deslocamento)',
        weight: '1,0 kg',
        quantity: 4,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'champion',
        apiIndex: 'champion',
        name: 'Campeão (Champion)',
        features: [
          { level: 3, name: 'Crítico Aprimorado (19–20)', description: 'Seus ataques com armas causam Acerto Crítico em 19 ou 20.' },
          { level: 3, name: 'Atleta Notável', description: 'Vantagem em Iniciativa e testes de Atletismo; move metade do deslocamento sem provocar ataques de oportunidade após um crítico.' },
          { level: 7, name: 'Estilo de Luta Adicional', description: 'Aprende mais um talento de Estilo de Luta.' },
          { level: 10, name: 'Guerreiro Heroico', description: 'No início do seu turno em combate, ganha Inspiração Heroica caso não tenha.' },
          { level: 15, name: 'Crítico Superior (18–20)', description: 'Seus ataques com armas causam Acerto Crítico em 18, 19 ou 20.' },
          { level: 18, name: 'Sobrevivente', description: 'Vantagem em Salvaguardas contra Morte (18–20 conta como 20) e regenera 5 + mod. CON no início do turno se estiver com metade ou menos dos PV.' },
        ],
      },
      {
        index: 'battle-master',
        name: 'Mestre de Batalha (Battle Master)',
        features: [
          { level: 3, name: 'Superioridade em Combate (4d8)', description: 'Aprende 3 Manobras e ganha 4 Dados de Superioridade (d8) recuperados em Descanso Curto/Longo.' },
          { level: 7, name: 'Conheça Seu Inimigo', description: 'Ação Bônus: descobre resistências, imunidades ou vulnerabilidades de uma criatura visível.' },
          { level: 10, name: 'Superioridade Aprimorada (d10)', description: 'Seus Dados de Superioridade tornam-se d10.' },
          { level: 15, name: 'Implacável', description: '1x por turno pode usar uma Manobra rolando 1d8 sem gastar Dado de Superioridade.' },
          { level: 18, name: 'Superioridade Suprema (d12)', description: 'Seus Dados de Superioridade tornam-se d12.' },
        ],
      },
      {
        index: 'eldritch-knight',
        name: 'Cavaleiro Místico (Eldritch Knight)',
        spellcasterThird: true,
        features: [
          { level: 3, name: 'Conjuração Arcana & Vínculo com Arma', description: 'Conjura magias de Mago (INT) e vincula até 2 armas invocáveis como Ação Bônus.' },
          { level: 7, name: 'Magia de Guerra', description: 'Ao usar a ação Atacar, pode substituir um dos ataques pela conjuração de um Truque de Mago.' },
          { level: 10, name: 'Golpe Místico', description: 'Criatura atingida por sua arma sofre Desvantagem na próxima Salvaguarda contra magia sua.' },
          { level: 15, name: 'Investida Arcana', description: 'Teleporta até 9m ao usar Surto de Ação.' },
          { level: 18, name: 'Magia de Guerra Aprimorada', description: 'Pode substituir dois ataques da ação Atacar por uma magia de Mago de 1º ou 2º círculo.' },
        ],
      },
    ],
  },
  {
    index: 'paladin',
    name: 'Paladino (5.5e)',
    hitDie: 10,
    statPriority: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
    savingThrows: ['Sabedoria', 'Carisma'],
    proficiencies: ['Todas as Armaduras', 'Escudos', 'Armas Simples e Marciais', 'Religião', 'Persuasão'],
    casterType: 'half',
    weaponMasteryCountAt1: 2,
    baseArmorFormula: () => 18,
    startingEquipment: [
      {
        name: 'Espada Longa (Longsword)',
        category: 'Arma Marcial Corpo a Corpo',
        damage: '1d8 Cortante (Versátil 1d10)',
        mastery: 'Afligir / Sap',
        weight: '1,5 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Escudo com Emblema Sagrado',
        category: 'Escudo & Foco Divino',
        armorClass: '+2 CA',
        weight: '3,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Cota de Malha (Chain Mail)',
        category: 'Armadura Pesada',
        armorClass: 'CA 16',
        weight: '27,5 kg',
        quantity: 1,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'oath-of-devotion',
        apiIndex: 'oath-of-devotion',
        name: 'Juramento da Devoção',
        features: [
          { level: 3, name: 'Arma Sagrada & Magias do Juramento', description: 'Ao fazer a ação Atacar, pode gastar Canalizar Divindade para somar mod. CAR nas jogadas de ataque por 10 min e emitir luz.' },
          { level: 7, name: 'Aura de Devoção', description: 'Você e aliados na sua Aura de Proteção ficam imunes à condição Enfeitiçado.' },
          { level: 15, name: 'Destruição Protetora', description: 'Quando conjura Destruição Divina, você e aliados na Aura ganham Meia Cobertura até seu próximo turno.' },
          { level: 20, name: 'Nimbo Sagrado', description: 'Ação Bônus: emana luz solar verdadeira (3d10 Radiante por turno aos inimigos na aura) e Vantagem contra magias de corruptores/mortos-vivos.' },
        ],
      },
      {
        index: 'oath-of-vengeance',
        name: 'Juramento da Vingança',
        features: [
          { level: 3, name: 'Voto de Inimizade', description: 'Ao atingir uma criatura (ou como ação de ataque), usa Canalizar Divindade para ganhar Vantagem em todos os ataques contra ela por 1 min.' },
          { level: 7, name: 'Vingador Implacável', description: 'Ao acertar um Ataque de Oportunidade, reduz o deslocamento do alvo a 0 e move-se metade do deslocamento.' },
          { level: 15, name: 'Alma da Vingança', description: 'Reação: realiza ataque corpo a corpo imediato quando o alvo do Voto de Inimizade faz um ataque.' },
          { level: 20, name: 'Anjo Vingador', description: 'Ação Bônus: ganha Deslocamento de Voo 18m e aura de terror por 10 minutos.' },
        ],
      },
    ],
  },
  {
    index: 'wizard',
    name: 'Mago (5.5e)',
    hitDie: 6,
    statPriority: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
    savingThrows: ['Inteligência', 'Sabedoria'],
    proficiencies: ['Armas Simples', 'Arcanismo', 'Investigação', 'História'],
    casterType: 'full',
    weaponMasteryCountAt1: 0,
    baseArmorFormula: (st) => 10 + Math.floor((st.dex - 10) / 2),
    startingEquipment: [
      {
        name: 'Bordão Arcano (Quarterstaff)',
        category: 'Foco Arcano & Arma Simples',
        damage: '1d6 Contundente (Versátil 1d8)',
        mastery: 'Derrubar / Topple',
        weight: '2,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Grimório Encadernado',
        category: 'Equipamento de Conjuração',
        weight: '1,5 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Adaga (Dagger)',
        category: 'Arma Simples Leve',
        damage: '1d4 Perfurante',
        mastery: 'Ágil / Nick',
        weight: '0,5 kg',
        quantity: 2,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'evoker',
        apiIndex: 'evoker',
        name: 'Evocador (Evoker)',
        features: [
          { level: 3, name: 'Erudito da Evocação & Truque Potente', description: 'Adiciona 2 magias de Evocação grátis ao grimório; seus truques causam metade do dano mesmo se o alvo passar na salvaguarda.' },
          { level: 6, name: 'Esculpir Magias', description: 'Cria bolsões seguros em magias de Evocação para até 1 + círculo da magia aliados (sucesso automático e zero dano).' },
          { level: 10, name: 'Evocação Potencializada', description: 'Soma seu modificador de Inteligência em uma rolagem de dano de qualquer magia de Evocação.' },
          { level: 14, name: 'Sobrecarga Arcana (Overchannel)', description: 'Maximiza o dano de uma magia de Mago de 1º a 5º círculo.' },
        ],
      },
      {
        index: 'abjurer',
        name: 'Abjurador (Abjurer)',
        features: [
          { level: 3, name: 'Proteção Arcana (Arcane Ward)', description: 'Cria barreira mágica com PV iguais a 2x nível de Mago + mod. INT que absorve dano e recarrega ao conjurar Abjuração.' },
          { level: 6, name: 'Proteção Projetada', description: 'Reação: usa sua Proteção Arcana para absorver dano sofrido por um aliado a até 9m.' },
          { level: 10, name: 'Quebrador de Magias', description: 'Sempre tem Contramágica e Dissipar Magia preparadas; não gasta espaço de magia se Contramágica falhar.' },
          { level: 14, name: 'Resistência a Magias', description: 'Vantagem em Salvaguardas contra magias e Resistência ao dano de magias.' },
        ],
      },
    ],
  },
  {
    index: 'rogue',
    name: 'Ladino (5.5e)',
    hitDie: 8,
    statPriority: ['dex', 'con', 'int', 'wis', 'cha', 'str'],
    savingThrows: ['Destreza', 'Inteligência'],
    proficiencies: ['Armaduras Leves', 'Armas Simples e Marciais com Acuidade/Leve', 'Ferramentas de Ladrão', 'Furtividade', 'Acrobacia', 'Percepção', 'Prestidigitação'],
    casterType: 'none',
    weaponMasteryCountAt1: 2,
    baseArmorFormula: (st) => 11 + Math.floor((st.dex - 10) / 2),
    startingEquipment: [
      {
        name: 'Espada Curta (Shortsword)',
        category: 'Arma Marcial Leve (Acuidade)',
        damage: '1d6 Perfurante',
        mastery: 'Afligir / Vex (Vantagem no próximo ataque contra o alvo)',
        weight: '1,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Adaga (Dagger)',
        category: 'Arma Simples Leve',
        damage: '1d4 Perfurante (Arremesso 6/18m)',
        mastery: 'Ágil / Nick (Ataque extra da arma leve na mesma ação)',
        weight: '0,5 kg',
        quantity: 2,
        equipped: true,
      },
      {
        name: 'Arco Curto (Shortbow)',
        category: 'Arma Simples à Distância',
        damage: '1d6 Perfurante (24/96m)',
        mastery: 'Afligir / Vex',
        weight: '1,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Armadura de Couro & Ferramentas de Ladrão',
        category: 'Armadura Leve',
        armorClass: 'CA 11 + Mod. DES',
        weight: '5,5 kg',
        quantity: 1,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'thief',
        apiIndex: 'thief',
        name: 'Ladrão (Thief)',
        features: [
          { level: 3, name: 'Mãos Rápidas & Andarilho de Telhados', description: 'Ação Astuta permite Prestidigitação ou ativar Item Mágico como Ação Bônus! Ganha deslocamento de Escalada.' },
          { level: 9, name: 'Furtividade Suprema', description: 'Opção de Golpe Astuto (1d6): Ataque Furtivo não revela sua posição se terminar atrás de cobertura.' },
          { level: 13, name: 'Usar Dispositivo Mágico', description: '4 sintonizações de itens mágicos e chance de não consumir cargas de pergaminhos/varinhas.' },
          { level: 17, name: 'Reflexos de Ladrão', description: 'Realiza dois turnos completos na primeira rodada de qualquer combate!' },
        ],
      },
      {
        index: 'arcane-trickster',
        name: 'Trapaceiro Arcano (Arcane Trickster)',
        spellcasterThird: true,
        features: [
          { level: 3, name: 'Conjuração & Mão Mágica Legerdemain', description: 'Conjura magias de Mago (INT) e controla Mão Mágica invisível como Ação Bônus.' },
          { level: 9, name: 'Emboscada Mágica', description: 'Se estiver Invisível/Escondido ao conjurar magia, o alvo tem Desvantagem na salvaguarda.' },
          { level: 13, name: 'Trapaceiro Versátil', description: 'Distrai alvos com Mão Mágica usando Golpe Astuto.' },
          { level: 17, name: 'Ladrão de Magias', description: 'Reação: rouba e anula uma magia conjurada contra você.' },
        ],
      },
    ],
  },
  {
    index: 'cleric',
    name: 'Clérigo (5.5e)',
    hitDie: 8,
    statPriority: ['wis', 'con', 'str', 'dex', 'cha', 'int'],
    savingThrows: ['Sabedoria', 'Carisma'],
    proficiencies: ['Armaduras Leves e Médias', 'Escudos', 'Armas Simples', 'Religião', 'Intuição'],
    casterType: 'full',
    weaponMasteryCountAt1: 0,
    baseArmorFormula: (st) => 14 + Math.min(2, Math.floor((st.dex - 10) / 2)) + 2, // Camisão de Malha + Escudo
    startingEquipment: [
      {
        name: 'Maça (Mace)',
        category: 'Arma Simples Corpo a Corpo',
        damage: '1d6 Contundente',
        mastery: 'Afligir / Sap',
        weight: '2,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Camisão de Malha (Chain Shirt)',
        category: 'Armadura Média',
        armorClass: 'CA 13 + Mod. DES (máx +2)',
        weight: '10,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Escudo & Símbolo Sagrado',
        category: 'Escudo & Foco Divino',
        armorClass: '+2 CA',
        weight: '3,0 kg',
        quantity: 1,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'life-domain',
        apiIndex: 'life-domain',
        name: 'Domínio da Vida',
        features: [
          { level: 3, name: 'Discípulo da Vida & Preservar a Vida', description: 'Magias de cura recuperam +2 + círculo da magia PV adicionais. Canalizar Divindade distribui 5x nível de Clérigo em PV.' },
          { level: 6, name: 'Curandeiro Abençoado', description: 'Ao conjurar magia de cura em outra criatura, você também recupera 2 + círculo da magia PV.' },
          { level: 17, name: 'Cura Suprema', description: 'Usa o valor máximo de todos os dados de cura em vez de rolar.' },
        ],
      },
      {
        index: 'light-domain',
        name: 'Domínio da Luz',
        features: [
          { level: 3, name: 'Labareda Protetora & Resplendor da Alvorada', description: 'Reação: impõe Desvantagem a um atacante. Canalizar Divindade causa 2d10 + nível de dano Radiante em área.' },
          { level: 6, name: 'Labareda Aprimorada', description: 'Labareda Protetora concede 2d6 + mod. SAB PV temporários ao alvo protegido.' },
          { level: 17, name: 'Coroa de Luz', description: 'Ação: emana luz solar que concede Desvantagem aos inimigos contra suas magias de Fogo e Radiantes.' },
        ],
      },
    ],
  },
  {
    index: 'barbarian',
    name: 'Bárbaro (5.5e)',
    hitDie: 12,
    statPriority: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
    savingThrows: ['Força', 'Constituição'],
    proficiencies: ['Armaduras Leves e Médias', 'Escudos', 'Armas Simples e Marciais', 'Atletismo', 'Sobrevivência'],
    casterType: 'none',
    weaponMasteryCountAt1: 2,
    baseArmorFormula: (st) =>
      10 + Math.floor((st.dex - 10) / 2) + Math.floor((st.con - 10) / 2),
    startingEquipment: [
      {
        name: 'Machado Grande (Greataxe)',
        category: 'Arma Marcial Pesada',
        damage: '1d12 Cortante (Pesada, Duas Mãos)',
        mastery: 'Trespassar / Cleave (Ataque extra em 2º inimigo adjacente)',
        weight: '3,5 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Machadinha (Handaxe)',
        category: 'Arma Simples Leve',
        damage: '1d6 Cortante (Arremesso 6/18m)',
        mastery: 'Afligir / Vex',
        weight: '1,0 kg',
        quantity: 4,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'path-of-the-berserker',
        apiIndex: 'path-of-the-berserker',
        name: 'Trilha do Berserker (5.5e)',
        features: [
          { level: 3, name: 'Frenesi (Sem Exaustão no 5.5e!)', description: 'Em Fúria + Ataque Descuidado, o primeiro acerto no turno causa dados extras de d6 iguais ao bônus de dano de Fúria!' },
          { level: 6, name: 'Fúria Inconsciente', description: 'Imune às condições Enfeitiçado e Amedrontado enquanto estiver em Fúria.' },
          { level: 10, name: 'Retaliação', description: 'Reação: realiza um ataque corpo a corpo contra criatura a 1,5m que causar dano a você.' },
          { level: 14, name: 'Presença Intimidadora', description: 'Ação Bônus: amedronta inimigos em esfera de 9m por 1 minuto.' },
        ],
      },
      {
        index: 'wild-heart',
        name: 'Trilha do Coração Selvagem',
        features: [
          { level: 3, name: 'Fúria das Feras (Urso / Águia / Lobo)', description: 'Ao entrar em Fúria, escolhe: Urso (Resistência a todos os danos exceto Força/Necrótico/Psíquico/Radiante), Águia ou Lobo.' },
          { level: 6, name: 'Aspecto das Feras', description: 'Recebe benefício passivo de Coruja, Pantera ou Salmão.' },
          { level: 14, name: 'Poder das Feras', description: 'Recebe poder de Leão, Falcão (Voo em Fúria) ou Carneiro.' },
        ],
      },
    ],
  },
  {
    index: 'bard',
    name: 'Bardo (5.5e)',
    hitDie: 8,
    statPriority: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
    savingThrows: ['Destreza', 'Carisma'],
    proficiencies: ['Armaduras Leves', 'Armas Simples', '3 Instrumentos Musicais', 'Atuação', 'Persuasão', 'Enganação'],
    casterType: 'full',
    weaponMasteryCountAt1: 0,
    baseArmorFormula: (st) => 11 + Math.floor((st.dex - 10) / 2),
    startingEquipment: [
      {
        name: 'Adaga (Dagger)',
        category: 'Arma Simples Leve',
        damage: '1d4 Perfurante',
        mastery: 'Ágil / Nick',
        weight: '0,5 kg',
        quantity: 2,
        equipped: true,
      },
      {
        name: 'Alaúde (Foco Musical)',
        category: 'Instrumento & Foco de Conjuração',
        weight: '1,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Armadura de Couro (Leather Armor)',
        category: 'Armadura Leve',
        armorClass: 'CA 11 + Mod. DES',
        weight: '5,0 kg',
        quantity: 1,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'college-of-lore',
        apiIndex: 'college-of-lore',
        name: 'Colégio do Conhecimento',
        features: [
          { level: 3, name: 'Palavras Cortantes & Perícias Extras', description: 'Proficiência em 3 perícias extras; Reação gasta Inspiração de Bardo para subtrair do ataque, teste ou dano de um inimigo.' },
          { level: 6, name: 'Descobertas Mágicas', description: 'Aprende 2 magias extras de Clérigo, Druida ou Mago sempre preparadas.' },
          { level: 14, name: 'Perícia Incomparável', description: 'Ao falhar num teste de atributo ou ataque, pode somar um dado de Inspiração de Bardo.' },
        ],
      },
      {
        index: 'college-of-valor',
        name: 'Colégio da Bravura',
        features: [
          { level: 3, name: 'Inspiração em Combate & Treinamento Marcial', description: 'Proficiência em Armaduras Médias, Escudos e Armas Marciais; aliados somam Inspiração na CA ou no dano.' },
          { level: 6, name: 'Ataque Extra (com Truque)', description: 'Ataca duas vezes e pode substituir um dos ataques por um Truque de Bardo.' },
          { level: 14, name: 'Magia de Batalha', description: 'Após conjurar uma magia com ação, realiza um ataque com arma como Ação Bônus.' },
        ],
      },
    ],
  },
  {
    index: 'druid',
    name: 'Druida (5.5e)',
    hitDie: 8,
    statPriority: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
    savingThrows: ['Inteligência', 'Sabedoria'],
    proficiencies: ['Armaduras Leves', 'Escudos', 'Armas Simples', 'Kit de Herbalismo', 'Natureza', 'Sobrevivência'],
    casterType: 'full',
    weaponMasteryCountAt1: 0,
    baseArmorFormula: (st) => 11 + Math.floor((st.dex - 10) / 2) + 2,
    startingEquipment: [
      {
        name: 'Bordão Druídico (Quarterstaff)',
        category: 'Foco Druídico & Arma Simples',
        damage: '1d6 Contundente',
        mastery: 'Derrubar / Topple',
        weight: '2,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Escudo de Madeira & Armadura de Couro',
        category: 'Armadura Leve + Escudo',
        armorClass: 'CA 13 + Mod. DES',
        weight: '8,0 kg',
        quantity: 1,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'circle-of-the-land',
        apiIndex: 'circle-of-the-land',
        name: 'Círculo da Terra',
        features: [
          { level: 3, name: 'Auxílio da Terra & Magias do Círculo', description: 'Gasta Forma Selvagem para curar/ferir em área (2d6) e prepara magias de Terreno Árido, Polar, Temperado ou Tropical.' },
          { level: 6, name: 'Recuperação Natural', description: 'Conjura 1 magia do Círculo grátis por dia e recupera espaços de magia em Descanso Curto.' },
          { level: 10, name: 'Proteção da Natureza', description: 'Imune a Veneno e ganha Resistência elemental conforme seu terreno atual.' },
          { level: 14, name: 'Santuário da Natureza', description: 'Cria área de vinhas e árvores espectrais que concedem Meia Cobertura e Resistência aos aliados.' },
        ],
      },
      {
        index: 'circle-of-the-moon',
        name: 'Círculo da Lua',
        features: [
          { level: 3, name: 'Formas de Combate (ND Nível/3)', description: 'Assume Forma Selvagem de ND maior com CA 13 + mod. SAB e 3x nível de Druida em PV Temporários!' },
          { level: 6, name: 'Formas do Círculo Aprimoradas', description: 'Ataques em Forma Selvagem causam dano Radiante e soma mod. SAB nas salvaguardas de Constituição.' },
          { level: 10, name: 'Passo do Luar', description: 'Ação Bônus: teleporta até 9m e ganha Vantagem no próximo ataque.' },
          { level: 14, name: 'Fúria Lunar', description: 'Ataques em Forma Selvagem causam +2d10 Radiante extras.' },
        ],
      },
    ],
  },
  {
    index: 'monk',
    name: 'Monge (5.5e)',
    hitDie: 8,
    statPriority: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
    savingThrows: ['Força', 'Destreza'],
    proficiencies: ['Armas Simples e Armas Marciais Leves', 'Acrobacia', 'Furtividade'],
    casterType: 'none',
    weaponMasteryCountAt1: 0,
    baseArmorFormula: (st) =>
      10 + Math.floor((st.dex - 10) / 2) + Math.floor((st.wis - 10) / 2),
    startingEquipment: [
      {
        name: 'Lança (Spear)',
        category: 'Arma de Monge (Artes Marciais)',
        damage: '1d6 Perfurante (ou Dado de Artes Marciais)',
        mastery: 'Afligir / Sap',
        weight: '1,5 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Adagas de Arremesso',
        category: 'Arma Simples Leve',
        damage: 'Dado de Artes Marciais',
        mastery: 'Ágil / Nick',
        weight: '0,5 kg',
        quantity: 5,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'warrior-of-the-open-hand',
        apiIndex: 'warrior-of-the-open-hand',
        name: 'Guerreiro da Mão Aberta',
        features: [
          { level: 3, name: 'Técnica da Mão Aberta', description: 'Ao acertar com Rajada de Golpes: Derruba (DES), Empurra 4,5m (FOR) ou impede Reações de Oportunidade.' },
          { level: 6, name: 'Integridade Corporal', description: 'Ação Bônus: rola Dado de Artes Marciais + mod. SAB para se curar (mod. SAB vezes/dia).' },
          { level: 11, name: 'Passo da Frota', description: 'Pode usar Passo do Vento gratuitamente logo após qualquer outra Ação Bônus.' },
          { level: 17, name: 'Palma Vibrante', description: 'Gasta 4 Pontos de Foco para causar vibrações letais (10d12 de dano de Energia).' },
        ],
      },
    ],
  },
  {
    index: 'ranger',
    name: 'Guardião / Ranger (5.5e)',
    hitDie: 10,
    statPriority: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
    savingThrows: ['Força', 'Destreza'],
    proficiencies: ['Armaduras Leves e Médias', 'Escudos', 'Armas Simples e Marciais', 'Percepção', 'Sobrevivência', 'Furtividade'],
    casterType: 'half',
    weaponMasteryCountAt1: 2,
    baseArmorFormula: (st) => 12 + Math.floor((st.dex - 10) / 2),
    startingEquipment: [
      {
        name: 'Arco Longo (Longbow)',
        category: 'Arma Marcial à Distância',
        damage: '1d8 Perfurante (45/180m)',
        mastery: 'Lentidão / Slow',
        weight: '1,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Espada Curta (Shortsword)',
        category: 'Arma Marcial Leve',
        damage: '1d6 Perfurante',
        mastery: 'Afligir / Vex',
        weight: '1,0 kg',
        quantity: 2,
        equipped: true,
      },
      {
        name: 'Armadura de Couro Batido',
        category: 'Armadura Leve',
        armorClass: 'CA 12 + Mod. DES',
        weight: '6,5 kg',
        quantity: 1,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'hunter',
        apiIndex: 'hunter',
        name: 'Caçador (Hunter)',
        features: [
          { level: 3, name: 'Presa do Caçador & Conhecimento do Caçador', description: 'Escolhe Assassino de Colossos (+1d8 dano) ou Destruidor de Hordas; conhece vulnerabilidades/imunidades do alvo de Marca do Caçador.' },
          { level: 7, name: 'Táticas Defensivas', description: 'Escolhe Escapar da Horda ou Defesa contra Ataques Múltiplos (trocável em descanso).' },
          { level: 11, name: 'Presa do Caçador Superior', description: 'Salpica o dano extra de Marca do Caçador para outra criatura a até 9m.' },
          { level: 15, name: 'Defesa Superior do Caçador', description: 'Reação ao sofrer dano: reduz aquele dano pela metade e ganha Resistência contra o mesmo tipo até o fim do turno.' },
        ],
      },
    ],
  },
  {
    index: 'sorcerer',
    name: 'Feiticeiro (5.5e)',
    hitDie: 6,
    statPriority: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
    savingThrows: ['Constituição', 'Carisma'],
    proficiencies: ['Armas Simples', 'Arcanismo', 'Persuasão'],
    casterType: 'full',
    weaponMasteryCountAt1: 0,
    baseArmorFormula: (st) => 10 + Math.floor((st.dex - 10) / 2),
    startingEquipment: [
      {
        name: 'Cristal Arcano (Foco)',
        category: 'Foco Arcano',
        weight: '0,5 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Lança & 2 Adagas',
        category: 'Armas Simples',
        damage: '1d6 / 1d4 Perfurante',
        mastery: 'Ágil / Nick',
        weight: '2,5 kg',
        quantity: 1,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'draconic-sorcery',
        apiIndex: 'draconic-sorcery',
        name: 'Feitiçaria Dracônica',
        draconicResilience: true,
        features: [
          { level: 3, name: 'Resiliência Dracônica (CA 10 + DES + CAR)', description: '+1 PV por nível de Feiticeiro (mín +3) e CA sem armadura igual a 10 + mod. DES + mod. CAR!' },
          { level: 6, name: 'Afinidade Elemental', description: 'Resistência a um tipo elemental e soma mod. CAR ao dano de magias desse tipo.' },
          { level: 14, name: 'Asas de Dragão', description: 'Ação Bônus: ganha Deslocamento de Voo 18m por 1 hora (1x/dia ou 3 Pontos de Feitiçaria).' },
          { level: 18, name: 'Companheiro Dracônico', description: 'Conjura Invocar Dragão sem componente material (1x/dia grátis).' },
        ],
      },
    ],
  },
  {
    index: 'warlock',
    name: 'Bruxo (5.5e)',
    hitDie: 8,
    statPriority: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
    savingThrows: ['Sabedoria', 'Carisma'],
    proficiencies: ['Armaduras Leves', 'Armas Simples', 'Arcanismo', 'Enganação'],
    casterType: 'pact',
    weaponMasteryCountAt1: 0,
    baseArmorFormula: (st) => 11 + Math.floor((st.dex - 10) / 2),
    startingEquipment: [
      {
        name: 'Orbe Ocultista (Foco Arcano)',
        category: 'Foco Arcano',
        weight: '1,0 kg',
        quantity: 1,
        equipped: true,
      },
      {
        name: 'Armadura de Couro & 2 Adagas',
        category: 'Armadura Leve & Armas',
        armorClass: 'CA 11 + Mod. DES',
        weight: '6,0 kg',
        quantity: 1,
        equipped: true,
      },
    ],
    subclasses: [
      {
        index: 'fiend-patron',
        apiIndex: 'fiend-patron',
        name: 'Patrono Ínfero (Fiend)',
        features: [
          { level: 3, name: 'Bênção do Obscuro & Magias Ínferas', description: 'Ganha PV Temporários iguais a mod. CAR + nível de Bruxo sempre que um inimigo a até 3m cai a 0 PV.' },
          { level: 6, name: 'Sorte do Próprio Obscuro', description: 'Soma 1d10 a um Teste de Atributo ou Salvaguarda (mod. CAR usos/descanso longo).' },
          { level: 10, name: 'Resiliência Demoníaca', description: 'Escolhe um tipo de dano (exceto Força) após cada descanso para ter Resistência.' },
          { level: 14, name: 'Lançar no Inferno', description: 'Ao acertar ataque, bane o alvo pelos planos inferiores causando 8d10 Psíquico e Incapacitado até o fim do próximo turno.' },
        ],
      },
    ],
  },
];

// ============================================================================
// 4. PROGRESSÃO OFICIAL DE ESPAÇOS DE MAGIA 5.5E (NÍVEL 1 A 20)
// ============================================================================
const FULL_CASTER_SLOTS: number[][] = [
  // [lvl1..lvl9] para níveis 1..20
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 1
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 3
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 4
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 5
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 6
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 7
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // 8
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // 9
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // 10
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // 11
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // 12
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // 13
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // 14
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // 15
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // 16
  [4, 3, 3, 3, 2, 1, 1, 1, 1], // 17
  [4, 3, 3, 3, 3, 1, 1, 1, 1], // 18
  [4, 3, 3, 3, 3, 2, 1, 1, 1], // 19
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // 20
];

// Em D&D 5.5e (2024), Paladino e Guardião recebem Conjuração já no Nível 1!
const HALF_CASTER_55E_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 1
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 3
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 4
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 5
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 6
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 7
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 8
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 9
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 10
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 11
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 12
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 13
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 14
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // 15
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // 16
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // 17
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // 18
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // 19
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // 20
];

const THIRD_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
  [0, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 3
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 4
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 5
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 6
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 7
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 8
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 9
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 10
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 11
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 12
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 13
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 14
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 15
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 16
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 17
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 18
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 19
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 20
];

// ============================================================================
// 5. CATÁLOGO CURADO BILÍNGUE 5.5E (TRUQUES AO 9º CÍRCULO) + EQUIPAMENTOS 5.5E
// ============================================================================
export interface SpellCatalogEntry extends Omit<CharacterSpell, 'id'> {
  classes: string[];
}

export const CURATED_55E_SPELLS: SpellCatalogEntry[] = [
  // Truques (Nv 0)
  {
    index: 'eldritch-blast',
    name: 'Rajada Mística (Eldritch Blast)',
    level: 0,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '36m (120 ft)',
    components: 'V, S',
    duration: 'Instantânea',
    description: 'Feixe de energia mística (1d10 de Energia). Cria feixes extras nos níveis 5 (2), 11 (3) e 17 (4).',
    classes: ['warlock'],
  },
  {
    index: 'fire-bolt',
    name: 'Raio de Fogo (Fire Bolt)',
    level: 0,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '36m (120 ft)',
    components: 'V, S',
    duration: 'Instantânea',
    description: 'Ataque mágico à distância causando 1d10 de dano de Fogo (escala nos níveis 5, 11 e 17).',
    classes: ['wizard', 'sorcerer'],
  },
  {
    index: 'sacred-flame',
    name: 'Chama Sagrada (Sacred Flame)',
    level: 0,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '18m (60 ft)',
    components: 'V, S',
    duration: 'Instantânea',
    description: 'Chamas radiantes descem sobre o alvo (Salvaguarda DES ou 1d8 Radiante, ignora cobertura).',
    classes: ['cleric'],
  },
  {
    index: 'vicious-mockery',
    name: 'Zombaria Perversa (Vicious Mockery — 5.5e d6!)',
    level: 0,
    school: 'Encantamento',
    castingTime: '1 ação',
    range: '18m (60 ft)',
    components: 'V',
    duration: 'Instantânea',
    description: 'Na revisão 5.5e causa 1d6 Psíquico (Salvaguarda SAB) e impõe Desvantagem no próximo ataque do alvo.',
    classes: ['bard'],
  },
  {
    index: 'starry-wisp',
    name: 'Fagulha Estelar (Starry Wisp — Novo 5.5e)',
    level: 0,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '18m (60 ft)',
    components: 'V, S',
    duration: 'Instantânea',
    description: 'Ataque mágico à distância causando 1d8 Radiante; o alvo emite Luz Fraca e não pode ficar Invisível até seu próximo turno.',
    classes: ['bard', 'druid'],
  },
  {
    index: 'sorcerous-burst',
    name: 'Explosão Feiticeira (Sorcerous Burst — Novo 5.5e)',
    level: 0,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '36m (120 ft)',
    components: 'V, S',
    duration: 'Instantânea',
    description: 'Causa 1d8 do elemento escolhido; resultados 8 no d8 explodem permitindo rolar d8 extras até seu mod. CAR.',
    classes: ['sorcerer'],
  },
  {
    index: 'guidance',
    name: 'Orientação (Guidance — 5.5e)',
    level: 0,
    school: 'Adivinhação',
    castingTime: '1 ação',
    range: 'Toque',
    components: 'V, S',
    duration: 'Concentração, até 1 min',
    description: 'Escolhe 1 perícia: o alvo soma +1d4 em todos os testes daquela perícia pela duração.',
    classes: ['cleric', 'druid'],
  },
  {
    index: 'mage-hand',
    name: 'Mão Mágica (Mage Hand)',
    level: 0,
    school: 'Conjuração',
    castingTime: '1 ação',
    range: '9m (30 ft)',
    components: 'V, S',
    duration: '1 minuto',
    description: 'Cria mão espectral flutuante capaz de manipular objetos a distância.',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
  },

  // 1º Círculo
  {
    index: 'shield',
    name: 'Escudo Arcano (Shield)',
    level: 1,
    school: 'Abjuração',
    castingTime: '1 reação',
    range: 'Pessoal',
    components: 'V, S',
    duration: '1 rodada',
    description: '+5 na CA até o início do seu próximo turno e imunidade a Mísseis Mágicos.',
    classes: ['wizard', 'sorcerer'],
  },
  {
    index: 'magic-missile',
    name: 'Mísseis Mágicos (Magic Missile)',
    level: 1,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '36m (120 ft)',
    components: 'V, S',
    duration: 'Instantânea',
    description: '3 dardos infalíveis de energia mágica causando 1d4 + 1 de dano de Energia cada.',
    classes: ['wizard', 'sorcerer'],
  },
  {
    index: 'cure-wounds',
    name: 'Curar Ferimentos (Cure Wounds — 5.5e 2d8!)',
    level: 1,
    school: 'Abjuração',
    castingTime: '1 ação',
    range: 'Toque',
    components: 'V, S',
    duration: 'Instantânea',
    description: 'Na revisão 5.5e cura 2d8 + modificador de conjuração (+2d8 por círculo acima do 1º)!',
    classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'],
  },
  {
    index: 'healing-word',
    name: 'Palavra Curativa (Healing Word — 5.5e 2d4!)',
    level: 1,
    school: 'Abjuração',
    castingTime: '1 ação bônus',
    range: '18m (60 ft)',
    components: 'V',
    duration: 'Instantânea',
    description: 'Na revisão 5.5e cura 2d4 + modificador de conjuração à distância como Ação Bônus!',
    classes: ['bard', 'cleric', 'druid'],
  },
  {
    index: 'divine-smite',
    name: 'Destruição Divina (Divine Smite — 5.5e)',
    level: 1,
    school: 'Evocação',
    castingTime: '1 ação bônus (ao acertar ataque)',
    range: 'Pessoal',
    components: 'V',
    duration: 'Instantânea',
    description: 'Causa +2d8 de dano Radiante no acerto (+1d8 contra Mortos-Vivos/Corruptores). Sempre preparada no Paladino 5.5e e 1x/dia grátis!',
    classes: ['paladin'],
  },
  {
    index: 'hunters-mark',
    name: 'Marca do Caçador (Hunter’s Mark — 5.5e)',
    level: 1,
    school: 'Adivinhação',
    castingTime: '1 ação bônus',
    range: '27m (90 ft)',
    components: 'V',
    duration: 'Concentração, até 1 hora',
    description: 'Causa +1d6 de dano de Energia em cada acerto contra o alvo marcado. Sempre preparada e usos grátis no Guardião 5.5e!',
    classes: ['ranger'],
  },
  {
    index: 'hex',
    name: 'Bruxaria (Hex)',
    level: 1,
    school: 'Encantamento',
    castingTime: '1 ação bônus',
    range: '27m (90 ft)',
    components: 'V, S, M',
    duration: 'Concentração, até 1 hora',
    description: '+1d6 Necrótico nos seus ataques contra o alvo e Desvantagem em testes de um atributo escolhido.',
    classes: ['warlock'],
  },
  {
    index: 'bless',
    name: 'Bênção (Bless)',
    level: 1,
    school: 'Encantamento',
    castingTime: '1 ação',
    range: '9m (30 ft)',
    components: 'V, S, M',
    duration: 'Concentração, até 1 min',
    description: 'Até 3 aliados somam +1d4 em todas as Jogadas de Ataque e Salvaguardas.',
    classes: ['cleric', 'paladin'],
  },

  // 2º Círculo
  {
    index: 'misty-step',
    name: 'Passo Nebuloso (Misty Step)',
    level: 2,
    school: 'Conjuração',
    castingTime: '1 ação bônus',
    range: 'Pessoal',
    components: 'V',
    duration: 'Instantânea',
    description: 'Teleporta-se até 9m (30 ft) para um espaço visível desocupado.',
    classes: ['sorcerer', 'warlock', 'wizard'],
  },
  {
    index: 'spiritual-weapon',
    name: 'Arma Espiritual (Spiritual Weapon — 5.5e)',
    level: 2,
    school: 'Evocação',
    castingTime: '1 ação bônus',
    range: '18m (60 ft)',
    components: 'V, S',
    duration: 'Concentração, até 1 min',
    description: 'Cria arma espectral causando 1d8 + mod. conjuração de Energia (+1d8 para cada círculo acima do 2º no 5.5e!).',
    classes: ['cleric'],
  },
  {
    index: 'pass-without-trace',
    name: 'Passos sem Pegadas (Pass without Trace)',
    level: 2,
    school: 'Abjuração',
    castingTime: '1 ação',
    range: 'Pessoal (aura 9m)',
    components: 'V, S, M',
    duration: 'Concentração, até 1 hora',
    description: 'Concede +10 em testes de Furtividade para você e todos os aliados na aura.',
    classes: ['druid', 'ranger'],
  },
  {
    index: 'hold-person',
    name: 'Imobilizar Pessoa (Hold Person)',
    level: 2,
    school: 'Encantamento',
    castingTime: '1 ação',
    range: '18m (60 ft)',
    components: 'V, S, M',
    duration: 'Concentração, até 1 min',
    description: 'Paralisa um humanoide (Salvaguarda SAB).',
    classes: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'],
  },

  // 3º Círculo
  {
    index: 'fireball',
    name: 'Bola de Fogo (Fireball)',
    level: 3,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '45m (150 ft)',
    components: 'V, S, M',
    duration: 'Instantânea',
    description: 'Explosão de 6m de raio causando 8d6 de dano de Fogo (Salvaguarda DES reduz à metade).',
    classes: ['sorcerer', 'wizard'],
  },
  {
    index: 'counterspell',
    name: 'Contramágica (Counterspell — 5.5e)',
    level: 3,
    school: 'Abjuração',
    castingTime: '1 reação',
    range: '18m (60 ft)',
    components: 'S',
    duration: 'Instantânea',
    description: 'Na revisão 5.5e força Salvaguarda de Constituição no conjurador alvo: na falha a magia é dissipada sem gastar o espaço do alvo!',
    classes: ['sorcerer', 'warlock', 'wizard'],
  },
  {
    index: 'spirit-guardians',
    name: 'Guardiões Espirituais (Spirit Guardians — 5.5e)',
    level: 3,
    school: 'Conjuração',
    castingTime: '1 ação',
    range: 'Pessoal (emanação 4,5m)',
    components: 'V, S, M',
    duration: 'Concentração, até 10 min',
    description: 'Emanação espiritual que reduz deslocamento inimigo à metade e causa 3d8 Radiante ou Necrótico (Salvaguarda SAB).',
    classes: ['cleric'],
  },
  {
    index: 'revivify',
    name: 'Revivificar (Revivify)',
    level: 3,
    school: 'Necromancia',
    castingTime: '1 ação',
    range: 'Toque',
    components: 'V, S, M (diamantes 300 PO)',
    duration: 'Instantânea',
    description: 'Retorna à vida com 1 PV uma criatura morta há até 1 minuto.',
    classes: ['cleric', 'druid', 'paladin', 'ranger'],
  },
  {
    index: 'hypnotic-pattern',
    name: 'Padrão Hipnótico (Hypnotic Pattern)',
    level: 3,
    school: 'Ilusão',
    castingTime: '1 ação',
    range: '36m (120 ft)',
    components: 'S, M',
    duration: 'Concentração, até 1 min',
    description: 'Cubo de 9m que Enfeitiça e Incapacita criaturas que falharem em Salvaguarda de Sabedoria.',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
  },

  // 4º ao 9º Círculos (Níveis Altos!)
  {
    index: 'dimension-door',
    name: 'Porta Dimensional (Dimension Door)',
    level: 4,
    school: 'Conjuração',
    castingTime: '1 ação',
    range: '150m (500 ft)',
    components: 'V',
    duration: 'Instantânea',
    description: 'Teleporta você e 1 aliado voluntário até 150 metros.',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
  },
  {
    index: 'polymorph',
    name: 'Polimorfia (Polymorph — 5.5e)',
    level: 4,
    school: 'Transmutação',
    castingTime: '1 ação',
    range: '18m (60 ft)',
    components: 'V, S, M',
    duration: 'Concentração, até 1 hora',
    description: 'Transforma criatura em Fera de ND até o nível/ND do alvo (concede PV Temporários iguais aos PV da Fera no 5.5e!).',
    classes: ['bard', 'druid', 'sorcerer', 'wizard'],
  },
  {
    index: 'greater-restoration',
    name: 'Restauração Maior (Greater Restoration)',
    level: 5,
    school: 'Abjuração',
    castingTime: '1 ação',
    range: 'Toque',
    components: 'V, S, M',
    duration: 'Instantânea',
    description: 'Remove Exaustão, Petrificação, Maldição, Enfeitiçado ou redução de atributo.',
    classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'],
  },
  {
    index: 'wall-of-force',
    name: 'Muralha de Energia (Wall of Force)',
    level: 5,
    school: 'Evocação',
    castingTime: '1 ação',
    range: '36m (120 ft)',
    components: 'V, S, M',
    duration: 'Concentração, até 10 min',
    description: 'Cria muralha ou domo invisível indestrutível imune a todo dano.',
    classes: ['wizard'],
  },
  {
    index: 'disintegrate',
    name: 'Desintegrar (Disintegrate)',
    level: 6,
    school: 'Transmutação',
    castingTime: '1 ação',
    range: '18m (60 ft)',
    components: 'V, S, M',
    duration: 'Instantânea',
    description: 'Raio esverdeado causa 10d6 + 40 de dano de Energia (Salvaguarda DES nega).',
    classes: ['sorcerer', 'wizard'],
  },
  {
    index: 'heal',
    name: 'Cura Completa (Heal)',
    level: 6,
    school: 'Abjuração',
    castingTime: '1 ação',
    range: '18m (60 ft)',
    components: 'V, S',
    duration: 'Instantânea',
    description: 'Restaura 70 PV instantaneamente e encerra Cego, Surdo e Envenenado.',
    classes: ['cleric', 'druid'],
  },
  {
    index: 'teleport',
    name: 'Teletransporte (Teleport)',
    level: 7,
    school: 'Conjuração',
    castingTime: '1 ação',
    range: '3m (10 ft)',
    components: 'V',
    duration: 'Instantânea',
    description: 'Transporta instantaneamente você e até 8 criaturas voluntárias para qualquer destino no mesmo plano.',
    classes: ['bard', 'sorcerer', 'wizard'],
  },
  {
    index: 'holy-aura',
    name: 'Aura Sagrada (Holy Aura)',
    level: 8,
    school: 'Abjuração',
    castingTime: '1 ação',
    range: 'Pessoal (9m)',
    components: 'V, S, M',
    duration: 'Concentração, até 1 min',
    description: 'Aliados na aura têm Vantagem em todas as Salvaguardas e inimigos têm Desvantagem ao atacá-los.',
    classes: ['cleric'],
  },
  {
    index: 'wish',
    name: 'Desejo (Wish)',
    level: 9,
    school: 'Conjuração',
    castingTime: '1 ação',
    range: 'Pessoal',
    components: 'V',
    duration: 'Instantânea',
    description: 'A mais poderosa magia mortal: duplica instantaneamente qualquer magia de 8º círculo ou menor sem componentes, ou altera a própria realidade.',
    classes: ['sorcerer', 'wizard'],
  },
  {
    index: 'true-resurrection',
    name: 'Ressurreição Verdadeira (True Resurrection)',
    level: 9,
    school: 'Necromancia',
    castingTime: '1 hora',
    range: 'Toque',
    components: 'V, S, M',
    duration: 'Instantânea',
    description: 'Restaura à vida com PV máximos criatura morta há até 200 anos, mesmo sem corpo.',
    classes: ['cleric', 'druid'],
  },
];

export interface CuratedEquipmentOption extends Omit<CharacterEquipmentItem, 'id'> {
  equipTag: 'simple-weapon' | 'martial-weapon' | 'light-armor' | 'medium-armor' | 'heavy-armor' | 'shield' | 'arcane-focus' | 'holy-focus' | 'druid-focus' | 'musical-focus' | 'gear';
}

export const CURATED_EQUIPMENT: CuratedEquipmentOption[] = [
  {
    name: 'Espada Longa (Longsword)',
    category: 'Arma Marcial Corpo a Corpo',
    damage: '1d8 Cortante (Versátil 1d10)',
    mastery: 'Afligir / Sap (Desvantagem no próximo ataque do alvo)',
    weight: '1,5 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'martial-weapon',
  },
  {
    name: 'Espada Grande (Greatsword)',
    category: 'Arma Marcial Pesada',
    damage: '2d6 Cortante (Pesada, Duas Mãos)',
    mastery: 'Raspar / Graze (Causa mod. atributo mesmo se errar o ataque!)',
    weight: '3,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'martial-weapon',
  },
  {
    name: 'Machado Grande (Greataxe)',
    category: 'Arma Marcial Pesada',
    damage: '1d12 Cortante (Pesada, Duas Mãos)',
    mastery: 'Trespassar / Cleave (Ataque gratuito em 2º inimigo adjacente)',
    weight: '3,5 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'martial-weapon',
  },
  {
    name: 'Martelo de Guerra (Warhammer)',
    category: 'Arma Marcial Corpo a Corpo',
    damage: '1d8 Contundente (Versátil 1d10)',
    mastery: 'Empurrar / Push (Empurra o alvo 3m ao acertar)',
    weight: '1,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'martial-weapon',
  },
  {
    name: 'Rapieira (Rapier)',
    category: 'Arma Marcial com Acuidade',
    damage: '1d8 Perfurante (Acuidade)',
    mastery: 'Afligir / Vex (Vantagem no próximo ataque contra o alvo)',
    weight: '1,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'martial-weapon',
  },
  {
    name: 'Espada Curta (Shortsword)',
    category: 'Arma Marcial Leve (Acuidade)',
    damage: '1d6 Perfurante (Leve, Acuidade)',
    mastery: 'Afligir / Vex (Vantagem no próximo ataque contra o alvo)',
    weight: '1,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'martial-weapon',
  },
  {
    name: 'Arco Longo (Longbow)',
    category: 'Arma Marcial à Distância',
    damage: '1d8 Perfurante (Alcance 45/180m)',
    mastery: 'Lentidão / Slow (-3m de deslocamento)',
    weight: '1,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'martial-weapon',
  },
  {
    name: 'Arco Curto (Shortbow)',
    category: 'Arma Simples à Distância',
    damage: '1d6 Perfurante (Alcance 24/96m)',
    mastery: 'Afligir / Vex',
    weight: '1,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'simple-weapon',
  },
  {
    name: 'Maça (Mace)',
    category: 'Arma Simples Corpo a Corpo',
    damage: '1d6 Contundente',
    mastery: 'Afligir / Sap',
    weight: '2,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'simple-weapon',
  },
  {
    name: 'Bordão / Cajado (Quarterstaff)',
    category: 'Arma Simples Versátil',
    damage: '1d6 Contundente (Versátil 1d8)',
    mastery: 'Derrubar / Topple (Salvaguarda CON ou Caído)',
    weight: '2,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'simple-weapon',
  },
  {
    name: 'Lança (Spear)',
    category: 'Arma Simples de Arremesso',
    damage: '1d6 Perfurante (Versátil 1d8, Arremesso 6/18m)',
    mastery: 'Afligir / Sap',
    weight: '1,5 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'simple-weapon',
  },
  {
    name: 'Adaga (Dagger)',
    category: 'Arma Simples Leve',
    damage: '1d4 Perfurante (Acuidade, Arremesso)',
    mastery: 'Ágil / Nick (Ataque extra na ação Atacar sem gastar Ação Bônus)',
    weight: '0,5 kg',
    quantity: 2,
    equipped: true,
    equipTag: 'simple-weapon',
  },
  {
    name: 'Armadura de Placas (Plate Armor)',
    category: 'Armadura Pesada',
    armorClass: 'CA 18 (FOR 15, Desv. Furtividade)',
    weight: '29,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'heavy-armor',
  },
  {
    name: 'Cota de Malha (Chain Mail)',
    category: 'Armadura Pesada',
    armorClass: 'CA 16',
    weight: '27,5 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'heavy-armor',
  },
  {
    name: 'Meia-Armadura (Half Plate)',
    category: 'Armadura Média',
    armorClass: 'CA 15 + Mod. DES (máx +2)',
    weight: '20,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'medium-armor',
  },
  {
    name: 'Camisão de Malha (Chain Shirt)',
    category: 'Armadura Média',
    armorClass: 'CA 13 + Mod. DES (máx +2)',
    weight: '10,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'medium-armor',
  },
  {
    name: 'Armadura de Couro Batido (Studded Leather)',
    category: 'Armadura Leve',
    armorClass: 'CA 12 + Mod. Destreza',
    weight: '6,5 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'light-armor',
  },
  {
    name: 'Armadura de Couro (Leather Armor)',
    category: 'Armadura Leve',
    armorClass: 'CA 11 + Mod. Destreza',
    weight: '5,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'light-armor',
  },
  {
    name: 'Escudo de Aço (Shield)',
    category: 'Escudo',
    armorClass: '+2 CA',
    weight: '3,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'shield',
  },
  {
    name: 'Cajado / Orbe Arcano + Grimório',
    category: 'Foco Arcano',
    notes: 'Permite canalizar magias sem componentes materiais sem custo.',
    weight: '2,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'arcane-focus',
  },
  {
    name: 'Símbolo Sagrado & Reliquiário',
    category: 'Foco Divino',
    notes: 'Foco sagrado para magias de Clérigo e Paladino.',
    weight: '0,5 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'holy-focus',
  },
  {
    name: 'Cajado Druídico & Visco Sagrado',
    category: 'Foco Druídico',
    notes: 'Foco natural para conjuração de Druida e Guardião.',
    weight: '1,5 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'druid-focus',
  },
  {
    name: 'Alaúde / Lira (Instrumento Musical)',
    category: 'Foco Musical',
    notes: 'Instrumento mágico/mundano para conjurações de Bardo.',
    weight: '1,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'musical-focus',
  },
  {
    name: 'Pacote de Explorador + Poção de Cura (2d4+2)',
    category: 'Suprimentos & Poções',
    notes: 'Mochila, corda 15m, rações (10 dias), tochas e 1 Poção de Cura.',
    weight: '5,0 kg',
    quantity: 1,
    equipped: true,
    equipTag: 'gear',
  },
];

// ============================================================================
// 6. MOTOR DE PROGRESSÃO 5.5E POR NÍVEL (PUXA TUDO DO NÍVEL 1 ATÉ O NÍVEL L!)
// ============================================================================
interface Api2024LevelItem {
  level: number;
  prof_bonus?: number;
  features?: { index: string; name: string; url: string }[];
  class_specific?: Record<string, unknown>;
  spellcasting?: Record<string, number>;
}

interface Api2024FeatureDetail {
  index: string;
  name: string;
  description?: string;
}

interface Api2024SpellSummary {
  index: string;
  name: string;
  level: number;
  url: string;
}

interface Api2024SpellDetail {
  index: string;
  name: string;
  level: number;
  school?: { name: string };
  casting_time?: string;
  range?: string;
  components?: string[];
  material?: string;
  duration?: string;
  description?: string;
}

export interface FullCharacterProgression55e {
  speciesLabel: string;
  speed: string;
  racialTraits: string[];
  originName: string;
  originFeat: string;
  classLabel: string;
  subclassLabel: string;
  level: number;
  proficiencyBonus: number;
  stats: Record<StatKey, number>;
  maxHp: number;
  armorClass: number;
  hitDice: string;
  savingThrows: string[];
  proficiencies: string[];
  weaponMasteries: string[];
  classFeatures: CharacterFeature[];
  classResources: CharacterClassResource[];
  spellSlots: CharacterSpellSlots;
  recommendedSpells: CharacterSpell[];
  startingEquipment: CharacterEquipmentItem[];
}

export const STAT_KEYS: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function computeBaseStatsStandardArray(classIndex: string): Record<StatKey, number> {
  const cls =
    DND_CLASSES_CATALOG.find((c) => c.index === classIndex) || DND_CLASSES_CATALOG[0];
  const standardArray = [15, 14, 13, 12, 10, 8];
  const base: Record<StatKey, number> = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };
  cls.statPriority.forEach((key, idx) => {
    base[key] = standardArray[idx];
  });
  return base;
}

export interface DiceRoll4d6Detail {
  statKey: StatKey;
  dice: [number, number, number, number];
  droppedIndex: number;
  total: number;
}

export function roll4d6DropLowestForBuild(classIndex: string): {
  baseStats: Record<StatKey, number>;
  details: DiceRoll4d6Detail[];
} {
  const cls =
    DND_CLASSES_CATALOG.find((c) => c.index === classIndex) || DND_CLASSES_CATALOG[0];
  const rawRolls: { dice: [number, number, number, number]; droppedIndex: number; total: number }[] = [];

  for (let i = 0; i < 6; i++) {
    const dice: [number, number, number, number] = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
    let minIdx = 0;
    for (let j = 1; j < 4; j++) {
      if (dice[j] < dice[minIdx]) minIdx = j;
    }
    const total = dice.reduce((acc, v, idx) => (idx === minIdx ? acc : acc + v), 0);
    rawRolls.push({ dice, droppedIndex: minIdx, total });
  }

  // Distribui os maiores resultados de acordo com a prioridade natural da classe
  const sorted = [...rawRolls].sort((a, b) => b.total - a.total);
  const baseStats: Record<StatKey, number> = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };
  const details: DiceRoll4d6Detail[] = [];

  cls.statPriority.forEach((key, idx) => {
    const r = sorted[idx];
    baseStats[key] = r.total;
    details.push({
      statKey: key,
      dice: r.dice,
      droppedIndex: r.droppedIndex,
      total: r.total,
    });
  });

  return { baseStats, details };
}

export interface DiceRoll3d6Detail {
  statKey: StatKey;
  dice: [number, number, number];
  total: number;
}

export function rollRandom3d6ForBuild(): {
  baseStats: Record<StatKey, number>;
  details: DiceRoll3d6Detail[];
} {
  const baseStats: Record<StatKey, number> = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  };
  const details: DiceRoll3d6Detail[] = [];

  for (const key of STAT_KEYS) {
    const dice: [number, number, number] = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
    const total = dice[0] + dice[1] + dice[2];
    baseStats[key] = total;
    details.push({ statKey: key, dice, total });
  }

  return { baseStats, details };
}

export function applyOriginAndAsiToBaseStats(
  baseStats: Record<StatKey, number>,
  originIndex: string,
  classIndex: string,
  level: number
): Record<StatKey, number> {
  const cls =
    DND_CLASSES_CATALOG.find((c) => c.index === classIndex) || DND_CLASSES_CATALOG[0];
  const origin =
    DND_ORIGINS_CATALOG.find((o) => o.index === originIndex) || DND_ORIGINS_CATALOG[0];

  const result: Record<StatKey, number> = { ...baseStats };

  // Bônus de Origem 5.5e (+2 / +1)
  result[origin.primaryBoost] += 2;
  result[origin.secondaryBoost] += 1;

  // Incrementos de Atributo (ASI) desbloqueados até o nível selecionado
  const asiLevels =
    cls.index === 'fighter'
      ? [4, 6, 8, 12, 14, 16]
      : cls.index === 'rogue'
      ? [4, 8, 10, 12, 16]
      : [4, 8, 12, 16];

  const unlockedAsis = asiLevels.filter((l) => level >= l).length;
  let pointsToSpend = unlockedAsis * 2;

  for (const key of cls.statPriority) {
    while (pointsToSpend > 0 && result[key] < 20) {
      result[key] += 1;
      pointsToSpend -= 1;
    }
  }

  // Nível 19 — Dádiva Épica (+1 em um atributo até máx 30 no 5.5e!)
  if (level >= 19) {
    result[cls.statPriority[0]] = Math.min(30, result[cls.statPriority[0]] + 1);
  }

  return result;
}

function computeRecommendedStatsForLevel(
  cls: DndClassOption,
  origin: DndOriginOption,
  level: number
): Record<StatKey, number> {
  const base = computeBaseStatsStandardArray(cls.index);
  return applyOriginAndAsiToBaseStats(base, origin.index, cls.index, level);
}

/**
 * Para fichas antigas que ainda não armazenavam baseStats separados, infere
 * os valores base aproximados subtraindo os bônus de Origem (+2/+1) e ASI do nível.
 */
export function inferBaseStatsFromFinal(
  finalStats: Record<StatKey, number>,
  originIndex: string,
  classIndex: string,
  level: number
): Record<StatKey, number> {
  const cls =
    DND_CLASSES_CATALOG.find((c) => c.index === classIndex) || DND_CLASSES_CATALOG[0];
  const origin =
    DND_ORIGINS_CATALOG.find((o) => o.index === originIndex) || DND_ORIGINS_CATALOG[0];

  const base: Record<StatKey, number> = { ...finalStats };
  if (level >= 19) {
    base[cls.statPriority[0]] = Math.max(3, base[cls.statPriority[0]] - 1);
  }

  const asiLevels =
    cls.index === 'fighter'
      ? [4, 6, 8, 12, 14, 16]
      : cls.index === 'rogue'
      ? [4, 8, 10, 12, 16]
      : [4, 8, 12, 16];
  const unlockedAsis = asiLevels.filter((l) => level >= l).length;
  let pointsToRevert = unlockedAsis * 2;
  for (let idx = cls.statPriority.length - 1; idx >= 0; idx--) {
    const key = cls.statPriority[idx];
    while (pointsToRevert > 0 && base[key] > 15) {
      base[key] -= 1;
      pointsToRevert -= 1;
    }
  }
  while (pointsToRevert > 0) {
    base[cls.statPriority[0]] = Math.max(3, base[cls.statPriority[0]] - 1);
    pointsToRevert -= 1;
  }

  base[origin.primaryBoost] = Math.max(3, base[origin.primaryBoost] - 2);
  base[origin.secondaryBoost] = Math.max(3, base[origin.secondaryBoost] - 1);
  return base;
}

function buildSpellSlotsFor55e(
  cls: DndClassOption,
  subclass: DndSubclassOption | undefined,
  level: number,
  apiSpellcasting?: Record<string, number>
): { slots: CharacterSpellSlots; maxCircle: number } {
  const clampedLvl = Math.max(1, Math.min(20, level));

  if (cls.casterType === 'pact') {
    const pactSlotsCount =
      clampedLvl === 1 ? 1 : clampedLvl <= 10 ? 2 : clampedLvl <= 16 ? 3 : 4;
    const pactSlotLevel = Math.min(5, Math.ceil(clampedLvl / 2));
    // Mystic Arcanum em níveis 11 (6º), 13 (7º), 15 (8º), 17 (9º)
    return {
      maxCircle:
        clampedLvl >= 17
          ? 9
          : clampedLvl >= 15
          ? 8
          : clampedLvl >= 13
          ? 7
          : clampedLvl >= 11
          ? 6
          : pactSlotLevel,
      slots: {
        level1: { used: 0, max: pactSlotLevel === 1 ? pactSlotsCount : 0 },
        level2: { used: 0, max: pactSlotLevel === 2 ? pactSlotsCount : 0 },
        level3: { used: 0, max: pactSlotLevel === 3 ? pactSlotsCount : 0 },
        level4: { used: 0, max: pactSlotLevel === 4 ? pactSlotsCount : 0 },
        level5: { used: 0, max: pactSlotLevel === 5 ? pactSlotsCount : 0 },
        level6: { used: 0, max: clampedLvl >= 11 ? 1 : 0 },
        level7: { used: 0, max: clampedLvl >= 13 ? 1 : 0 },
        level8: { used: 0, max: clampedLvl >= 15 ? 1 : 0 },
        level9: { used: 0, max: clampedLvl >= 17 ? 1 : 0 },
        pactSlots: { level: pactSlotLevel, used: 0, max: pactSlotsCount },
      },
    };
  }

  let row = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (apiSpellcasting && typeof apiSpellcasting.spell_slots_level_1 === 'number') {
    row = [
      apiSpellcasting.spell_slots_level_1 || 0,
      apiSpellcasting.spell_slots_level_2 || 0,
      apiSpellcasting.spell_slots_level_3 || 0,
      apiSpellcasting.spell_slots_level_4 || 0,
      apiSpellcasting.spell_slots_level_5 || 0,
      apiSpellcasting.spell_slots_level_6 || 0,
      apiSpellcasting.spell_slots_level_7 || 0,
      apiSpellcasting.spell_slots_level_8 || 0,
      apiSpellcasting.spell_slots_level_9 || 0,
    ];
  } else if (cls.casterType === 'full') {
    row = FULL_CASTER_SLOTS[clampedLvl - 1];
  } else if (cls.casterType === 'half') {
    row = HALF_CASTER_55E_SLOTS[clampedLvl - 1];
  } else if (subclass?.spellcasterThird && clampedLvl >= 3) {
    row = THIRD_CASTER_SLOTS[clampedLvl - 1];
  }

  let maxCircle = 0;
  row.forEach((count, idx) => {
    if (count > 0) maxCircle = idx + 1;
  });

  return {
    maxCircle,
    slots: {
      level1: { used: 0, max: row[0] },
      level2: { used: 0, max: row[1] },
      level3: { used: 0, max: row[2] },
      level4: { used: 0, max: row[3] },
      level5: { used: 0, max: row[4] },
      level6: { used: 0, max: row[5] },
      level7: { used: 0, max: row[6] },
      level8: { used: 0, max: row[7] },
      level9: { used: 0, max: row[8] },
    },
  };
}

function buildClassResources55e(
  cls: DndClassOption,
  level: number,
  apiClassSpecific?: Record<string, unknown>,
  apiSpellcasting?: Record<string, number>
): CharacterClassResource[] {
  const res: CharacterClassResource[] = [];

  if (cls.weaponMasteryCountAt1 > 0) {
    const wmCount =
      typeof apiClassSpecific?.weapon_mastery === 'number'
        ? apiClassSpecific.weapon_mastery
        : cls.index === 'fighter'
        ? level >= 16
          ? 6
          : level >= 10
          ? 5
          : level >= 4
          ? 4
          : 3
        : level >= 4 && cls.index === 'barbarian'
        ? level >= 10
          ? 4
          : 3
        : cls.weaponMasteryCountAt1;
    res.push({ label: 'Maestrias de Arma (5.5e)', value: `${wmCount} armas` });
  }

  if (cls.index === 'fighter') {
    const sw = level >= 10 ? 4 : level >= 4 ? 3 : 2;
    res.push({ label: 'Retomar o Fôlego', value: `${sw} usos` });
    if (level >= 2) {
      res.push({ label: 'Surto de Ação', value: level >= 17 ? '2 usos' : '1 uso' });
    }
    res.push({
      label: 'Ataques por Ação',
      value: level >= 20 ? '4 ataques' : level >= 11 ? '3 ataques' : level >= 5 ? '2 ataques' : '1 ataque',
    });
  }

  if (cls.index === 'barbarian') {
    const rages = level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
    const rageDmg = level >= 16 ? '+4' : level >= 9 ? '+3' : '+2';
    res.push({ label: 'Fúrias', value: `${rages} usos (${rageDmg} dano)` });
  }

  if (cls.index === 'rogue') {
    const dice = Math.ceil(level / 2);
    res.push({ label: 'Ataque Furtivo', value: `${dice}d6` });
  }

  if (cls.index === 'monk') {
    const die = level >= 17 ? '1d12' : level >= 11 ? '1d10' : level >= 5 ? '1d8' : '1d6';
    res.push({ label: 'Dado de Artes Marciais (5.5e)', value: die });
    if (level >= 2) {
      res.push({ label: 'Pontos de Foco', value: `${level}` });
    }
  }

  if (cls.index === 'paladin') {
    res.push({ label: 'Cura pelas Mãos', value: `${level * 5} PV` });
    if (level >= 3) {
      res.push({
        label: 'Canalizar Divindade',
        value: level >= 11 ? '3 usos' : '2 usos',
      });
    }
  }

  if (cls.index === 'bard') {
    const die = level >= 15 ? '1d12' : level >= 10 ? '1d10' : level >= 5 ? '1d8' : '1d6';
    res.push({ label: 'Inspiração de Bardo', value: die });
  }

  if (cls.index === 'sorcerer' && level >= 2) {
    res.push({ label: 'Pontos de Feitiçaria', value: `${level}` });
  }

  if (cls.index === 'warlock') {
    const inv =
      level >= 18
        ? 10
        : level >= 15
        ? 9
        : level >= 12
        ? 8
        : level >= 9
        ? 7
        : level >= 7
        ? 6
        : level >= 5
        ? 5
        : level >= 2
        ? 3
        : 1;
    res.push({ label: 'Invocações Místicas (5.5e)', value: `${inv} ativas` });
  }

  if (apiSpellcasting?.cantrips_known) {
    res.push({ label: 'Truques Conhecidos', value: `${apiSpellcasting.cantrips_known}` });
  }
  if (apiSpellcasting?.prepared_spells) {
    res.push({ label: 'Magias Preparadas (5.5e)', value: `${apiSpellcasting.prepared_spells}` });
  }

  return res;
}

export async function fetchCharacterProgression55e(params: {
  speciesIndex: string;
  originIndex: string;
  classIndex: string;
  subclassIndex?: string;
  level: number;
  baseStats?: Record<StatKey, number>;
  customStats?: Record<StatKey, number>;
}): Promise<FullCharacterProgression55e> {
  const level = Math.max(1, Math.min(20, Math.round(params.level || 1)));
  const species =
    DND_RACES_CATALOG.find((s) => s.index === params.speciesIndex) ||
    DND_RACES_CATALOG[0];
  const origin =
    DND_ORIGINS_CATALOG.find((o) => o.index === params.originIndex) ||
    DND_ORIGINS_CATALOG[0];
  const cls =
    DND_CLASSES_CATALOG.find((c) => c.index === params.classIndex) ||
    DND_CLASSES_CATALOG[0];

  const activeSubclass =
    level >= 3
      ? cls.subclasses.find((sc) => sc.index === params.subclassIndex) ||
        cls.subclasses[0]
      : undefined;

  // Consulta em paralelo na API oficial D&D 2024 (SRD 5.2)
  const [apiSpecies, apiClassLevels, apiSubLevels, apiClassSpells] =
    await Promise.all([
      fetch2024Json<{ speed?: number; traits?: { name: string }[] }>(
        `/species/${species.apiIndex}`
      ),
      fetch2024Json<Api2024LevelItem[]>(`/classes/${cls.index}/levels`),
      activeSubclass?.apiIndex
        ? fetch2024Json<Api2024LevelItem[]>(
            `/subclasses/${activeSubclass.apiIndex}/levels`
          )
        : Promise.resolve(null),
      cls.casterType !== 'none' || activeSubclass?.spellcasterThird
        ? fetch2024Json<{ results?: Api2024SpellSummary[] }>(
            `/classes/${cls.name.toLowerCase().includes('cavaleiro') || activeSubclass?.spellcasterThird ? 'wizard' : cls.index}/spells`
          )
        : Promise.resolve(null),
    ]);

  const stats = params.customStats
    ? params.customStats
    : params.baseStats
    ? applyOriginAndAsiToBaseStats(params.baseStats, origin.index, cls.index, level)
    : computeRecommendedStatsForLevel(cls, origin, level);

  const conMod = Math.floor((stats.con - 10) / 2);
  const avgDie = Math.floor(cls.hitDie / 2) + 1;
  const bonusHpPerLevel =
    (species.hpBonusPerLevel || 0) +
    (origin.hpBonusPerLevel || 0) +
    (activeSubclass?.draconicResilience ? 1 : 0);

  const lvl1Hp = Math.max(1, cls.hitDie + conMod + bonusHpPerLevel);
  const higherLvlsHp =
    level > 1 ? (level - 1) * Math.max(1, avgDie + conMod + bonusHpPerLevel) : 0;
  const maxHp = lvl1Hp + higherLvlsHp;

  let armorClass = cls.baseArmorFormula(stats);
  if (activeSubclass?.draconicResilience) {
    armorClass = Math.max(
      armorClass,
      10 + Math.floor((stats.dex - 10) / 2) + Math.floor((stats.cha - 10) / 2)
    );
  }
  if (level >= 8 && (cls.index === 'fighter' || cls.index === 'paladin')) {
    armorClass = 20; // Armadura de Placas (18) + Escudo (+2) em níveis médios/altos
  }

  const profBonus = Math.ceil(level / 4) + 1;

  // Traços da Espécie + Dádivas de Nível 3/5
  const unlockedSpeciesTraits = [
    ...species.traits,
    ...(species.levelTraits || [])
      .filter((lt) => level >= lt.level)
      .map((lt) => `${lt.name}: ${lt.description}`),
  ];

  // Características acumuladas do Nível 1 até o Nível L!
  const classFeatures: CharacterFeature[] = [
    {
      level: 1,
      name: `Talento de Origem: ${origin.originFeat}`,
      source: `Origem (${origin.name})`,
      description: origin.originFeatDesc,
    },
  ];

  for (const lt of species.levelTraits || []) {
    if (level >= lt.level) {
      classFeatures.push({
        level: lt.level,
        name: lt.name,
        source: species.name,
        description: lt.description,
      });
    }
  }

  const currentApiLevelObj = apiClassLevels?.find((l) => l.level === level);

  if (Array.isArray(apiClassLevels) && apiClassLevels.length > 0) {
    const unlockedRows = apiClassLevels.filter((r) => r.level <= level);
    const featureRefs: { level: number; index: string; name: string }[] = [];
    for (const row of unlockedRows) {
      for (const f of row.features || []) {
        featureRefs.push({ level: row.level, index: f.index, name: f.name });
      }
    }

    // Busca descrições das features na API 2024 (com cache em memória)
    const detailedFeatures = await Promise.all(
      featureRefs.map(async (ref) => {
        const detail = await fetch2024Json<Api2024FeatureDetail>(
          `/features/${ref.index}`
        );
        return {
          level: ref.level,
          name: ref.name,
          source: cls.name,
          description:
            detail?.description?.slice(0, 340) ||
            `Característica oficial de ${cls.name} desbloqueada no Nível ${ref.level} (SRD 5.2 / 5.5e).`,
        };
      })
    );
    classFeatures.push(...detailedFeatures);
  }

  // Características da Subclasse desbloqueadas até o Nível L
  if (activeSubclass) {
    if (Array.isArray(apiSubLevels) && apiSubLevels.length > 0) {
      for (const row of apiSubLevels.filter((r) => r.level <= level)) {
        for (const f of row.features || []) {
          const localMatch = activeSubclass.features.find((lf) => lf.level === row.level);
          const detail = await fetch2024Json<Api2024FeatureDetail>(
            `/features/${f.index}`
          );
          classFeatures.push({
            level: row.level,
            name: f.name,
            source: activeSubclass.name,
            description:
              localMatch?.description ||
              detail?.description?.slice(0, 340) ||
              `Habilidade de subclasse (${activeSubclass.name}) desbloqueada no Nível ${row.level}.`,
          });
        }
      }
    } else {
      for (const sf of activeSubclass.features.filter((f) => f.level <= level)) {
        classFeatures.push({
          level: sf.level,
          name: sf.name,
          source: activeSubclass.name,
          description: sf.description,
        });
      }
    }
  }

  classFeatures.sort((a, b) => a.level - b.level);

  // Espaços de Magia 5.5e (1º ao 9º Círculo + Pacto)
  const { slots: spellSlots, maxCircle } = buildSpellSlotsFor55e(
    cls,
    activeSubclass,
    level,
    currentApiLevelObj?.spellcasting
  );

  // Magias Recomendadas/Desbloqueadas até o círculo máximo disponível no Nível L!
  const spellClassKey = activeSubclass?.spellcasterThird ? 'wizard' : cls.index;
  const recommendedSpells: CharacterSpell[] = [];

  if (maxCircle > 0 || cls.casterType !== 'none' || origin.originFeat.includes('Iniciado em Magia')) {
    const effectiveMaxCircle = Math.max(
      origin.originFeat.includes('Iniciado em Magia') ? 1 : 0,
      maxCircle
    );
    const matchingCurated = CURATED_55E_SPELLS.filter(
      (sp) =>
        sp.classes.includes(spellClassKey) && sp.level <= effectiveMaxCircle
    );

    for (const sp of matchingCurated) {
      recommendedSpells.push({
        id: `sp-${sp.index}-${level}`,
        index: sp.index,
        name: sp.name,
        level: sp.level,
        school: sp.school,
        castingTime: sp.castingTime,
        range: sp.range,
        components: sp.components,
        duration: sp.duration,
        description: sp.description,
        prepared: true,
      });
    }

    // Complementa com magias reais de nível alto da API 2024 se o nível liberar círculos maiores
    if (apiClassSpells?.results && effectiveMaxCircle >= 2) {
      const missingCircles: Api2024SpellSummary[] = [];
      for (let c = 1; c <= effectiveMaxCircle; c++) {
        const countAtCircle = recommendedSpells.filter((s) => s.level === c).length;
        if (countAtCircle < 2) {
          const candidates = apiClassSpells.results
            .filter(
              (r) =>
                r.level === c &&
                !recommendedSpells.some((ex) => ex.index === r.index)
            )
            .slice(0, 2 - countAtCircle);
          missingCircles.push(...candidates);
        }
      }

      const apiDetails = await Promise.all(
        missingCircles.slice(0, 8).map((s) =>
          fetch2024Json<Api2024SpellDetail>(`/spells/${s.index}`)
        )
      );

      for (const d of apiDetails) {
        if (!d) continue;
        recommendedSpells.push({
          id: `sp-${d.index}-${level}`,
          index: d.index,
          name: d.name,
          level: d.level,
          school: d.school?.name || 'Evocation',
          castingTime: d.casting_time || 'Action',
          range: d.range || '60 feet',
          components: Array.isArray(d.components) ? d.components.join(', ') : 'V, S',
          duration: d.duration || 'Instantaneous',
          description: d.description?.slice(0, 280) || 'Magia oficial SRD 5.2 (5.5e).',
          prepared: true,
        });
      }
    }
  }

  recommendedSpells.sort((a, b) => a.level - b.level);

  // Proficiências combinadas (Classe + Perícias/Ferramenta da Origem)
  const mergedProficiencies = Array.from(
    new Set([...cls.proficiencies, ...origin.skills, origin.tool])
  );

  // Equipamentos Iniciais + Upgrade de Armadura em níveis superiores + Maestrias
  const startingEquipment: CharacterEquipmentItem[] = cls.startingEquipment.map(
    (item, idx) => {
      if (
        level >= 8 &&
        item.name.includes('Cota de Malha') &&
        (cls.index === 'fighter' || cls.index === 'paladin')
      ) {
        return {
          id: `eq-${cls.index}-plate-${idx}`,
          name: 'Armadura de Placas Completa (Plate)',
          category: 'Armadura Pesada',
          armorClass: 'CA 18',
          weight: '29,0 kg',
          quantity: 1,
          equipped: true,
        };
      }
      return {
        ...item,
        id: `eq-${cls.index}-${idx}`,
      };
    }
  );

  startingEquipment.push({
    id: `eq-origin-${origin.index}`,
    name: `Kit de ${origin.name}`,
    category: 'Equipamento de Origem (5.5e)',
    notes: origin.equipmentSummary,
    weight: '2,0 kg',
    quantity: 1,
    equipped: true,
  });

  const weaponMasteries = startingEquipment
    .filter((eq) => Boolean(eq.mastery))
    .map((eq) => `${eq.name.split(' (')[0]}: ${eq.mastery!.trim()}`);

  const classResources = buildClassResources55e(
    cls,
    level,
    currentApiLevelObj?.class_specific,
    currentApiLevelObj?.spellcasting
  );

  const apiSpeedFt = apiSpecies?.speed;
  const resolvedSpeed = apiSpeedFt
    ? `${(apiSpeedFt * 0.3).toFixed(1).replace('.0', '')}m (${apiSpeedFt} ft)`
    : species.speed;

  return {
    speciesLabel: species.name,
    speed: resolvedSpeed,
    racialTraits: unlockedSpeciesTraits,
    originName: origin.name,
    originFeat: origin.originFeat,
    classLabel: cls.name,
    subclassLabel: activeSubclass ? activeSubclass.name : '',
    level,
    proficiencyBonus: profBonus,
    stats,
    maxHp,
    armorClass,
    hitDice: `${level}d${cls.hitDie}`,
    savingThrows: cls.savingThrows,
    proficiencies: mergedProficiencies,
    weaponMasteries,
    classFeatures,
    classResources,
    spellSlots,
    recommendedSpells,
    startingEquipment,
  };
}

// ============================================================================
// 7. BUSCA ASSÍNCRONA DE MAGIAS E EQUIPAMENTOS NA API D&D 5.5E (2024)
// ============================================================================
export async function searchDndSpells(
  query: string,
  options?: { classIndex?: string; maxLevel?: number }
): Promise<Omit<CharacterSpell, 'id'>[]> {
  const q = query.trim().toLowerCase();
  const maxLvl = options?.maxLevel;
  const clsIdx = options?.classIndex;

  const localFiltered = CURATED_55E_SPELLS.filter((s) => {
    if (typeof maxLvl === 'number' && s.level > maxLvl) return false;
    if (clsIdx && !q && !s.classes.includes(clsIdx)) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.index.toLowerCase().includes(q) ||
      s.school.toLowerCase().includes(q)
    );
  });

  if (!q || q.length < 2) {
    return localFiltered;
  }

  const data = await fetch2024Json<{ results?: Api2024SpellSummary[] }>(
    `/spells?name=${encodeURIComponent(q)}`
  );

  if (!data?.results || data.results.length === 0) {
    return localFiltered;
  }

  const topResults = data.results
    .filter((item) => (typeof maxLvl === 'number' ? (item.level ?? 0) <= maxLvl : true))
    .slice(0, 6);

  const detailed = await Promise.all(
    topResults.map(async (item) => {
      const d = await fetch2024Json<Api2024SpellDetail>(`/spells/${item.index}`);
      if (!d) return null;
      return {
        index: d.index,
        name: d.name,
        level: d.level ?? 0,
        school: d.school?.name || 'Evocation',
        castingTime: d.casting_time || 'Action',
        range: d.range || '60 feet',
        components: Array.isArray(d.components)
          ? `${d.components.join(', ')}${d.material ? ` (${d.material})` : ''}`
          : 'V, S',
        duration: d.duration || 'Instantaneous',
        description: d.description || 'Magia oficial SRD 5.2 (D&D 5.5e).',
      } as Omit<CharacterSpell, 'id'>;
    })
  );

  const merged: Omit<CharacterSpell, 'id'>[] = [...localFiltered];
  for (const sp of detailed) {
    if (sp && !merged.some((m) => m.index === sp.index)) {
      merged.push(sp);
    }
  }
  return merged;
}

export async function searchDndEquipment(
  query: string
): Promise<Omit<CharacterEquipmentItem, 'id'>[]> {
  const q = query.trim().toLowerCase();
  const localFiltered = CURATED_EQUIPMENT.filter(
    (e) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.mastery || '').toLowerCase().includes(q)
  );

  if (!q || q.length < 2) {
    return localFiltered;
  }

  const data = await fetch2024Json<{ results?: { index: string; name: string }[] }>(
    `/equipment?name=${encodeURIComponent(q)}`
  );

  if (!data?.results || data.results.length === 0) {
    return localFiltered;
  }

  const detailed = await Promise.all(
    data.results.slice(0, 6).map(async (item) => {
      const d = await fetch2024Json<{
        name: string;
        equipment_categories?: { name: string }[];
        damage?: { damage_dice: string; damage_type?: { name: string } };
        two_handed_damage?: { damage_dice: string };
        armor_class?: { base: number; dex_bonus?: boolean };
        mastery?: { name: string };
        weight?: number;
      }>(`/equipment/${item.index}`);
      if (!d) return null;

      const damageStr = d.damage
        ? `${d.damage.damage_dice} ${d.damage.damage_type?.name || ''}${
            d.two_handed_damage ? ` (2M ${d.two_handed_damage.damage_dice})` : ''
          }`.trim()
        : undefined;
      const acStr = d.armor_class
        ? `CA ${d.armor_class.base}${d.armor_class.dex_bonus ? ' + Mod. DES' : ''}`
        : undefined;

      return {
        name: d.name,
        category: d.equipment_categories?.[0]?.name || 'Equipamento SRD 5.5e',
        damage: damageStr,
        armorClass: acStr,
        mastery: d.mastery?.name ? `Maestria: ${d.mastery.name}` : undefined,
        weight: d.weight ? `${(d.weight * 0.45).toFixed(1)} kg` : '1,0 kg',
        quantity: 1,
        equipped: true,
      } as Omit<CharacterEquipmentItem, 'id'>;
    })
  );

  const valid = detailed.filter(
    (i): i is Omit<CharacterEquipmentItem, 'id'> => i !== null
  );
  return [...localFiltered, ...valid];
}

// ============================================================================
// 8. OPÇÕES PERMITIDAS POR CLASSE, ESPÉCIE, ORIGEM E NÍVEL (ITENS, MAGIAS, PERÍCIAS)
// ============================================================================

export interface ClassSkillChoiceConfig {
  count: number;
  options: string[];
}

export const CLASS_SKILL_CHOICES: Record<string, ClassSkillChoiceConfig> = {
  fighter: {
    count: 2,
    options: ['Acrobacia', 'Adestrar Animais', 'Atletismo', 'História', 'Intuição', 'Intimidação', 'Percepção', 'Sobrevivência'],
  },
  barbarian: {
    count: 2,
    options: ['Adestrar Animais', 'Atletismo', 'Intimidação', 'Natureza', 'Percepção', 'Sobrevivência'],
  },
  paladin: {
    count: 2,
    options: ['Atletismo', 'Intuição', 'Intimidação', 'Medicina', 'Persuasão', 'Religião'],
  },
  ranger: {
    count: 3,
    options: ['Adestrar Animais', 'Atletismo', 'Furtividade', 'Intuição', 'Investigação', 'Natureza', 'Percepção', 'Sobrevivência'],
  },
  rogue: {
    count: 4,
    options: ['Acrobacia', 'Atletismo', 'Atuação', 'Enganação', 'Furtividade', 'Intimidação', 'Intuição', 'Investigação', 'Percepção', 'Persuasão', 'Prestidigitação'],
  },
  monk: {
    count: 2,
    options: ['Acrobacia', 'Atletismo', 'Furtividade', 'História', 'Intuição', 'Religião'],
  },
  bard: {
    count: 3,
    options: ['Acrobacia', 'Arcanismo', 'Atletismo', 'Atuação', 'Enganação', 'Furtividade', 'História', 'Intuição', 'Investigação', 'Percepção', 'Persuasão', 'Prestidigitação'],
  },
  cleric: {
    count: 2,
    options: ['História', 'Intuição', 'Medicina', 'Persuasão', 'Religião'],
  },
  druid: {
    count: 2,
    options: ['Adestrar Animais', 'Arcanismo', 'Intuição', 'Medicina', 'Natureza', 'Percepção', 'Religião', 'Sobrevivência'],
  },
  sorcerer: {
    count: 2,
    options: ['Arcanismo', 'Enganação', 'Intimidação', 'Intuição', 'Persuasão', 'Religião'],
  },
  warlock: {
    count: 2,
    options: ['Arcanismo', 'Enganação', 'História', 'Intimidação', 'Investigação', 'Natureza', 'Religião'],
  },
  wizard: {
    count: 2,
    options: ['Arcanismo', 'História', 'Intuição', 'Investigação', 'Medicina', 'Natureza', 'Religião'],
  },
};

export interface SpeciesLineageChoice {
  label: string;
  options: { id: string; name: string; bonusSummary: string; spellClass?: string }[];
}

export const SPECIES_LINEAGE_OPTIONS: Record<string, SpeciesLineageChoice> = {
  human: {
    label: 'Talento Versátil Extra (Humano 5.5e)',
    options: [
      { id: 'skilled', name: 'Habilidoso (+3 Perícias/Ferramentas)', bonusSummary: 'Proficiência em 3 perícias extras' },
      { id: 'alert', name: 'Alerta (+Prof. na Iniciativa)', bonusSummary: 'Iniciativa aumentada e troca tática' },
      { id: 'tough', name: 'Duro de Matar (+2 PV/nível)', bonusSummary: 'Resistência física ampliada' },
      { id: 'lucky', name: 'Sortudo (Pontos de Sorte)', bonusSummary: 'Vantagem em d20 críticos' },
      { id: 'magic-initiate-wizard', name: 'Iniciado em Magia — Mago', bonusSummary: '2 truques + 1 magia Nv.1 de Mago', spellClass: 'wizard' },
    ],
  },
  elf: {
    label: 'Linhagem Élfica (5.5e)',
    options: [
      { id: 'high-elf', name: 'Alto Elfo (Prestidigitação · Detectar Magia · Passo Nebuloso)', bonusSummary: 'Acesso a magias arcanas raciais', spellClass: 'wizard' },
      { id: 'wood-elf', name: 'Elfo da Floresta (+1,5m Desloc. · Artifício Druídico)', bonusSummary: 'Passos Longos Nv.3 e Passos sem Pegadas Nv.5', spellClass: 'druid' },
      { id: 'drow', name: 'Elfo Negro / Drow (Visão no Escuro 36m · Globos de Luz)', bonusSummary: 'Fogo das Fadas Nv.3 e Escuridão Nv.5', spellClass: 'warlock' },
    ],
  },
  dragonborn: {
    label: 'Ancestral Dracônico (Tipo de Sopro & Resistência)',
    options: [
      { id: 'red', name: 'Dragão Vermelho / Dourado (Fogo)', bonusSummary: 'Resistência e Sopro de Fogo' },
      { id: 'silver', name: 'Dragão Branco / Prateado (Frio)', bonusSummary: 'Resistência e Sopro de Gelo' },
      { id: 'blue', name: 'Dragão Azul / Bronze (Elétrico)', bonusSummary: 'Resistência e Sopro Elétrico' },
      { id: 'black', name: 'Dragão Negro / Cobre (Ácido)', bonusSummary: 'Resistência e Sopro Ácido' },
      { id: 'green', name: 'Dragão Verde (Veneno)', bonusSummary: 'Resistência e Sopro Venenoso' },
    ],
  },
  tiefling: {
    label: 'Legado Ínfero (5.5e)',
    options: [
      { id: 'infernal', name: 'Legado Infernal (Resist. Fogo · Raio de Fogo · Escuridão)', bonusSummary: 'Herança dos Nove Infernos', spellClass: 'warlock' },
      { id: 'abyssal', name: 'Legado Abissal (Resist. Veneno · Rajada de Veneno)', bonusSummary: 'Herança do Abismo', spellClass: 'sorcerer' },
      { id: 'cthonic', name: 'Legado Ctônico (Resist. Necrótico · Toque Arrepiante)', bonusSummary: 'Herança de Hades/Umbra', spellClass: 'warlock' },
    ],
  },
  goliath: {
    label: 'Ancestral Gigante (Dádiva 5.5e)',
    options: [
      { id: 'fire', name: 'Gigante do Fogo (Queimadura +1d10 Fogo)', bonusSummary: 'Dano ígneo adicional ao acertar' },
      { id: 'frost', name: 'Gigante do Gelo (Frio +1d6 e -3m deslocamento)', bonusSummary: 'Controle glacial em acertos' },
      { id: 'cloud', name: 'Gigante das Nuvens (Teleporte 9m como Ação Bônus)', bonusSummary: 'Mobilidade etérea em combate' },
      { id: 'stone', name: 'Gigante da Pedra (Reação reduz 1d12 + CON de dano)', bonusSummary: 'Mitigação física de dano' },
    ],
  },
  gnome: {
    label: 'Linhagem Gnômica (5.5e)',
    options: [
      { id: 'forest', name: 'Gnomo da Floresta (Ilusão Menor · Falar com Animais)', bonusSummary: 'Ilusão e fauna silvestre', spellClass: 'druid' },
      { id: 'rock', name: 'Gnomo das Rochas (Prestidigitação · Bugigangas)', bonusSummary: 'Engenhocas e truques arcanos', spellClass: 'wizard' },
    ],
  },
};

export interface EquipmentChoiceOption {
  id: string;
  label: string;
  items: Omit<CharacterEquipmentItem, 'id'>[];
}

export interface EquipmentChoiceGroup {
  groupLabel: string;
  options: EquipmentChoiceOption[];
}

const findCuratedEq = (substr: string): CuratedEquipmentOption =>
  CURATED_EQUIPMENT.find((e) => e.name.toLowerCase().includes(substr.toLowerCase())) ||
  CURATED_EQUIPMENT[0];

export const CLASS_EQUIPMENT_CHOICE_GROUPS: Record<string, EquipmentChoiceGroup[]> = {
  fighter: [
    {
      groupLabel: 'Armadura Inicial Permitida',
      options: [
        { id: 'heavy-mail', label: 'Opção A: Cota de Malha (Pesada CA 16)', items: [findCuratedEq('Cota de Malha')] },
        { id: 'light-bow', label: 'Opção B: Couro Batido + Arco Longo', items: [findCuratedEq('Couro Batido'), findCuratedEq('Arco Longo')] },
      ],
    },
    {
      groupLabel: 'Armamento Principal Permitido',
      options: [
        { id: 'sword-shield', label: 'Opção A: Espada Longa (Vex/Sap) + Escudo (+2 CA)', items: [findCuratedEq('Espada Longa'), findCuratedEq('Escudo')] },
        { id: 'greatsword', label: 'Opção B: Espada Grande 2M (Graze)', items: [findCuratedEq('Espada Grande')] },
        { id: 'two-weapons', label: 'Opção C: 2 Espadas Curtas + Adagas', items: [findCuratedEq('Espada Curta'), findCuratedEq('Adaga')] },
      ],
    },
  ],
  paladin: [
    {
      groupLabel: 'Armamento Sagrado Permitido',
      options: [
        { id: 'pal-shield', label: 'Opção A: Espada Longa + Escudo + Cota de Malha', items: [findCuratedEq('Espada Longa'), findCuratedEq('Escudo'), findCuratedEq('Cota de Malha')] },
        { id: 'pal-heavy', label: 'Opção B: Espada Grande 2M + Cota de Malha', items: [findCuratedEq('Espada Grande'), findCuratedEq('Cota de Malha')] },
      ],
    },
    {
      groupLabel: 'Foco Divino Permitido',
      options: [
        { id: 'pal-holy', label: 'Símbolo Sagrado + Pacote de Explorador', items: [findCuratedEq('Símbolo Sagrado'), findCuratedEq('Pacote de Explorador')] },
      ],
    },
  ],
  barbarian: [
    {
      groupLabel: 'Arma Bárbara Permitida',
      options: [
        { id: 'barb-greataxe', label: 'Opção A: Machado Grande 2M (Cleave)', items: [findCuratedEq('Machado Grande')] },
        { id: 'barb-greatsword', label: 'Opção B: Espada Grande 2M (Graze) + Adagas', items: [findCuratedEq('Espada Grande'), findCuratedEq('Adaga')] },
      ],
    },
  ],
  rogue: [
    {
      groupLabel: 'Arsenal Furtivo Permitido',
      options: [
        { id: 'rogue-rapier', label: 'Opção A: Rapieira + Arco Curto + Couro', items: [findCuratedEq('Rapieira'), findCuratedEq('Arco Curto'), findCuratedEq('Armadura de Couro (Leather')] },
        { id: 'rogue-twin', label: 'Opção B: Espada Curta + 2 Adagas + Couro Batido', items: [findCuratedEq('Espada Curta'), findCuratedEq('Adaga'), findCuratedEq('Couro Batido')] },
      ],
    },
  ],
  ranger: [
    {
      groupLabel: 'Arsenal do Explorador Permitido',
      options: [
        { id: 'rng-bow', label: 'Opção A: Arco Longo + 2 Espadas Curtas + Couro Batido', items: [findCuratedEq('Arco Longo'), findCuratedEq('Espada Curta'), findCuratedEq('Couro Batido')] },
        { id: 'rng-med', label: 'Opção B: Camisão de Malha + Espada Longa + Escudo', items: [findCuratedEq('Camisão de Malha'), findCuratedEq('Espada Longa'), findCuratedEq('Escudo')] },
      ],
    },
  ],
  monk: [
    {
      groupLabel: 'Armas Marciais de Monge Permitidas',
      options: [
        { id: 'monk-spear', label: 'Lança + Adagas de Arremesso + Pacote de Explorador', items: [findCuratedEq('Lança'), findCuratedEq('Adaga'), findCuratedEq('Pacote de Explorador')] },
        { id: 'monk-staff', label: 'Bordão (Topple) + Adagas', items: [findCuratedEq('Bordão'), findCuratedEq('Adaga')] },
      ],
    },
  ],
  cleric: [
    {
      groupLabel: 'Armamento & Armadura Clerical Permitida',
      options: [
        { id: 'clr-mace', label: 'Opção A: Maça + Camisão de Malha + Escudo + Símbolo Sagrado', items: [findCuratedEq('Maça'), findCuratedEq('Camisão de Malha'), findCuratedEq('Escudo'), findCuratedEq('Símbolo Sagrado')] },
        { id: 'clr-light', label: 'Opção B: Bordão + Armadura de Couro + Escudo + Símbolo Sagrado', items: [findCuratedEq('Bordão'), findCuratedEq('Armadura de Couro (Leather'), findCuratedEq('Escudo'), findCuratedEq('Símbolo Sagrado')] },
      ],
    },
  ],
  druid: [
    {
      groupLabel: 'Foco & Proteção Druídica Permitida',
      options: [
        { id: 'drd-staff', label: 'Bordão + Cajado Druídico + Couro + Escudo', items: [findCuratedEq('Bordão'), findCuratedEq('Cajado Druídico'), findCuratedEq('Armadura de Couro (Leather'), findCuratedEq('Escudo')] },
      ],
    },
  ],
  bard: [
    {
      groupLabel: 'Conjunto Artístico & Combate Permitido',
      options: [
        { id: 'brd-std', label: 'Rapieira ou Adagas + Alaúde + Armadura de Couro', items: [findCuratedEq('Adaga'), findCuratedEq('Alaúde'), findCuratedEq('Armadura de Couro (Leather')] },
      ],
    },
  ],
  wizard: [
    {
      groupLabel: 'Equipamento Arcano Permitido',
      options: [
        { id: 'wiz-staff', label: 'Opção A: Cajado/Orbe Arcano + Grimório + Bordão', items: [findCuratedEq('Orbe Arcano'), findCuratedEq('Bordão')] },
        { id: 'wiz-dagger', label: 'Opção B: Cajado/Orbe Arcano + 2 Adagas + Pacote de Explorador', items: [findCuratedEq('Orbe Arcano'), findCuratedEq('Adaga'), findCuratedEq('Pacote de Explorador')] },
      ],
    },
  ],
  sorcerer: [
    {
      groupLabel: 'Foco Inato Permitido',
      options: [
        { id: 'sorc-std', label: 'Orbe/Cristal Arcano + 2 Adagas + Lança', items: [findCuratedEq('Orbe Arcano'), findCuratedEq('Adaga'), findCuratedEq('Lança')] },
      ],
    },
  ],
  warlock: [
    {
      groupLabel: 'Equipamento do Pacto Permitido',
      options: [
        { id: 'war-std', label: 'Armadura de Couro + Foco Arcano + 2 Adagas', items: [findCuratedEq('Armadura de Couro (Leather'), findCuratedEq('Orbe Arcano'), findCuratedEq('Adaga')] },
      ],
    },
  ],
};

const CLASS_ALLOWED_EQUIP_TAGS: Record<string, CuratedEquipmentOption['equipTag'][]> = {
  fighter: ['simple-weapon', 'martial-weapon', 'light-armor', 'medium-armor', 'heavy-armor', 'shield', 'gear'],
  paladin: ['simple-weapon', 'martial-weapon', 'light-armor', 'medium-armor', 'heavy-armor', 'shield', 'holy-focus', 'gear'],
  barbarian: ['simple-weapon', 'martial-weapon', 'light-armor', 'medium-armor', 'shield', 'gear'],
  ranger: ['simple-weapon', 'martial-weapon', 'light-armor', 'medium-armor', 'shield', 'druid-focus', 'gear'],
  rogue: ['simple-weapon', 'martial-weapon', 'light-armor', 'gear'],
  monk: ['simple-weapon', 'gear'],
  cleric: ['simple-weapon', 'light-armor', 'medium-armor', 'shield', 'holy-focus', 'gear'],
  druid: ['simple-weapon', 'light-armor', 'shield', 'druid-focus', 'gear'],
  bard: ['simple-weapon', 'light-armor', 'musical-focus', 'gear'],
  wizard: ['simple-weapon', 'arcane-focus', 'gear'],
  sorcerer: ['simple-weapon', 'arcane-focus', 'gear'],
  warlock: ['simple-weapon', 'light-armor', 'arcane-focus', 'gear'],
};

export function getPermittedEquipmentForClass(classIndex: string): CuratedEquipmentOption[] {
  const tags = CLASS_ALLOWED_EQUIP_TAGS[classIndex] || ['simple-weapon', 'gear'];
  return CURATED_EQUIPMENT.filter((eq) => tags.includes(eq.equipTag));
}

export function getPermittedBuildChoices55e(params: {
  speciesIndex: string;
  originIndex: string;
  classIndex: string;
  subclassIndex?: string;
  level: number;
}) {
  const cls =
    DND_CLASSES_CATALOG.find((c) => c.index === params.classIndex) ||
    DND_CLASSES_CATALOG[0];
  const origin =
    DND_ORIGINS_CATALOG.find((o) => o.index === params.originIndex) ||
    DND_ORIGINS_CATALOG[0];
  const species =
    DND_RACES_CATALOG.find((r) => r.index === params.speciesIndex) ||
    DND_RACES_CATALOG[0];
  const activeSub =
    params.level >= 3
      ? cls.subclasses.find((sc) => sc.index === params.subclassIndex) || cls.subclasses[0]
      : undefined;

  const skillConfig = CLASS_SKILL_CHOICES[cls.index] || { count: 2, options: ['Percepção', 'Atletismo'] };
  const lineageConfig = SPECIES_LINEAGE_OPTIONS[species.index] || null;
  const equipmentChoices = CLASS_EQUIPMENT_CHOICE_GROUPS[cls.index] || [];
  const permittedEquipment = getPermittedEquipmentForClass(cls.index);

  const { maxCircle } = buildSpellSlotsFor55e(cls, activeSub, params.level);
  const originGivesMagic = origin.originFeat.includes('Iniciado em Magia');
  const effectiveMaxCircle = Math.max(originGivesMagic ? 1 : 0, maxCircle);

  // Quantidade sugerida/permitida de truques e magias preparadas para orientar o jogador
  const cantripsRecommended =
    cls.casterType === 'full'
      ? params.level >= 10
        ? 5
        : params.level >= 4
        ? 4
        : 3
      : cls.casterType === 'pact'
      ? params.level >= 10
        ? 4
        : params.level >= 4
        ? 3
        : 2
      : activeSub?.spellcasterThird
      ? 3
      : originGivesMagic || species.index === 'elf' || species.index === 'tiefling'
      ? 2
      : 0;

  const preparedSpellsRecommended =
    effectiveMaxCircle === 0
      ? 0
      : cls.casterType === 'full'
      ? Math.min(25, params.level + 3)
      : cls.casterType === 'half'
      ? Math.min(15, Math.ceil(params.level / 2) + 2)
      : cls.casterType === 'pact'
      ? Math.min(15, params.level + 1)
      : Math.max(1, Math.ceil(params.level / 2));

  return {
    skillConfig,
    lineageConfig,
    equipmentChoices,
    permittedEquipment,
    effectiveMaxCircle,
    cantripsRecommended,
    preparedSpellsRecommended,
  };
}

export async function fetchPermittedSpellsForBuild55e(params: {
  speciesIndex: string;
  originIndex: string;
  classIndex: string;
  subclassIndex?: string;
  lineageId?: string;
  level: number;
}): Promise<Omit<CharacterSpell, 'id'>[]> {
  const cls =
    DND_CLASSES_CATALOG.find((c) => c.index === params.classIndex) ||
    DND_CLASSES_CATALOG[0];
  const origin =
    DND_ORIGINS_CATALOG.find((o) => o.index === params.originIndex) ||
    DND_ORIGINS_CATALOG[0];
  const activeSub =
    params.level >= 3
      ? cls.subclasses.find((sc) => sc.index === params.subclassIndex) || cls.subclasses[0]
      : undefined;

  const { maxCircle } = buildSpellSlotsFor55e(cls, activeSub, params.level);
  const originSpellClass = origin.originFeat.includes('Clérigo')
    ? 'cleric'
    : origin.originFeat.includes('Druida')
    ? 'druid'
    : origin.originFeat.includes('Mago')
    ? 'wizard'
    : null;

  const lineageMatch = SPECIES_LINEAGE_OPTIONS[params.speciesIndex]?.options.find(
    (o) => o.id === params.lineageId
  );
  const lineageSpellClass = lineageMatch?.spellClass || null;

  const allowedClasses = new Set<string>();
  if (cls.casterType !== 'none') {
    allowedClasses.add(cls.index);
  }
  if (activeSub?.spellcasterThird) {
    allowedClasses.add('wizard');
  }
  if (originSpellClass) allowedClasses.add(originSpellClass);
  if (lineageSpellClass) allowedClasses.add(lineageSpellClass);

  const effectiveMaxCircle = Math.max(
    originSpellClass || lineageSpellClass ? 1 : 0,
    maxCircle
  );

  if (allowedClasses.size === 0) {
    return [];
  }

  // 1. Filtra todas as magias do catálogo bilíngue permitidas para as classes/círculo da build
  const results: Omit<CharacterSpell, 'id'>[] = CURATED_55E_SPELLS.filter(
    (sp) =>
      sp.level <= effectiveMaxCircle &&
      sp.classes.some((c) => allowedClasses.has(c))
  ).map(({ classes: _, ...rest }) => rest);

  // 2. Complementa com lista oficial da API 2024 para a classe principal
  const primarySpellClass =
    cls.casterType !== 'none'
      ? cls.index
      : activeSub?.spellcasterThird
      ? 'wizard'
      : originSpellClass || lineageSpellClass;

  if (primarySpellClass) {
    const apiList = await fetch2024Json<{ results?: Api2024SpellSummary[] }>(
      `/classes/${primarySpellClass}/spells`
    );
    if (apiList?.results) {
      const candidates = apiList.results
        .filter(
          (r) =>
            r.level <= effectiveMaxCircle &&
            !results.some((ex) => ex.index === r.index)
        )
        .slice(0, 14);

      const detailed = await Promise.all(
        candidates.map((c) => fetch2024Json<Api2024SpellDetail>(`/spells/${c.index}`))
      );

      for (const d of detailed) {
        if (!d) continue;
        results.push({
          index: d.index,
          name: d.name,
          level: d.level ?? 0,
          school: d.school?.name || 'Evocation',
          castingTime: d.casting_time || 'Action',
          range: d.range || '60 feet',
          components: Array.isArray(d.components) ? d.components.join(', ') : 'V, S',
          duration: d.duration || 'Instantaneous',
          description: d.description?.slice(0, 260) || 'Magia oficial SRD 5.2 (5.5e).',
        });
      }
    }
  }

  return results.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}
