import type { Ability, SkillId } from './types';

export type FeatCategory = 'origin' | 'general' | 'fighting-style' | 'epic-boon';

/** Efeitos mecânicos que o motor aplica automaticamente. */
export interface FeatEffects {
  /** escolha de perícias (proficiência; vira Especialização se já for proficiente, quando indicado) */
  skillChoice?: { count: number; options?: SkillId[]; expertiseIfProficient?: boolean };
  /** escolha de perícias proficientes para Especialização */
  expertiseChoice?: number;
  /** proficiência em todas as perícias (Dádiva da Perícia) */
  allSkills?: boolean;
  /** escolha de ferramentas/instrumentos */
  toolChoice?: { count: number; kind: 'artisan' | 'instrument' | 'any' };
  tools?: string[];
  armorTraining?: string[];
  weaponProficiencies?: string[];
  speedFt?: number;
  hpFlat?: number;
  /** magias sempre preparadas */
  spells?: string[];
  /** escolha de uma magia de 1º círculo de certas escolas */
  spellChoice?: { level: number; schools: string[] };
  /** truques escolhidos de uma lista (Guerreiro Abençoado / Druídico) */
  cantripChoice?: { count: number; list: 'cleric' | 'druid' };
}

export interface FeatData {
  id: string;
  name: string;
  nameEn: string;
  category: FeatCategory;
  prerequisite?: string;
  /** atributos que podem receber +1 (talentos gerais/épicos) */
  abilityIncrease?: Ability[];
  /** pode ser escolhido mais de uma vez */
  repeatable?: boolean;
  description: string;
  effects?: FeatEffects;
  /** classes que podem escolher (Estilos de Luta exclusivos) */
  classes?: string[];
}

const ALL: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const FEATS: FeatData[] = [
  // ------------------------------------------------------------------ Origem
  {
    id: 'alert',
    name: 'Alerta',
    nameEn: 'Alert',
    category: 'origin',
    description:
      'Proficiência em Iniciativa: ao rolar Iniciativa, some seu Bônus de Proficiência. Troca de Iniciativa: logo após rolar Iniciativa, você pode trocar sua Iniciativa com a de um aliado voluntário no mesmo combate (nenhum dos dois pode estar Incapacitado).',
  },
  {
    id: 'crafter',
    name: 'Artesão',
    nameEn: 'Crafter',
    category: 'origin',
    effects: { toolChoice: { count: 3, kind: 'artisan' } },
    description:
      'Proficiência com três Ferramentas de Artesão à sua escolha. Desconto: ao comprar um item não mágico, você recebe 20% de desconto. Fabricação Rápida: ao terminar um Descanso Longo, você pode fabricar um item da lista de Fabricação Rápida de uma ferramenta em que é proficiente; o item dura até o fim do próximo Descanso Longo.',
  },
  {
    id: 'healer',
    name: 'Curandeiro',
    nameEn: 'Healer',
    category: 'origin',
    description:
      'Médico de Batalha: com um Kit de Curandeiro, você pode usar a ação Usar Objeto e gastar um uso do kit para que uma criatura a até 1,5 m gaste um de seus Dados de Vida; ela recupera PV iguais ao resultado mais o seu Bônus de Proficiência. Rolagens de Cura: sempre que rolar dados para curar PV com uma magia ou com este talento, você pode rolar novamente os dados que resultarem em 1, usando o novo resultado.',
  },
  {
    id: 'lucky',
    name: 'Sortudo',
    nameEn: 'Lucky',
    category: 'origin',
    description:
      'Você tem Pontos de Sorte iguais ao seu Bônus de Proficiência, recuperados em um Descanso Longo. Vantagem: ao rolar um d20 para um Teste de D20, gaste 1 Ponto de Sorte para ter Vantagem. Desvantagem: quando uma criatura rolar um d20 para uma jogada de ataque contra você, gaste 1 Ponto de Sorte para impor Desvantagem.',
  },
  {
    id: 'magic-initiate',
    name: 'Iniciado em Magia',
    nameEn: 'Magic Initiate',
    category: 'origin',
    repeatable: true,
    description:
      'Escolha a lista de magias de Clérigo, Druida ou Mago. Você aprende dois truques dessa lista e uma magia de 1º círculo dela, que fica sempre preparada. Você pode conjurar essa magia uma vez sem gastar espaço de magia (recupera em Descanso Longo) e também com quaisquer espaços que tenha. Escolha Inteligência, Sabedoria ou Carisma como atributo de conjuração dessas magias. Ao subir de nível, você pode trocar uma das magias escolhidas por outra do mesmo círculo e lista. Pode ser escolhido mais de uma vez, com uma lista diferente a cada vez.',
  },
  {
    id: 'musician',
    name: 'Músico',
    nameEn: 'Musician',
    category: 'origin',
    effects: { toolChoice: { count: 3, kind: 'instrument' } },
    description:
      'Proficiência com três instrumentos musicais à sua escolha. Canção Encorajadora: ao terminar um Descanso Curto ou Longo, você pode tocar uma canção com um instrumento em que é proficiente e conceder Inspiração Heroica a aliados que a ouçam, em número igual ao seu Bônus de Proficiência.',
  },
  {
    id: 'savage-attacker',
    name: 'Atacante Selvagem',
    nameEn: 'Savage Attacker',
    category: 'origin',
    description:
      'Uma vez por turno, ao atingir um alvo com uma arma, você pode rolar os dados de dano da arma duas vezes e usar qualquer um dos resultados.',
  },
  {
    id: 'skilled',
    name: 'Habilidoso',
    nameEn: 'Skilled',
    category: 'origin',
    repeatable: true,
    description:
      'Você ganha proficiência em qualquer combinação de três perícias ou ferramentas à sua escolha. Pode ser escolhido mais de uma vez.',
  },
  {
    id: 'tavern-brawler',
    name: 'Brigão de Taverna',
    nameEn: 'Tavern Brawler',
    category: 'origin',
    description:
      'Ataque Desarmado Aprimorado: seu Ataque Desarmado causa 1d4 + modificador de Força de dano Contundente. Rolagens de Dano: ao rolar dano do Ataque Desarmado, você pode rolar novamente resultados 1. Armas Improvisadas: você tem proficiência com armas improvisadas. Empurrão: ao atingir uma criatura com Ataque Desarmado como parte da ação Atacar, uma vez por turno você pode empurrá-la 1,5 m para longe, além do dano.',
  },
  {
    id: 'tough',
    name: 'Robusto',
    nameEn: 'Tough',
    category: 'origin',
    description:
      'Seu máximo de Pontos de Vida aumenta em um valor igual ao dobro do seu nível de personagem quando você ganha este talento. Sempre que ganhar um nível de personagem depois disso, seu máximo de PV aumenta em mais 2.',
  },

  // --------------------------------------------------------- Estilo de Luta
  {
    id: 'archery',
    name: 'Arquearia',
    nameEn: 'Archery',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description: 'Você recebe +2 de bônus nas jogadas de ataque feitas com Armas à Distância.',
  },
  {
    id: 'blind-fighting',
    name: 'Combate às Cegas',
    nameEn: 'Blind Fighting',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description: 'Você tem Percepção às Cegas com alcance de 3 metros.',
  },
  {
    id: 'defense',
    name: 'Defesa',
    nameEn: 'Defense',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description: 'Enquanto estiver usando armadura Leve, Média ou Pesada, você recebe +1 de bônus na Classe de Armadura.',
  },
  {
    id: 'dueling',
    name: 'Duelismo',
    nameEn: 'Dueling',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description:
      'Quando estiver empunhando uma Arma Corpo a Corpo em uma mão e nenhuma outra arma, você recebe +2 de bônus nas jogadas de dano com essa arma.',
  },
  {
    id: 'great-weapon-fighting',
    name: 'Combate com Armas Grandes',
    nameEn: 'Great Weapon Fighting',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description:
      'Ao rolar dano de um ataque com Arma Corpo a Corpo empunhada com as duas mãos, você pode tratar qualquer 1 ou 2 nos dados de dano como 3. A arma deve ter a propriedade Duas Mãos ou Versátil.',
  },
  {
    id: 'interception',
    name: 'Interceptação',
    nameEn: 'Interception',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description:
      'Quando uma criatura que você possa ver atingir outra criatura a até 1,5 m de você, você pode usar sua Reação para reduzir o dano em 1d10 + seu Bônus de Proficiência. Você precisa estar empunhando um Escudo ou uma Arma Simples ou Marcial.',
  },
  {
    id: 'protection',
    name: 'Proteção',
    nameEn: 'Protection',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description:
      'Quando uma criatura que você possa ver atacar um alvo diferente de você a até 1,5 m, você pode usar sua Reação para impor Desvantagem nessa jogada de ataque e nas demais jogadas de ataque contra o alvo até o início do seu próximo turno, desde que continue a até 1,5 m dele. Você precisa estar empunhando um Escudo.',
  },
  {
    id: 'thrown-weapon-fighting',
    name: 'Combate com Armas de Arremesso',
    nameEn: 'Thrown Weapon Fighting',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description:
      'Ao atingir com um ataque à distância usando uma arma com a propriedade Arremesso, você recebe +2 de bônus na jogada de dano. Você pode sacar a arma como parte do ataque.',
  },
  {
    id: 'two-weapon-fighting',
    name: 'Combate com Duas Armas',
    nameEn: 'Two-Weapon Fighting',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description:
      'Ao fazer um ataque extra por ter atacado com uma arma com a propriedade Leve, você pode somar o modificador de atributo ao dano desse ataque, se ainda não estiver somando.',
  },
  {
    id: 'unarmed-fighting',
    name: 'Combate Desarmado',
    nameEn: 'Unarmed Fighting',
    category: 'fighting-style',
    prerequisite: 'Característica Estilo de Luta',
    description:
      'Seu Ataque Desarmado causa 1d6 + modificador de Força de dano Contundente, ou 1d8 se você não estiver empunhando armas nem Escudo. No início de cada turno seu, você pode causar 1d4 de dano Contundente a uma criatura que esteja Agarrada por você.',
  },

  {
    id: 'blessed-warrior',
    name: 'Guerreiro Abençoado',
    nameEn: 'Blessed Warrior',
    category: 'fighting-style',
    prerequisite: 'Estilo de Luta do Paladino',
    classes: ['paladin'],
    effects: { cantripChoice: { count: 2, list: 'cleric' } },
    description:
      'Você aprende dois truques de Clérigo à sua escolha, que contam como magias de Paladino e usam Carisma. Ao subir de nível no Paladino, pode trocar um deles por outro truque de Clérigo.',
  },
  {
    id: 'druidic-warrior',
    name: 'Guerreiro Druídico',
    nameEn: 'Druidic Warrior',
    category: 'fighting-style',
    prerequisite: 'Estilo de Luta do Patrulheiro',
    classes: ['ranger'],
    effects: { cantripChoice: { count: 2, list: 'druid' } },
    description:
      'Você aprende dois truques de Druida à sua escolha, que contam como magias de Patrulheiro e usam Sabedoria. Ao subir de nível no Patrulheiro, pode trocar um deles por outro truque de Druida.',
  },

  // ------------------------------------------------------------------ Gerais
  { id: 'ability-score-improvement', name: 'Aumento no Valor de Atributo', nameEn: 'Ability Score Improvement', category: 'general', prerequisite: 'Nível 4+', repeatable: true, description: 'Aumente um valor de atributo em 2, ou dois valores de atributo em 1. Nenhum valor pode passar de 20.' },
  { id: 'actor', name: 'Ator', nameEn: 'Actor', category: 'general', prerequisite: 'Nível 4+, Carisma 13+', abilityIncrease: ['cha'], description: 'Vantagem em testes de Carisma (Enganação e Atuação) para se passar por outra pessoa. Você pode imitar a fala de outra criatura ou sons que tenha ouvido por ao menos 1 minuto; quem ouvir percebe a imitação com um teste de Sabedoria (Intuição) contra CD 8 + mod. de Carisma + Bônus de Proficiência.' },
  { id: 'athlete', name: 'Atleta', nameEn: 'Athlete', category: 'general', prerequisite: 'Nível 4+, Força ou Destreza 13+', abilityIncrease: ['str', 'dex'], description: 'Você ganha Deslocamento de Escalada igual ao seu Deslocamento. Levantar-se da condição Caído custa apenas 1,5 m de movimento. Você pode fazer um salto em distância ou altura com corrida após mover apenas 1,5 m.' },
  { id: 'charger', name: 'Investida Poderosa', nameEn: 'Charger', category: 'general', prerequisite: 'Nível 4+, Força ou Destreza 13+', abilityIncrease: ['str', 'dex'], description: 'Ao usar a ação Disparada, seu Deslocamento aumenta em 3 m nessa ação. Se você se mover ao menos 3 m em linha reta até um alvo antes de atingi-lo com um ataque corpo a corpo, escolha: causar 1d8 de dano extra ou empurrar o alvo até 3 m (uma vez por turno).' },
  { id: 'chef', name: 'Chef', nameEn: 'Chef', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['con', 'wis'], description: 'Proficiência com Utensílios de Cozinheiro. Em um Descanso Curto, você pode preparar comida que permite a até 4 + Bônus de Proficiência criaturas recuperar 1d8 PV extras ao gastar Dados de Vida. Após um Descanso Longo, pode preparar petiscos (em número igual ao Bônus de Proficiência) que concedem PV Temporários iguais ao Bônus de Proficiência como Ação Bônus.', effects: { tools: ['Utensílios de Cozinheiro'] } },
  { id: 'crossbow-expert', name: 'Especialista em Besta', nameEn: 'Crossbow Expert', category: 'general', prerequisite: 'Nível 4+, Destreza 13+', abilityIncrease: ['dex'], description: 'Você ignora a propriedade Recarga de bestas. Atacar a até 1,5 m de um inimigo não impõe Desvantagem em ataques com bestas. Ao fazer o ataque extra da propriedade Leve com uma besta Leve, você soma o modificador de atributo ao dano.' },
  { id: 'crusher', name: 'Esmagador', nameEn: 'Crusher', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['str', 'con'], description: 'Uma vez por turno, ao atingir com dano Contundente, você pode mover o alvo 1,5 m para um espaço desocupado (se ele não for maior que Grande). Ao causar um Acerto Crítico com dano Contundente, ataques contra o alvo têm Vantagem até o início do seu próximo turno.' },
  { id: 'defensive-duelist', name: 'Duelista Defensivo', nameEn: 'Defensive Duelist', category: 'general', prerequisite: 'Nível 4+, Destreza 13+', abilityIncrease: ['dex'], description: 'Empunhando uma arma com a propriedade Acuidade, quando for atingido por um ataque corpo a corpo, você pode usar sua Reação para somar seu Bônus de Proficiência à CA, possivelmente fazendo o ataque errar. O bônus dura até o início do seu próximo turno.' },
  { id: 'dual-wielder', name: 'Combatente com Duas Armas', nameEn: 'Dual Wielder', category: 'general', prerequisite: 'Nível 4+, Força ou Destreza 13+', abilityIncrease: ['str', 'dex'], description: 'Ao atacar com uma arma Leve, você pode fazer o ataque extra como Ação Bônus com uma arma sem a propriedade Duas Mãos, mesmo que não seja Leve. Você pode sacar ou guardar duas armas sem a propriedade Duas Mãos ao mesmo tempo.' },
  { id: 'durable', name: 'Durável', nameEn: 'Durable', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['con'], description: 'Vantagem em testes de resistência contra a morte. Como Ação Bônus, você pode gastar um Dado de Vida para recuperar PV.' },
  { id: 'elemental-adept', name: 'Adepto Elemental', nameEn: 'Elemental Adept', category: 'general', prerequisite: 'Nível 4+, característica Conjuração ou Magia de Pacto', abilityIncrease: ['int', 'wis', 'cha'], repeatable: true, description: 'Escolha Ácido, Elétrico, Fogo, Frio ou Trovão. Suas magias ignoram Resistência a esse tipo de dano e, ao rolar dano desse tipo, você trata resultados 1 como 2.' },
  { id: 'fey-touched', name: 'Tocado pelas Fadas', nameEn: 'Fey-Touched', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['int', 'wis', 'cha'], description: 'Você sempre tem preparadas Passo Nebuloso e uma magia de 1º círculo de Adivinhação ou Encantamento. Pode conjurar cada uma uma vez sem espaço de magia por Descanso Longo, e também com espaços.', effects: { spells: ['misty-step'], spellChoice: { level: 1, schools: ['Adivinhação', 'Encantamento'] } } },
  { id: 'grappler', name: 'Agarrador', nameEn: 'Grappler', category: 'general', prerequisite: 'Nível 4+, Força ou Destreza 13+', abilityIncrease: ['str', 'dex'], description: 'Ao atingir com um Ataque Desarmado na ação Atacar, você pode causar dano e agarrar (uma vez por turno). Você tem Vantagem em jogadas de ataque contra criaturas Agarradas por você. Mover uma criatura Agarrada do seu tamanho ou menor não custa movimento extra.' },
  { id: 'great-weapon-master', name: 'Mestre em Armas Grandes', nameEn: 'Great Weapon Master', category: 'general', prerequisite: 'Nível 4+, Força 13+', abilityIncrease: ['str'], description: 'Ao atingir com uma arma Pesada como parte da ação Atacar, você causa dano extra igual ao seu Bônus de Proficiência. Após um Acerto Crítico ou reduzir uma criatura a 0 PV com arma corpo a corpo, você pode fazer um ataque com a mesma arma como Ação Bônus.' },
  { id: 'heavily-armored', name: 'Fortemente Armadurado', nameEn: 'Heavily Armored', category: 'general', prerequisite: 'Nível 4+, treinamento com Armaduras Médias', abilityIncrease: ['con', 'str'], description: 'Você ganha treinamento com Armaduras Pesadas.', effects: { armorTraining: ['Armaduras Pesadas'] } },
  { id: 'heavy-armor-master', name: 'Mestre em Armaduras Pesadas', nameEn: 'Heavy Armor Master', category: 'general', prerequisite: 'Nível 4+, treinamento com Armaduras Pesadas', abilityIncrease: ['con', 'str'], description: 'Usando Armadura Pesada, o dano Contundente, Cortante e Perfurante que você sofre de ataques é reduzido em um valor igual ao seu Bônus de Proficiência.' },
  { id: 'inspiring-leader', name: 'Líder Inspirador', nameEn: 'Inspiring Leader', category: 'general', prerequisite: 'Nível 4+, Sabedoria ou Carisma 13+', abilityIncrease: ['wis', 'cha'], description: 'Ao terminar um Descanso Curto ou Longo, você pode inspirar até seis aliados a até 9 m; cada um ganha PV Temporários iguais ao seu nível de personagem + o modificador do atributo aumentado por este talento.' },
  { id: 'keen-mind', name: 'Mente Aguçada', nameEn: 'Keen Mind', category: 'general', prerequisite: 'Nível 4+, Inteligência 13+', abilityIncrease: ['int'], description: 'Proficiência (ou Especialização, se já for proficiente) em Arcanismo, História, Investigação, Natureza ou Religião. Você pode usar a ação Estudar como Ação Bônus.', effects: { skillChoice: { count: 1, options: ['arcana', 'history', 'investigation', 'nature', 'religion'], expertiseIfProficient: true } } },
  { id: 'lightly-armored', name: 'Levemente Armadurado', nameEn: 'Lightly Armored', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['str', 'dex'], description: 'Você ganha treinamento com Armaduras Leves e Escudos.', effects: { armorTraining: ['Armaduras Leves', 'Escudos'] } },
  { id: 'mage-slayer', name: 'Matador de Magos', nameEn: 'Mage Slayer', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['str', 'dex'], description: 'Quando você causa dano a uma criatura concentrada, ela tem Desvantagem no teste para manter a Concentração. Se falhar em um teste de resistência de Inteligência, Sabedoria ou Carisma, você pode ter sucesso em vez disso (uma vez por Descanso Curto ou Longo).' },
  { id: 'martial-weapon-training', name: 'Treinamento com Armas Marciais', nameEn: 'Martial Weapon Training', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['str', 'dex'], description: 'Você ganha proficiência com Armas Marciais.', effects: { weaponProficiencies: ['Armas Marciais'] } },
  { id: 'medium-armor-master', name: 'Mestre em Armaduras Médias', nameEn: 'Medium Armor Master', category: 'general', prerequisite: 'Nível 4+, treinamento com Armaduras Médias', abilityIncrease: ['str', 'dex'], description: 'Usando Armadura Média, você pode somar até 3 (em vez de 2) do modificador de Destreza à CA.' },
  { id: 'moderately-armored', name: 'Moderadamente Armadurado', nameEn: 'Moderately Armored', category: 'general', prerequisite: 'Nível 4+, treinamento com Armaduras Leves', abilityIncrease: ['str', 'dex'], description: 'Você ganha treinamento com Armaduras Médias.', effects: { armorTraining: ['Armaduras Médias'] } },
  { id: 'mounted-combatant', name: 'Combatente Montado', nameEn: 'Mounted Combatant', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['str', 'dex', 'wis'], description: 'Vantagem em ataques contra criaturas não montadas a até 1,5 m da sua montaria e menores que ela. Sua montaria recebe Evasão e você pode redirecionar para si ataques contra ela.' },
  { id: 'observant', name: 'Observador', nameEn: 'Observant', category: 'general', prerequisite: 'Nível 4+, Inteligência ou Sabedoria 13+', abilityIncrease: ['int', 'wis'], description: 'Proficiência (ou Especialização) em Intuição, Investigação ou Percepção. Você pode usar a ação Procurar como Ação Bônus.', effects: { skillChoice: { count: 1, options: ['insight', 'investigation', 'perception'], expertiseIfProficient: true } } },
  { id: 'piercer', name: 'Perfurador', nameEn: 'Piercer', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['str', 'dex'], description: 'Uma vez por turno, ao causar dano Perfurante, você pode rolar novamente um dos dados de dano. Em um Acerto Crítico com dano Perfurante, role um dado de dano adicional.' },
  { id: 'poisoner', name: 'Envenenador', nameEn: 'Poisoner', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['dex', 'int'], description: 'Seu dano de Veneno ignora Resistência. Proficiência com Kit de Venenos; você pode preparar doses que causam 2d8 de dano de Veneno e a condição Envenenado (teste de Constituição).', effects: { tools: ['Kit de Venenos'] } },
  { id: 'polearm-master', name: 'Mestre em Armas de Haste', nameEn: 'Polearm Master', category: 'general', prerequisite: 'Nível 4+, Força ou Destreza 13+', abilityIncrease: ['str', 'dex'], description: 'Com bordão, lança ou arma Pesada com Alcance, você pode atacar com a outra extremidade como Ação Bônus (1d4 Contundente). Criaturas que entrarem no seu alcance provocam Ataque de Oportunidade.' },
  { id: 'resilient', name: 'Resiliente', nameEn: 'Resilient', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ALL, description: 'Escolha um atributo em que não tenha proficiência em testes de resistência: aumente-o em 1 e ganhe proficiência nos testes de resistência desse atributo.' },
  { id: 'ritual-caster', name: 'Conjurador de Rituais', nameEn: 'Ritual Caster', category: 'general', prerequisite: 'Nível 4+, Inteligência, Sabedoria ou Carisma 13+', abilityIncrease: ['int', 'wis', 'cha'], description: 'Você sempre tem preparadas magias de 1º círculo com a etiqueta Ritual em número igual ao seu Bônus de Proficiência, e pode conjurar rituais rapidamente uma vez por Descanso Longo.' },
  { id: 'sentinel', name: 'Sentinela', nameEn: 'Sentinel', category: 'general', prerequisite: 'Nível 4+, Força ou Destreza 13+', abilityIncrease: ['str', 'dex'], description: 'Quando um inimigo a até 1,5 m ataca outra criatura ou usa Desengajar, você pode fazer um Ataque de Oportunidade contra ele. Ao acertar um Ataque de Oportunidade, o Deslocamento do alvo vira 0 até o fim do turno.' },
  { id: 'shadow-touched', name: 'Tocado pelas Sombras', nameEn: 'Shadow-Touched', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['int', 'wis', 'cha'], description: 'Você sempre tem preparadas Invisibilidade e uma magia de 1º círculo de Ilusão ou Necromancia. Pode conjurar cada uma uma vez sem espaço de magia por Descanso Longo, e também com espaços.', effects: { spells: ['invisibility'], spellChoice: { level: 1, schools: ['Ilusão', 'Necromancia'] } } },
  { id: 'sharpshooter', name: 'Atirador de Elite', nameEn: 'Sharpshooter', category: 'general', prerequisite: 'Nível 4+, Destreza 13+', abilityIncrease: ['dex'], description: 'Seus ataques à distância ignoram Meia Cobertura e Três Quartos de Cobertura. Atacar a até 1,5 m de inimigos não impõe Desvantagem. Atacar a longa distância não impõe Desvantagem.' },
  { id: 'shield-master', name: 'Mestre em Escudos', nameEn: 'Shield Master', category: 'general', prerequisite: 'Nível 4+, treinamento com Escudos', abilityIncrease: ['str'], description: 'Ao atacar com uma arma corpo a corpo, você pode golpear com o Escudo para empurrar 1,5 m ou derrubar o alvo (teste de Força). Se for alvo de efeito que exija teste de Destreza para metade do dano, pode usar a Reação para não sofrer dano em um sucesso.' },
  { id: 'skill-expert', name: 'Especialista em Perícias', nameEn: 'Skill Expert', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ALL, description: 'Proficiência em uma perícia à sua escolha e Especialização em uma perícia em que já seja proficiente.', effects: { skillChoice: { count: 1 }, expertiseChoice: 1 } },
  { id: 'skulker', name: 'Espreitador', nameEn: 'Skulker', category: 'general', prerequisite: 'Nível 4+, Destreza 13+', abilityIncrease: ['dex'], description: 'Percepção às Cegas de 3 m. Você pode tentar se esconder estando levemente obscurecido. Errar um ataque enquanto escondido não revela sua posição.' },
  { id: 'slasher', name: 'Retalhador', nameEn: 'Slasher', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['str', 'dex'], description: 'Uma vez por turno, ao causar dano Cortante, reduza o Deslocamento do alvo em 3 m até o início do seu próximo turno. Em um Acerto Crítico com dano Cortante, o alvo tem Desvantagem em jogadas de ataque até o início do seu próximo turno.' },
  { id: 'speedy', name: 'Veloz', nameEn: 'Speedy', category: 'general', prerequisite: 'Nível 4+, Destreza ou Constituição 13+', abilityIncrease: ['dex', 'con'], description: 'Seu Deslocamento aumenta em 3 m. Disparada ignora Terreno Difícil nesse turno. Ataques de Oportunidade contra você têm Desvantagem.', effects: { speedFt: 10 } },
  { id: 'spell-sniper', name: 'Atirador Mágico', nameEn: 'Spell Sniper', category: 'general', prerequisite: 'Nível 4+, característica Conjuração ou Magia de Pacto', abilityIncrease: ['int', 'wis', 'cha'], description: 'Ataques mágicos não sofrem Desvantagem a até 1,5 m de inimigos e ignoram Meia Cobertura e Três Quartos de Cobertura. Magias com jogada de ataque e alcance de 3 m ou mais têm o alcance aumentado em 18 m.' },
  { id: 'telekinetic', name: 'Telecinético', nameEn: 'Telekinetic', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['int', 'wis', 'cha'], description: 'Você aprende Mão Mágica (pode conjurá-la sem componentes, invisível, com +9 m de alcance). Como Ação Bônus, pode empurrar ou puxar telecineticamente uma criatura a até 9 m em 1,5 m (teste de Força para resistir).', effects: { spells: ['mage-hand'] } },
  { id: 'telepathic', name: 'Telepático', nameEn: 'Telepathic', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['int', 'wis', 'cha'], description: 'Você pode falar telepaticamente com qualquer criatura a até 18 m. Você sempre tem Detectar Pensamentos preparada e pode conjurá-la sem espaço uma vez por Descanso Longo.', effects: { spells: ['detect-thoughts'] } },
  { id: 'war-caster', name: 'Conjurador de Guerra', nameEn: 'War Caster', category: 'general', prerequisite: 'Nível 4+, característica Conjuração ou Magia de Pacto', abilityIncrease: ['int', 'wis', 'cha'], description: 'Vantagem em testes de Constituição para manter Concentração. Você pode conjurar uma magia de alvo único com tempo de Ação como Ataque de Oportunidade. Pode realizar componentes Somáticos com as mãos ocupadas por armas ou Escudo.' },
  { id: 'weapon-master', name: 'Mestre em Armas', nameEn: 'Weapon Master', category: 'general', prerequisite: 'Nível 4+', abilityIncrease: ['str', 'dex'], description: 'Você aprende a propriedade de Maestria de um tipo de Arma Simples ou Marcial em que seja proficiente, podendo trocá-la ao terminar um Descanso Longo.' },

  // ------------------------------------------------------------ Dádivas Épicas
  { id: 'boon-of-combat-prowess', name: 'Dádiva da Proeza em Combate', nameEn: 'Boon of Combat Prowess', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, description: 'Aumente um atributo em 1 (máximo 30). Quando errar uma jogada de ataque, você pode acertar em vez disso (uma vez por turno).' },
  { id: 'boon-of-dimensional-travel', name: 'Dádiva da Viagem Dimensional', nameEn: 'Boon of Dimensional Travel', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, description: 'Aumente um atributo em 1 (máximo 30). Após usar a ação Atacar ou Magia, você pode se teletransportar até 9 m.' },
  { id: 'boon-of-fate', name: 'Dádiva do Destino', nameEn: 'Boon of Fate', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, description: 'Aumente um atributo em 1 (máximo 30). Quando uma criatura a até 18 m fizer um Teste de D20, você pode somar ou subtrair 2d4 do resultado (uma vez por Iniciativa ou Descanso).' },
  { id: 'boon-of-irresistible-offense', name: 'Dádiva da Ofensiva Irresistível', nameEn: 'Boon of Irresistible Offense', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ['str', 'dex'], description: 'Aumente Força ou Destreza em 1 (máximo 30). Seu dano Contundente, Cortante e Perfurante ignora Resistência. Ao tirar 20 no d20 de um ataque, cause dano extra igual ao atributo aumentado.' },
  { id: 'boon-of-spell-recall', name: 'Dádiva da Recordação de Magia', nameEn: 'Boon of Spell Recall', category: 'epic-boon', prerequisite: 'Nível 19+, característica Conjuração', abilityIncrease: ['int', 'wis', 'cha'], description: 'Aumente Inteligência, Sabedoria ou Carisma em 1 (máximo 30). Você pode conjurar uma magia preparada de 1º a 4º círculo sem gastar espaço, uma vez por Descanso Longo.' },
  { id: 'boon-of-the-night-spirit', name: 'Dádiva do Espírito da Noite', nameEn: 'Boon of the Night Spirit', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, description: 'Aumente um atributo em 1 (máximo 30). Na Penumbra ou Escuridão, você pode ficar Invisível como Ação Bônus e tem Resistência a todo dano exceto Psíquico e Radiante.' },
  { id: 'boon-of-truesight', name: 'Dádiva da Visão Verdadeira', nameEn: 'Boon of Truesight', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, description: 'Aumente um atributo em 1 (máximo 30). Você tem Visão Verdadeira com alcance de 18 m.' },
  { id: 'boon-of-energy-resistance', name: 'Dádiva da Resistência a Energia', nameEn: 'Boon of Energy Resistance', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, description: 'Aumente um atributo em 1 (máximo 30). Escolha dois tipos entre Ácido, Elétrico, Frio, Fogo, Necrótico, Psíquico, Radiante, Trovejante e Veneno: você tem Resistência a eles. Quando sofrer dano de um desses tipos, pode usar a Reação para direcionar a outra criatura a até 18 m um teste de Destreza (CD 8 + mod. do atributo + BP) que causa 2d12 desse tipo na falha.' },
  { id: 'boon-of-fortitude', name: 'Dádiva da Fortitude', nameEn: 'Boon of Fortitude', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, effects: { hpFlat: 40 }, description: 'Aumente um atributo em 1 (máximo 30). Seu máximo de Pontos de Vida aumenta em 40. Uma vez por turno, ao recuperar PV, você pode somar seu modificador de Constituição à cura.' },
  { id: 'boon-of-recovery', name: 'Dádiva da Recuperação', nameEn: 'Boon of Recovery', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, description: 'Aumente um atributo em 1 (máximo 30). Quando cair a 0 PV sem morrer, você pode ficar com PV iguais à metade do máximo (uma vez por Descanso Longo). Você tem dez d10 para gastar como Ação Bônus e recuperar PV (recuperados em Descanso Longo).' },
  { id: 'boon-of-skill', name: 'Dádiva da Perícia', nameEn: 'Boon of Skill', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, effects: { allSkills: true, expertiseChoice: 1 }, description: 'Aumente um atributo em 1 (máximo 30). Você ganha proficiência em todas as perícias e Especialização em uma perícia à sua escolha.' },
  { id: 'boon-of-speed', name: 'Dádiva da Velocidade', nameEn: 'Boon of Speed', category: 'epic-boon', prerequisite: 'Nível 19+', abilityIncrease: ALL, effects: { speedFt: 30 }, description: 'Aumente um atributo em 1 (máximo 30). Seu Deslocamento aumenta em 9 m. Como Ação Bônus, você pode usar Desengajar e encerrar a condição Agarrado em si mesmo.' },
];

export const FEATS_BY_ID: Record<string, FeatData> = Object.fromEntries(FEATS.map((f) => [f.id, f]));

export const ORIGIN_FEATS = FEATS.filter((f) => f.category === 'origin');
export const FIGHTING_STYLE_FEATS = FEATS.filter((f) => f.category === 'fighting-style');
export const GENERAL_FEATS = FEATS.filter((f) => f.category === 'general');
export const EPIC_BOONS = FEATS.filter((f) => f.category === 'epic-boon');
