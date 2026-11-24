import type { Ability, SkillId } from './types';

/** Magia concedida por espécie/linhagem, liberada a partir de um nível de personagem. */
export interface GrantedSpell {
  spellId: string;
  level: number;
  /** "Truque" ou "1x por Descanso Longo" etc. — apenas informativo */
  note?: string;
}

export interface SpeciesTrait {
  name: string;
  description: string;
  /** nível de personagem em que o traço passa a valer (padrão 1) */
  level?: number;
}

export interface LineageOption {
  id: string;
  name: string;
  description: string;
  spells?: GrantedSpell[];
  /** deslocamento em pés, se a linhagem altera */
  speedFt?: number;
  darkvisionFt?: number;
  /** tipo de dano (ancestralidade dracônica / legado ínfero) */
  damageType?: string;
  /** resistência concedida */
  resistance?: string;
}

export interface SpeciesData {
  id: string;
  name: string;
  nameEn: string;
  summary: string;
  creatureType: string;
  sizeOptions: ('Médio' | 'Pequeno')[];
  speedFt: number;
  darkvisionFt?: number;
  traits: SpeciesTrait[];
  lineage?: {
    label: string;
    options: LineageOption[];
    /** a linhagem concede magias que exigem atributo de conjuração escolhido */
    spellcastingAbilityChoice?: Ability[];
  };
  /** escolha de perícia (Elfo: Sentidos Aguçados; Humano: Hábil) */
  skillChoice?: { count: number; options: SkillId[] | 'any'; label: string };
  /** Humano: talento de origem adicional */
  bonusOriginFeat?: boolean;
  /** PV extras por nível de personagem */
  hpPerLevel?: number;
  /** magias concedidas por todas as linhagens/sem linhagem */
  spells?: GrantedSpell[];
}

export const SPECIES: SpeciesData[] = [
  {
    id: 'aasimar',
    name: 'Aasimar',
    nameEn: 'Aasimar',
    summary: 'Mortais com uma centelha dos Planos Superiores, capazes de manifestar poder celestial.',
    creatureType: 'Humanoide',
    sizeOptions: ['Médio', 'Pequeno'],
    speedFt: 30,
    darkvisionFt: 60,
    spells: [{ spellId: 'light', level: 1, note: 'Truque (Carisma)' }],
    traits: [
      { name: 'Resistência Celestial', description: 'Você tem Resistência a dano Necrótico e Radiante.' },
      { name: 'Visão no Escuro', description: 'Você enxerga na penumbra a até 18 m como se fosse luz plena, e na escuridão como se fosse penumbra (apenas em tons de cinza).' },
      { name: 'Mãos Curativas', description: 'Como ação Usar Magia, toque uma criatura e role d4s em número igual ao seu Bônus de Proficiência; ela recupera PV iguais ao total. Uma vez por Descanso Longo.' },
      { name: 'Portador da Luz', description: 'Você conhece o truque Luz. Carisma é seu atributo de conjuração para ele.' },
      { name: 'Revelação Celestial', level: 3, description: 'Como Ação Bônus, transforme-se por 1 minuto (uma vez por Descanso Longo) escolhendo: Asas Celestiais (Deslocamento de Voo igual ao Deslocamento), Radiância Interior (luz plena de 3 m e, no fim de cada turno seu, criaturas a até 3 m sofrem dano Radiante igual ao seu Bônus de Proficiência) ou Mortalha Necrótica (criaturas a até 3 m fazem teste de Carisma, CD 8 + mod. Car + BP, ou ficam Amedrontadas até o fim do seu próximo turno). Em todas as opções, uma vez por turno você causa dano extra igual ao seu Bônus de Proficiência (Radiante ou Necrótico) a um alvo que atingir com ataque ou magia.' },
    ],
  },
  {
    id: 'dragonborn',
    name: 'Draconato',
    nameEn: 'Dragonborn',
    summary: 'Descendentes de dragões, com sopro elemental e resistência herdada de seus ancestrais.',
    creatureType: 'Humanoide',
    sizeOptions: ['Médio'],
    speedFt: 30,
    darkvisionFt: 60,
    traits: [
      { name: 'Arma de Sopro', description: 'Ao usar a ação Atacar, substitua um ataque por uma exalação em Cone de 4,5 m ou Linha de 9 m × 1,5 m. Criaturas na área fazem teste de Destreza (CD 8 + mod. Con + BP): sofrem 1d10 do tipo da sua ancestralidade na falha, metade no sucesso. O dano sobe para 2d10 no nível 5, 3d10 no 11 e 4d10 no 17. Usos iguais ao Bônus de Proficiência por Descanso Longo.' },
      { name: 'Resistência a Dano', description: 'Você tem Resistência ao tipo de dano da sua Ancestralidade Dracônica.' },
      { name: 'Visão no Escuro', description: 'Você enxerga na penumbra a até 18 m como se fosse luz plena, e na escuridão como penumbra.' },
      { name: 'Voo Dracônico', level: 5, description: 'Como Ação Bônus, manifeste asas espectrais por 10 minutos: Deslocamento de Voo igual ao seu Deslocamento. Uma vez por Descanso Longo.' },
    ],
    lineage: {
      label: 'Ancestralidade Dracônica',
      options: [
        { id: 'black', name: 'Negro', damageType: 'Ácido', resistance: 'Ácido', description: 'Sopro e resistência de Ácido.' },
        { id: 'blue', name: 'Azul', damageType: 'Elétrico', resistance: 'Elétrico', description: 'Sopro e resistência Elétrica.' },
        { id: 'brass', name: 'Latão', damageType: 'Fogo', resistance: 'Fogo', description: 'Sopro e resistência de Fogo.' },
        { id: 'bronze', name: 'Bronze', damageType: 'Elétrico', resistance: 'Elétrico', description: 'Sopro e resistência Elétrica.' },
        { id: 'copper', name: 'Cobre', damageType: 'Ácido', resistance: 'Ácido', description: 'Sopro e resistência de Ácido.' },
        { id: 'gold', name: 'Ouro', damageType: 'Fogo', resistance: 'Fogo', description: 'Sopro e resistência de Fogo.' },
        { id: 'green', name: 'Verde', damageType: 'Veneno', resistance: 'Veneno', description: 'Sopro e resistência de Veneno.' },
        { id: 'red', name: 'Vermelho', damageType: 'Fogo', resistance: 'Fogo', description: 'Sopro e resistência de Fogo.' },
        { id: 'silver', name: 'Prata', damageType: 'Frio', resistance: 'Frio', description: 'Sopro e resistência de Frio.' },
        { id: 'white', name: 'Branco', damageType: 'Frio', resistance: 'Frio', description: 'Sopro e resistência de Frio.' },
      ],
    },
  },
  {
    id: 'dwarf',
    name: 'Anão',
    nameEn: 'Dwarf',
    summary: 'Povo resistente das montanhas e do subterrâneo, com sentidos ligados à pedra.',
    creatureType: 'Humanoide',
    sizeOptions: ['Médio'],
    speedFt: 30,
    darkvisionFt: 120,
    hpPerLevel: 1,
    traits: [
      { name: 'Visão no Escuro', description: 'Você enxerga na penumbra a até 36 m como se fosse luz plena, e na escuridão como penumbra.' },
      { name: 'Resiliência Anã', description: 'Você tem Resistência a dano de Veneno e Vantagem em testes de resistência para evitar ou encerrar a condição Envenenado.' },
      { name: 'Robustez Anã', description: 'Seu máximo de Pontos de Vida aumenta em 1, e aumenta em mais 1 a cada nível que você ganhar.' },
      { name: 'Conhecimento da Pedra', description: 'Como Ação Bônus, ganhe Sentido Sísmico com alcance de 18 m por 10 minutos, desde que esteja sobre ou tocando uma superfície de pedra. Usos iguais ao Bônus de Proficiência por Descanso Longo.' },
    ],
  },
  {
    id: 'elf',
    name: 'Elfo',
    nameEn: 'Elf',
    summary: 'Seres longevos de origem feérica, com linhagens ligadas à magia, às florestas ou ao Subterrâneo.',
    creatureType: 'Humanoide',
    sizeOptions: ['Médio'],
    speedFt: 30,
    darkvisionFt: 60,
    skillChoice: { count: 1, options: ['insight', 'perception', 'survival'], label: 'Sentidos Aguçados' },
    traits: [
      { name: 'Visão no Escuro', description: 'Você enxerga na penumbra a até 18 m como se fosse luz plena, e na escuridão como penumbra.' },
      { name: 'Ancestralidade Feérica', description: 'Você tem Vantagem em testes de resistência para evitar ou encerrar a condição Enfeitiçado.' },
      { name: 'Sentidos Aguçados', description: 'Você tem proficiência em Intuição, Percepção ou Sobrevivência (à sua escolha).' },
      { name: 'Transe', description: 'Você não precisa dormir e magia não pode fazê-lo dormir. Você pode terminar um Descanso Longo em 4 horas em meditação, mantendo a consciência.' },
      { name: 'Linhagem Élfica', description: 'Você recebe os benefícios da sua linhagem: um truque no nível 1 e magias adicionais nos níveis 3 e 5, sempre preparadas, conjuráveis uma vez sem espaço de magia por Descanso Longo (e também com espaços).' },
    ],
    lineage: {
      label: 'Linhagem Élfica',
      spellcastingAbilityChoice: ['int', 'wis', 'cha'],
      options: [
        {
          id: 'drow',
          name: 'Drow',
          darkvisionFt: 120,
          description: 'Visão no Escuro de 36 m. Truque Globos de Luz; Fogo das Fadas no nível 3; Escuridão no nível 5.',
          spells: [
            { spellId: 'dancing-lights', level: 1, note: 'Truque' },
            { spellId: 'faerie-fire', level: 3, note: '1x por Descanso Longo sem espaço' },
            { spellId: 'darkness', level: 5, note: '1x por Descanso Longo sem espaço' },
          ],
        },
        {
          id: 'high-elf',
          name: 'Alto Elfo',
          description: 'Truque Prestidigitação (pode trocá-lo por outro truque de Mago ao terminar um Descanso Longo); Detectar Magia no nível 3; Passo Nebuloso no nível 5.',
          spells: [
            { spellId: 'prestidigitation', level: 1, note: 'Truque' },
            { spellId: 'detect-magic', level: 3, note: '1x por Descanso Longo sem espaço' },
            { spellId: 'misty-step', level: 5, note: '1x por Descanso Longo sem espaço' },
          ],
        },
        {
          id: 'wood-elf',
          name: 'Elfo da Floresta',
          speedFt: 35,
          description: 'Deslocamento de 10,5 m. Truque Arte Druídica; Passos Largos no nível 3; Passos sem Rastro no nível 5.',
          spells: [
            { spellId: 'druidcraft', level: 1, note: 'Truque' },
            { spellId: 'longstrider', level: 3, note: '1x por Descanso Longo sem espaço' },
            { spellId: 'pass-without-trace', level: 5, note: '1x por Descanso Longo sem espaço' },
          ],
        },
      ],
    },
  },
  {
    id: 'gnome',
    name: 'Gnomo',
    nameEn: 'Gnome',
    summary: 'Pequenos, curiosos e engenhosos, com afinidade natural por ilusões ou invenções.',
    creatureType: 'Humanoide',
    sizeOptions: ['Pequeno'],
    speedFt: 30,
    darkvisionFt: 60,
    traits: [
      { name: 'Visão no Escuro', description: 'Você enxerga na penumbra a até 18 m como se fosse luz plena, e na escuridão como penumbra.' },
      { name: 'Astúcia Gnômica', description: 'Você tem Vantagem em testes de resistência de Inteligência, Sabedoria e Carisma.' },
      { name: 'Linhagem Gnômica', description: 'Você recebe os benefícios da sua linhagem (Gnomo da Floresta ou Gnomo das Rochas).' },
    ],
    lineage: {
      label: 'Linhagem Gnômica',
      spellcastingAbilityChoice: ['int', 'wis', 'cha'],
      options: [
        {
          id: 'forest-gnome',
          name: 'Gnomo da Floresta',
          description: 'Truque Ilusão Menor. Você sempre tem Falar com Animais preparada e pode conjurá-la sem espaço de magia um número de vezes igual ao seu Bônus de Proficiência por Descanso Longo.',
          spells: [
            { spellId: 'minor-illusion', level: 1, note: 'Truque' },
            { spellId: 'speak-with-animals', level: 1, note: 'BP vezes por Descanso Longo sem espaço' },
          ],
        },
        {
          id: 'rock-gnome',
          name: 'Gnomo das Rochas',
          description: 'Truques Consertar e Prestidigitação. Você pode gastar 10 minutos conjurando Prestidigitação para criar um pequeno aparato mecânico (CA 5, 1 PV), com até três ativos ao mesmo tempo.',
          spells: [
            { spellId: 'mending', level: 1, note: 'Truque' },
            { spellId: 'prestidigitation', level: 1, note: 'Truque' },
          ],
        },
      ],
    },
  },
  {
    id: 'goliath',
    name: 'Golias',
    nameEn: 'Goliath',
    summary: 'Descendentes distantes de gigantes, com força e dádivas sobrenaturais de seus ancestrais.',
    creatureType: 'Humanoide',
    sizeOptions: ['Médio'],
    speedFt: 35,
    traits: [
      { name: 'Ancestralidade Gigante', description: 'Você recebe uma dádiva sobrenatural da sua ancestralidade, utilizável um número de vezes igual ao seu Bônus de Proficiência por Descanso Longo.' },
      { name: 'Forma Grande', level: 5, description: 'Como Ação Bônus, torne-se Grande por 10 minutos (se houver espaço): Vantagem em testes de Força e +3 m de Deslocamento. Uma vez por Descanso Longo.' },
      { name: 'Constituição Poderosa', description: 'Vantagem em testes para encerrar a condição Agarrado. Você conta como um tamanho maior para determinar sua capacidade de carga.' },
    ],
    lineage: {
      label: 'Ancestralidade Gigante',
      options: [
        { id: 'cloud', name: 'Gigante das Nuvens — Salto das Nuvens', description: 'Como Ação Bônus, teletransporte-se até 9 m para um espaço desocupado que possa ver.' },
        { id: 'fire', name: 'Gigante do Fogo — Queimadura do Fogo', description: 'Ao atingir um alvo com jogada de ataque e causar dano, cause 1d10 de dano de Fogo extra.' },
        { id: 'frost', name: 'Gigante do Gelo — Frio do Gelo', description: 'Ao atingir um alvo com jogada de ataque e causar dano, cause 1d6 de dano de Frio extra e reduza o Deslocamento dele em 3 m até o início do seu próximo turno.' },
        { id: 'hill', name: 'Gigante das Colinas — Tombo das Colinas', description: 'Ao atingir uma criatura Grande ou menor com jogada de ataque e causar dano, você pode dar a ela a condição Caído.' },
        { id: 'stone', name: 'Gigante da Pedra — Resistência da Pedra', description: 'Ao sofrer dano, use sua Reação para rolar 1d12 + mod. de Constituição e reduzir o dano nesse total.' },
        { id: 'storm', name: 'Gigante da Tempestade — Trovão da Tempestade', description: 'Ao sofrer dano de uma criatura a até 18 m, use sua Reação para causar 1d8 de dano Trovejante a ela.' },
      ],
    },
  },
  {
    id: 'halfling',
    name: 'Halfling',
    nameEn: 'Halfling',
    summary: 'Pequenos, corajosos e notavelmente sortudos.',
    creatureType: 'Humanoide',
    sizeOptions: ['Pequeno'],
    speedFt: 30,
    traits: [
      { name: 'Corajoso', description: 'Você tem Vantagem em testes de resistência para evitar ou encerrar a condição Amedrontado.' },
      { name: 'Agilidade Halfling', description: 'Você pode atravessar o espaço de qualquer criatura de tamanho maior que o seu, mas não pode parar nele.' },
      { name: 'Sorte', description: 'Quando tirar 1 no d20 de um Teste de D20, você pode rolar o dado novamente e deve usar o novo resultado.' },
      { name: 'Furtividade Natural', description: 'Você pode realizar a ação Esconder mesmo quando estiver obscurecido apenas por uma criatura pelo menos um tamanho maior que você.' },
    ],
  },
  {
    id: 'human',
    name: 'Humano',
    nameEn: 'Human',
    summary: 'Adaptáveis e ambiciosos, encontrados em todos os cantos do multiverso.',
    creatureType: 'Humanoide',
    sizeOptions: ['Médio', 'Pequeno'],
    speedFt: 30,
    skillChoice: { count: 1, options: 'any', label: 'Hábil' },
    bonusOriginFeat: true,
    traits: [
      { name: 'Engenhoso', description: 'Você ganha Inspiração Heroica sempre que termina um Descanso Longo.' },
      { name: 'Hábil', description: 'Você ganha proficiência em uma perícia à sua escolha.' },
      { name: 'Versátil', description: 'Você ganha um talento de Origem à sua escolha.' },
    ],
  },
  {
    id: 'orc',
    name: 'Orc',
    nameEn: 'Orc',
    summary: 'Resistentes e incansáveis, movidos por uma energia que os mantém de pé.',
    creatureType: 'Humanoide',
    sizeOptions: ['Médio'],
    speedFt: 30,
    darkvisionFt: 120,
    traits: [
      { name: 'Surto de Adrenalina', description: 'Você pode realizar a ação Disparada como Ação Bônus. Ao fazer isso, ganha PV Temporários iguais ao seu Bônus de Proficiência. Usos iguais ao Bônus de Proficiência, recuperados em Descanso Curto ou Longo.' },
      { name: 'Visão no Escuro', description: 'Você enxerga na penumbra a até 36 m como se fosse luz plena, e na escuridão como penumbra.' },
      { name: 'Resistência Implacável', description: 'Quando for reduzido a 0 PV sem morrer imediatamente, você pode ficar com 1 PV. Uma vez por Descanso Longo.' },
    ],
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    nameEn: 'Tiefling',
    summary: 'Marcados por um legado dos Planos Inferiores, que se manifesta em resistência e magia.',
    creatureType: 'Humanoide',
    sizeOptions: ['Médio', 'Pequeno'],
    speedFt: 30,
    darkvisionFt: 60,
    spells: [{ spellId: 'thaumaturgy', level: 1, note: 'Truque' }],
    traits: [
      { name: 'Visão no Escuro', description: 'Você enxerga na penumbra a até 18 m como se fosse luz plena, e na escuridão como penumbra.' },
      { name: 'Legado Ínfero', description: 'Você recebe os benefícios do seu legado: uma resistência, um truque no nível 1 e magias nos níveis 3 e 5, sempre preparadas e conjuráveis uma vez sem espaço de magia por Descanso Longo.' },
      { name: 'Presença Sobrenatural', description: 'Você conhece o truque Taumaturgia, usando o mesmo atributo de conjuração do Legado Ínfero.' },
    ],
    lineage: {
      label: 'Legado Ínfero',
      spellcastingAbilityChoice: ['int', 'wis', 'cha'],
      options: [
        {
          id: 'abyssal',
          name: 'Abissal',
          resistance: 'Veneno',
          description: 'Resistência a Veneno. Truque Rajada de Veneno; Raio Adoecente no nível 3; Imobilizar Pessoa no nível 5.',
          spells: [
            { spellId: 'poison-spray', level: 1, note: 'Truque' },
            { spellId: 'ray-of-sickness', level: 3, note: '1x por Descanso Longo sem espaço' },
            { spellId: 'hold-person', level: 5, note: '1x por Descanso Longo sem espaço' },
          ],
        },
        {
          id: 'chthonic',
          name: 'Ctônico',
          resistance: 'Necrótico',
          description: 'Resistência a dano Necrótico. Truque Toque Arrepiante; Vida Falsa no nível 3; Raio Enfraquecedor no nível 5.',
          spells: [
            { spellId: 'chill-touch', level: 1, note: 'Truque' },
            { spellId: 'false-life', level: 3, note: '1x por Descanso Longo sem espaço' },
            { spellId: 'ray-of-enfeeblement', level: 5, note: '1x por Descanso Longo sem espaço' },
          ],
        },
        {
          id: 'infernal',
          name: 'Infernal',
          resistance: 'Fogo',
          description: 'Resistência a Fogo. Truque Raio de Fogo; Repreensão Infernal no nível 3; Escuridão no nível 5.',
          spells: [
            { spellId: 'fire-bolt', level: 1, note: 'Truque' },
            { spellId: 'hellish-rebuke', level: 3, note: '1x por Descanso Longo sem espaço' },
            { spellId: 'darkness', level: 5, note: '1x por Descanso Longo sem espaço' },
          ],
        },
      ],
    },
  },
];

export const SPECIES_BY_ID: Record<string, SpeciesData> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
