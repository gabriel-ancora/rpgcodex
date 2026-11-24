/**
 * Equipamentos do Livro do Jogador 2024 usados no criador de personagem.
 * Pesos em kg (1 lb ≈ 0,5 kg, como na edição brasileira) e preços em PO.
 */

export type ItemKind =
  | 'simple-melee'
  | 'simple-ranged'
  | 'martial-melee'
  | 'martial-ranged'
  | 'light-armor'
  | 'medium-armor'
  | 'heavy-armor'
  | 'shield'
  | 'ammunition'
  | 'focus'
  | 'pack'
  | 'tool'
  | 'instrument'
  | 'gear';

export interface ItemData {
  id: string;
  name: string;
  kind: ItemKind;
  /** custo em PO */
  cost: number;
  weightKg?: number;
  damage?: string;
  properties?: string;
  mastery?: string;
  /** armaduras: CA base, se soma Destreza e limite */
  ac?: { base: number; dex: 'full' | 'max2' | 'none'; strength?: number; stealthDisadvantage?: boolean };
  /** escudo: bônus de CA */
  acBonus?: number;
  description?: string;
}

export const WEAPON_MASTERIES: Record<string, string> = {
  Trespassar: 'Ao atingir uma criatura com um ataque corpo a corpo, você pode fazer outro ataque com a arma contra uma segunda criatura a até 1,5 m da primeira e ao seu alcance. Não soma o modificador de atributo ao dano, exceto se negativo. Uma vez por turno.',
  Raspão: 'Se errar o ataque contra uma criatura, ela sofre dano igual ao modificador de atributo usado no ataque, do mesmo tipo da arma.',
  Ágil: 'Ao fazer o ataque extra da propriedade Leve, você pode fazê-lo como parte da ação Atacar, em vez de Ação Bônus (uma vez por turno).',
  Empurrar: 'Ao atingir, você pode empurrar a criatura até 3 m para longe, se ela for Grande ou menor.',
  Enfraquecer: 'Ao atingir, a criatura tem Desvantagem na próxima jogada de ataque antes do início do seu próximo turno.',
  Lentidão: 'Ao atingir e causar dano, reduza o Deslocamento da criatura em 3 m até o início do seu próximo turno.',
  Derrubar: 'Ao atingir, force a criatura a fazer um teste de Constituição (CD 8 + mod. de atributo + BP); na falha, ela fica Caída.',
  Irritar: 'Ao atingir e causar dano, você tem Vantagem na próxima jogada de ataque contra essa criatura antes do fim do seu próximo turno.',
};

export const ITEMS: ItemData[] = [
  // ---------------------------------------------------- Armas simples (corpo a corpo)
  { id: 'club', name: 'Clava', kind: 'simple-melee', cost: 0.1, weightKg: 1, damage: '1d4 Contundente', properties: 'Leve', mastery: 'Lentidão' },
  { id: 'dagger', name: 'Adaga', kind: 'simple-melee', cost: 2, weightKg: 0.5, damage: '1d4 Perfurante', properties: 'Acuidade, Leve, Arremesso (6/18 m)', mastery: 'Ágil' },
  { id: 'greatclub', name: 'Clava Grande', kind: 'simple-melee', cost: 0.2, weightKg: 5, damage: '1d8 Contundente', properties: 'Duas Mãos', mastery: 'Empurrar' },
  { id: 'handaxe', name: 'Machadinha', kind: 'simple-melee', cost: 5, weightKg: 1, damage: '1d6 Cortante', properties: 'Leve, Arremesso (6/18 m)', mastery: 'Irritar' },
  { id: 'javelin', name: 'Azagaia', kind: 'simple-melee', cost: 0.5, weightKg: 1, damage: '1d6 Perfurante', properties: 'Arremesso (9/36 m)', mastery: 'Lentidão' },
  { id: 'light-hammer', name: 'Martelo Leve', kind: 'simple-melee', cost: 2, weightKg: 1, damage: '1d4 Contundente', properties: 'Leve, Arremesso (6/18 m)', mastery: 'Ágil' },
  { id: 'mace', name: 'Maça', kind: 'simple-melee', cost: 5, weightKg: 2, damage: '1d6 Contundente', mastery: 'Enfraquecer' },
  { id: 'quarterstaff', name: 'Bordão', kind: 'simple-melee', cost: 0.2, weightKg: 2, damage: '1d6 Contundente', properties: 'Versátil (1d8)', mastery: 'Derrubar' },
  { id: 'sickle', name: 'Foice Curta', kind: 'simple-melee', cost: 1, weightKg: 1, damage: '1d4 Cortante', properties: 'Leve', mastery: 'Ágil' },
  { id: 'spear', name: 'Lança', kind: 'simple-melee', cost: 1, weightKg: 1.5, damage: '1d6 Perfurante', properties: 'Arremesso (6/18 m), Versátil (1d8)', mastery: 'Enfraquecer' },
  // ---------------------------------------------------- Armas simples (distância)
  { id: 'dart', name: 'Dardo', kind: 'simple-ranged', cost: 0.05, weightKg: 0.1, damage: '1d4 Perfurante', properties: 'Acuidade, Arremesso (6/18 m)', mastery: 'Irritar' },
  { id: 'light-crossbow', name: 'Besta Leve', kind: 'simple-ranged', cost: 25, weightKg: 2.5, damage: '1d8 Perfurante', properties: 'Munição (24/96 m; Virote), Recarga, Duas Mãos', mastery: 'Lentidão' },
  { id: 'shortbow', name: 'Arco Curto', kind: 'simple-ranged', cost: 25, weightKg: 1, damage: '1d6 Perfurante', properties: 'Munição (24/96 m; Flecha), Duas Mãos', mastery: 'Irritar' },
  { id: 'sling', name: 'Funda', kind: 'simple-ranged', cost: 0.1, damage: '1d4 Contundente', properties: 'Munição (9/36 m; Bala de Funda)', mastery: 'Lentidão' },
  // ---------------------------------------------------- Armas marciais (corpo a corpo)
  { id: 'battleaxe', name: 'Machado de Batalha', kind: 'martial-melee', cost: 10, weightKg: 2, damage: '1d8 Cortante', properties: 'Versátil (1d10)', mastery: 'Derrubar' },
  { id: 'flail', name: 'Mangual', kind: 'martial-melee', cost: 10, weightKg: 1, damage: '1d8 Contundente', mastery: 'Enfraquecer' },
  { id: 'glaive', name: 'Glaive', kind: 'martial-melee', cost: 20, weightKg: 3, damage: '1d10 Cortante', properties: 'Pesada, Alcance, Duas Mãos', mastery: 'Raspão' },
  { id: 'greataxe', name: 'Machado Grande', kind: 'martial-melee', cost: 30, weightKg: 3.5, damage: '1d12 Cortante', properties: 'Pesada, Duas Mãos', mastery: 'Trespassar' },
  { id: 'greatsword', name: 'Espada Grande', kind: 'martial-melee', cost: 50, weightKg: 3, damage: '2d6 Cortante', properties: 'Pesada, Duas Mãos', mastery: 'Raspão' },
  { id: 'halberd', name: 'Alabarda', kind: 'martial-melee', cost: 20, weightKg: 3, damage: '1d10 Cortante', properties: 'Pesada, Alcance, Duas Mãos', mastery: 'Trespassar' },
  { id: 'lance', name: 'Lança de Montaria', kind: 'martial-melee', cost: 10, weightKg: 3, damage: '1d10 Perfurante', properties: 'Pesada, Alcance, Duas Mãos (exceto montado)', mastery: 'Derrubar' },
  { id: 'longsword', name: 'Espada Longa', kind: 'martial-melee', cost: 15, weightKg: 1.5, damage: '1d8 Cortante', properties: 'Versátil (1d10)', mastery: 'Enfraquecer' },
  { id: 'maul', name: 'Malho', kind: 'martial-melee', cost: 10, weightKg: 5, damage: '2d6 Contundente', properties: 'Pesada, Duas Mãos', mastery: 'Derrubar' },
  { id: 'morningstar', name: 'Maça Estrela', kind: 'martial-melee', cost: 15, weightKg: 2, damage: '1d8 Perfurante', mastery: 'Enfraquecer' },
  { id: 'pike', name: 'Pique', kind: 'martial-melee', cost: 5, weightKg: 9, damage: '1d10 Perfurante', properties: 'Pesada, Alcance, Duas Mãos', mastery: 'Empurrar' },
  { id: 'rapier', name: 'Rapieira', kind: 'martial-melee', cost: 25, weightKg: 1, damage: '1d8 Perfurante', properties: 'Acuidade', mastery: 'Irritar' },
  { id: 'scimitar', name: 'Cimitarra', kind: 'martial-melee', cost: 25, weightKg: 1.5, damage: '1d6 Cortante', properties: 'Acuidade, Leve', mastery: 'Ágil' },
  { id: 'shortsword', name: 'Espada Curta', kind: 'martial-melee', cost: 10, weightKg: 1, damage: '1d6 Perfurante', properties: 'Acuidade, Leve', mastery: 'Irritar' },
  { id: 'trident', name: 'Tridente', kind: 'martial-melee', cost: 5, weightKg: 2, damage: '1d8 Perfurante', properties: 'Arremesso (6/18 m), Versátil (1d10)', mastery: 'Derrubar' },
  { id: 'warhammer', name: 'Martelo de Guerra', kind: 'martial-melee', cost: 15, weightKg: 2.5, damage: '1d8 Contundente', properties: 'Versátil (1d10)', mastery: 'Empurrar' },
  { id: 'war-pick', name: 'Picareta de Guerra', kind: 'martial-melee', cost: 5, weightKg: 1, damage: '1d8 Perfurante', properties: 'Versátil (1d10)', mastery: 'Enfraquecer' },
  { id: 'whip', name: 'Chicote', kind: 'martial-melee', cost: 2, weightKg: 1.5, damage: '1d4 Cortante', properties: 'Acuidade, Alcance', mastery: 'Lentidão' },
  // ---------------------------------------------------- Armas marciais (distância)
  { id: 'blowgun', name: 'Zarabatana', kind: 'martial-ranged', cost: 10, weightKg: 0.5, damage: '1 Perfurante', properties: 'Munição (7,5/30 m; Agulha), Recarga', mastery: 'Irritar' },
  { id: 'hand-crossbow', name: 'Besta de Mão', kind: 'martial-ranged', cost: 75, weightKg: 1.5, damage: '1d6 Perfurante', properties: 'Munição (9/36 m; Virote), Leve, Recarga', mastery: 'Irritar' },
  { id: 'heavy-crossbow', name: 'Besta Pesada', kind: 'martial-ranged', cost: 50, weightKg: 9, damage: '1d10 Perfurante', properties: 'Munição (30/120 m; Virote), Pesada, Recarga, Duas Mãos', mastery: 'Empurrar' },
  { id: 'longbow', name: 'Arco Longo', kind: 'martial-ranged', cost: 50, weightKg: 1, damage: '1d8 Perfurante', properties: 'Munição (45/180 m; Flecha), Pesada, Duas Mãos', mastery: 'Lentidão' },
  { id: 'musket', name: 'Mosquete', kind: 'martial-ranged', cost: 500, weightKg: 5, damage: '1d12 Perfurante', properties: 'Munição (12/36 m; Bala), Recarga, Duas Mãos', mastery: 'Lentidão' },
  { id: 'pistol', name: 'Pistola', kind: 'martial-ranged', cost: 250, weightKg: 1.5, damage: '1d10 Perfurante', properties: 'Munição (9/27 m; Bala), Recarga', mastery: 'Irritar' },
  // ---------------------------------------------------- Armaduras
  { id: 'padded-armor', name: 'Armadura Acolchoada', kind: 'light-armor', cost: 5, weightKg: 4, ac: { base: 11, dex: 'full', stealthDisadvantage: true } },
  { id: 'leather-armor', name: 'Armadura de Couro', kind: 'light-armor', cost: 10, weightKg: 5, ac: { base: 11, dex: 'full' } },
  { id: 'studded-leather-armor', name: 'Armadura de Couro Batido', kind: 'light-armor', cost: 45, weightKg: 6.5, ac: { base: 12, dex: 'full' } },
  { id: 'hide-armor', name: 'Armadura de Peles', kind: 'medium-armor', cost: 10, weightKg: 6, ac: { base: 12, dex: 'max2' } },
  { id: 'chain-shirt', name: 'Camisão de Malha', kind: 'medium-armor', cost: 50, weightKg: 10, ac: { base: 13, dex: 'max2' } },
  { id: 'scale-mail', name: 'Brunea', kind: 'medium-armor', cost: 50, weightKg: 22.5, ac: { base: 14, dex: 'max2', stealthDisadvantage: true } },
  { id: 'breastplate', name: 'Peitoral', kind: 'medium-armor', cost: 400, weightKg: 10, ac: { base: 14, dex: 'max2' } },
  { id: 'half-plate-armor', name: 'Meia-Armadura', kind: 'medium-armor', cost: 750, weightKg: 20, ac: { base: 15, dex: 'max2', stealthDisadvantage: true } },
  { id: 'ring-mail', name: 'Cota de Anéis', kind: 'heavy-armor', cost: 30, weightKg: 20, ac: { base: 14, dex: 'none', stealthDisadvantage: true } },
  { id: 'chain-mail', name: 'Cota de Malha', kind: 'heavy-armor', cost: 75, weightKg: 27.5, ac: { base: 16, dex: 'none', strength: 13, stealthDisadvantage: true } },
  { id: 'splint-armor', name: 'Armadura de Talas', kind: 'heavy-armor', cost: 200, weightKg: 30, ac: { base: 17, dex: 'none', strength: 15, stealthDisadvantage: true } },
  { id: 'plate-armor', name: 'Armadura de Placas', kind: 'heavy-armor', cost: 1500, weightKg: 32.5, ac: { base: 18, dex: 'none', strength: 15, stealthDisadvantage: true } },
  { id: 'shield', name: 'Escudo', kind: 'shield', cost: 10, weightKg: 3, acBonus: 2 },
  // ---------------------------------------------------- Munição
  { id: 'arrows', name: 'Flechas (20)', kind: 'ammunition', cost: 1, weightKg: 0.5 },
  { id: 'bolts', name: 'Virotes (20)', kind: 'ammunition', cost: 1, weightKg: 0.75 },
  { id: 'sling-bullets', name: 'Balas de Funda (20)', kind: 'ammunition', cost: 0.04, weightKg: 0.75 },
  { id: 'needles', name: 'Agulhas (50)', kind: 'ammunition', cost: 1, weightKg: 0.5 },
  { id: 'quiver', name: 'Aljava', kind: 'gear', cost: 1, weightKg: 0.5, description: 'Comporta até 20 flechas.' },
  // ---------------------------------------------------- Focos
  { id: 'arcane-focus-crystal', name: 'Foco Arcano (Cristal)', kind: 'focus', cost: 10, weightKg: 0.5 },
  { id: 'arcane-focus-orb', name: 'Foco Arcano (Orbe)', kind: 'focus', cost: 20, weightKg: 1.5 },
  { id: 'arcane-focus-rod', name: 'Foco Arcano (Cetro)', kind: 'focus', cost: 10, weightKg: 1 },
  { id: 'arcane-focus-staff', name: 'Foco Arcano (Cajado)', kind: 'focus', cost: 5, weightKg: 2, description: 'Pode ser usado como Bordão.' },
  { id: 'arcane-focus-wand', name: 'Foco Arcano (Varinha)', kind: 'focus', cost: 10, weightKg: 0.5 },
  { id: 'druidic-focus-mistletoe', name: 'Foco Druídico (Ramo de Visco)', kind: 'focus', cost: 1 },
  { id: 'druidic-focus-staff', name: 'Foco Druídico (Cajado de Madeira)', kind: 'focus', cost: 5, weightKg: 2, description: 'Pode ser usado como Bordão.' },
  { id: 'druidic-focus-wand', name: 'Foco Druídico (Varinha de Teixo)', kind: 'focus', cost: 10, weightKg: 0.5 },
  { id: 'holy-symbol-amulet', name: 'Símbolo Sagrado (Amuleto)', kind: 'focus', cost: 5, weightKg: 0.5 },
  { id: 'holy-symbol-emblem', name: 'Símbolo Sagrado (Emblema)', kind: 'focus', cost: 5, description: 'Gravado ou incrustado em um Escudo.' },
  { id: 'holy-symbol-reliquary', name: 'Símbolo Sagrado (Relicário)', kind: 'focus', cost: 5, weightKg: 1 },
  // ---------------------------------------------------- Pacotes
  { id: 'burglars-pack', name: 'Pacote de Assaltante', kind: 'pack', cost: 16, weightKg: 21, description: 'Mochila, saco de esferas, sino, 10 velas, pé de cabra, lanterna coberta, 7 frascos de óleo, 5 dias de rações, corda, caixa de fogo e cantil.' },
  { id: 'diplomats-pack', name: 'Pacote de Diplomata', kind: 'pack', cost: 39, weightKg: 19.5, description: 'Baú, roupas finas, tinta, caneta, lâmpada, 2 estojos de mapa ou pergaminho, 4 frascos de óleo, 5 folhas de papel, 5 folhas de pergaminho, perfume e caixa de fogo.' },
  { id: 'dungeoneers-pack', name: 'Pacote de Aventureiro', kind: 'pack', cost: 12, weightKg: 27.5, description: 'Mochila, estrepes, pé de cabra, 2 frascos de óleo, 10 dias de rações, corda, caixa de fogo, 10 tochas e cantil.' },
  { id: 'entertainers-pack', name: 'Pacote de Artista', kind: 'pack', cost: 40, weightKg: 29, description: 'Mochila, saco de dormir, sino, lanterna com anteparo, 3 fantasias, espelho, 8 frascos de óleo, 9 dias de rações, caixa de fogo e cantil.' },
  { id: 'explorers-pack', name: 'Pacote de Explorador', kind: 'pack', cost: 10, weightKg: 27.5, description: 'Mochila, saco de dormir, 2 frascos de óleo, 10 dias de rações, corda, caixa de fogo, 10 tochas e cantil.' },
  { id: 'priests-pack', name: 'Pacote de Sacerdote', kind: 'pack', cost: 33, weightKg: 14.5, description: 'Mochila, cobertor, água benta, lâmpada, 7 dias de rações, túnica e caixa de fogo.' },
  { id: 'scholars-pack', name: 'Pacote de Estudioso', kind: 'pack', cost: 40, weightKg: 11, description: 'Mochila, livro de conhecimento, tinta, caneta, lâmpada, 10 frascos de óleo, 10 folhas de pergaminho e caixa de fogo.' },
  // ---------------------------------------------------- Ferramentas e instrumentos
  { id: 'thieves-tools', name: 'Ferramentas de Ladrão', kind: 'tool', cost: 25, weightKg: 0.5 },
  { id: 'herbalism-kit', name: 'Kit de Herbalismo', kind: 'tool', cost: 5, weightKg: 1.5 },
  { id: 'calligraphers-supplies', name: 'Suprimentos de Calígrafo', kind: 'tool', cost: 10, weightKg: 2.5 },
  { id: 'carpenters-tools', name: 'Ferramentas de Carpinteiro', kind: 'tool', cost: 8, weightKg: 3 },
  { id: 'cartographers-tools', name: 'Ferramentas de Cartógrafo', kind: 'tool', cost: 15, weightKg: 3 },
  { id: 'forgery-kit', name: 'Kit de Falsificação', kind: 'tool', cost: 15, weightKg: 2.5 },
  { id: 'navigators-tools', name: 'Ferramentas de Navegador', kind: 'tool', cost: 25, weightKg: 1 },
  { id: 'disguise-kit', name: 'Kit de Disfarce', kind: 'tool', cost: 25, weightKg: 1.5 },
  { id: 'poisoners-kit', name: 'Kit de Venenos', kind: 'tool', cost: 50, weightKg: 1 },
  { id: 'artisans-tools', name: 'Ferramentas de Artesão (à escolha)', kind: 'tool', cost: 10, weightKg: 2.5 },
  { id: 'gaming-set', name: 'Jogo (à escolha)', kind: 'tool', cost: 1 },
  { id: 'musical-instrument', name: 'Instrumento Musical (à escolha)', kind: 'instrument', cost: 30, weightKg: 1.5 },
  { id: 'lute', name: 'Alaúde', kind: 'instrument', cost: 35, weightKg: 1 },
  // ---------------------------------------------------- Equipamento de aventura
  { id: 'spellbook', name: 'Grimório', kind: 'gear', cost: 50, weightKg: 1.5 },
  { id: 'book', name: 'Livro', kind: 'gear', cost: 25, weightKg: 2.5 },
  { id: 'parchment', name: 'Pergaminho (folha)', kind: 'gear', cost: 0.1 },
  { id: 'robe', name: 'Túnica', kind: 'gear', cost: 1, weightKg: 2 },
  { id: 'costume', name: 'Fantasia', kind: 'gear', cost: 5, weightKg: 2 },
  { id: 'fine-clothes', name: 'Roupas Finas', kind: 'gear', cost: 15, weightKg: 3 },
  { id: 'travelers-clothes', name: 'Roupas de Viajante', kind: 'gear', cost: 2, weightKg: 2 },
  { id: 'mirror', name: 'Espelho', kind: 'gear', cost: 5, weightKg: 0.25 },
  { id: 'perfume', name: 'Perfume', kind: 'gear', cost: 5 },
  { id: 'pouch', name: 'Algibeira', kind: 'gear', cost: 0.5, weightKg: 0.5 },
  { id: 'crowbar', name: 'Pé de Cabra', kind: 'gear', cost: 2, weightKg: 2.5 },
  { id: 'healers-kit', name: 'Kit de Curandeiro', kind: 'gear', cost: 5, weightKg: 1.5, description: '10 usos. Estabiliza uma criatura com 0 PV sem teste de Medicina.' },
  { id: 'iron-pot', name: 'Panela de Ferro', kind: 'gear', cost: 2, weightKg: 5 },
  { id: 'shovel', name: 'Pá', kind: 'gear', cost: 2, weightKg: 2.5 },
  { id: 'hooded-lantern', name: 'Lanterna Coberta', kind: 'gear', cost: 5, weightKg: 1 },
  { id: 'manacles', name: 'Algemas', kind: 'gear', cost: 2, weightKg: 3 },
  { id: 'bedroll', name: 'Saco de Dormir', kind: 'gear', cost: 1, weightKg: 3.5 },
  { id: 'tent', name: 'Tenda', kind: 'gear', cost: 2, weightKg: 10 },
  { id: 'lamp', name: 'Lâmpada', kind: 'gear', cost: 0.5, weightKg: 0.5 },
  { id: 'oil', name: 'Óleo (frasco)', kind: 'gear', cost: 0.1, weightKg: 0.5 },
  { id: 'rope', name: 'Corda (15 m)', kind: 'gear', cost: 1, weightKg: 2.5 },
  { id: 'potion-of-healing', name: 'Poção de Cura', kind: 'gear', cost: 50, weightKg: 0.25, description: 'Recupera 2d4 + 2 PV.' },
  { id: 'component-pouch', name: 'Bolsa de Componentes', kind: 'focus', cost: 25, weightKg: 1 },
];

export const ITEMS_BY_ID: Record<string, ItemData> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  'simple-melee': 'Arma Simples Corpo a Corpo',
  'simple-ranged': 'Arma Simples à Distância',
  'martial-melee': 'Arma Marcial Corpo a Corpo',
  'martial-ranged': 'Arma Marcial à Distância',
  'light-armor': 'Armadura Leve',
  'medium-armor': 'Armadura Média',
  'heavy-armor': 'Armadura Pesada',
  shield: 'Escudo',
  ammunition: 'Munição',
  focus: 'Foco de Conjuração',
  pack: 'Pacote',
  tool: 'Ferramenta',
  instrument: 'Instrumento Musical',
  gear: 'Equipamento de Aventura',
};

export function isWeapon(item: ItemData) {
  return item.kind.endsWith('-melee') || item.kind.endsWith('-ranged');
}

export function isArmor(item: ItemData) {
  return item.kind.endsWith('-armor');
}

export interface EquipmentLine {
  itemId: string;
  quantity?: number;
  /** nome alternativo (ex.: "Livro de Orações") */
  label?: string;
}

export interface StartingEquipmentOption {
  id: string;
  label: string;
  items: EquipmentLine[];
  gold: number;
}

/** Equipamento inicial das classes (Livro do Jogador 2024). */
export const CLASS_STARTING_EQUIPMENT: Record<string, StartingEquipmentOption[]> = {
  barbarian: [
    { id: 'A', label: 'Opção A', gold: 15, items: [{ itemId: 'greataxe' }, { itemId: 'handaxe', quantity: 4 }, { itemId: 'explorers-pack' }] },
    { id: 'B', label: 'Opção B', gold: 75, items: [] },
  ],
  bard: [
    { id: 'A', label: 'Opção A', gold: 19, items: [{ itemId: 'leather-armor' }, { itemId: 'dagger', quantity: 2 }, { itemId: 'musical-instrument', label: 'Instrumento Musical (à escolha)' }, { itemId: 'entertainers-pack' }] },
    { id: 'B', label: 'Opção B', gold: 90, items: [] },
  ],
  cleric: [
    { id: 'A', label: 'Opção A', gold: 7, items: [{ itemId: 'chain-shirt' }, { itemId: 'shield' }, { itemId: 'mace' }, { itemId: 'holy-symbol-amulet' }, { itemId: 'priests-pack' }] },
    { id: 'B', label: 'Opção B', gold: 110, items: [] },
  ],
  druid: [
    { id: 'A', label: 'Opção A', gold: 9, items: [{ itemId: 'leather-armor' }, { itemId: 'shield' }, { itemId: 'sickle' }, { itemId: 'druidic-focus-staff' }, { itemId: 'explorers-pack' }, { itemId: 'herbalism-kit' }] },
    { id: 'B', label: 'Opção B', gold: 50, items: [] },
  ],
  fighter: [
    { id: 'A', label: 'Opção A', gold: 4, items: [{ itemId: 'chain-mail' }, { itemId: 'greatsword' }, { itemId: 'flail' }, { itemId: 'javelin', quantity: 8 }, { itemId: 'dungeoneers-pack' }] },
    { id: 'B', label: 'Opção B', gold: 11, items: [{ itemId: 'studded-leather-armor' }, { itemId: 'scimitar' }, { itemId: 'shortsword' }, { itemId: 'longbow' }, { itemId: 'arrows' }, { itemId: 'quiver' }, { itemId: 'dungeoneers-pack' }] },
    { id: 'C', label: 'Opção C', gold: 155, items: [] },
  ],
  monk: [
    { id: 'A', label: 'Opção A', gold: 11, items: [{ itemId: 'spear' }, { itemId: 'dagger', quantity: 5 }, { itemId: 'artisans-tools', label: 'Ferramentas de Artesão ou Instrumento Musical (o mesmo da proficiência)' }, { itemId: 'explorers-pack' }] },
    { id: 'B', label: 'Opção B', gold: 50, items: [] },
  ],
  paladin: [
    { id: 'A', label: 'Opção A', gold: 9, items: [{ itemId: 'chain-mail' }, { itemId: 'shield' }, { itemId: 'longsword' }, { itemId: 'javelin', quantity: 6 }, { itemId: 'holy-symbol-amulet' }, { itemId: 'priests-pack' }] },
    { id: 'B', label: 'Opção B', gold: 150, items: [] },
  ],
  ranger: [
    { id: 'A', label: 'Opção A', gold: 7, items: [{ itemId: 'studded-leather-armor' }, { itemId: 'scimitar' }, { itemId: 'shortsword' }, { itemId: 'longbow' }, { itemId: 'arrows' }, { itemId: 'quiver' }, { itemId: 'druidic-focus-mistletoe' }, { itemId: 'explorers-pack' }] },
    { id: 'B', label: 'Opção B', gold: 150, items: [] },
  ],
  rogue: [
    { id: 'A', label: 'Opção A', gold: 8, items: [{ itemId: 'leather-armor' }, { itemId: 'dagger', quantity: 2 }, { itemId: 'shortsword' }, { itemId: 'shortbow' }, { itemId: 'arrows' }, { itemId: 'quiver' }, { itemId: 'thieves-tools' }, { itemId: 'burglars-pack' }] },
    { id: 'B', label: 'Opção B', gold: 100, items: [] },
  ],
  sorcerer: [
    { id: 'A', label: 'Opção A', gold: 28, items: [{ itemId: 'spear' }, { itemId: 'dagger', quantity: 2 }, { itemId: 'arcane-focus-crystal' }, { itemId: 'dungeoneers-pack' }] },
    { id: 'B', label: 'Opção B', gold: 50, items: [] },
  ],
  warlock: [
    { id: 'A', label: 'Opção A', gold: 15, items: [{ itemId: 'leather-armor' }, { itemId: 'sickle' }, { itemId: 'dagger', quantity: 2 }, { itemId: 'arcane-focus-orb' }, { itemId: 'book', label: 'Livro (conhecimento oculto)' }, { itemId: 'scholars-pack' }] },
    { id: 'B', label: 'Opção B', gold: 100, items: [] },
  ],
  wizard: [
    { id: 'A', label: 'Opção A', gold: 5, items: [{ itemId: 'dagger', quantity: 2 }, { itemId: 'arcane-focus-staff' }, { itemId: 'robe' }, { itemId: 'spellbook' }, { itemId: 'scholars-pack' }] },
    { id: 'B', label: 'Opção B', gold: 55, items: [] },
  ],
};

/** Descrição curta de uma opção de equipamento, para exibição. */
export function describeEquipmentOption(opt: StartingEquipmentOption): string {
  const parts = opt.items.map((l) => {
    const item = ITEMS_BY_ID[l.itemId];
    const name = l.label || item?.name || l.itemId;
    return l.quantity && l.quantity > 1 ? `${l.quantity} × ${name}` : name;
  });
  parts.push(`${opt.gold} PO`);
  return parts.join(', ');
}
