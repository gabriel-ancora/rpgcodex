import type { ClassData } from '../types';

const ASI =
  'Você ganha o talento Aumento no Valor de Atributo ou outro talento de sua escolha para o qual se qualifique.';
const SUB = 'Você ganha uma característica da sua subclasse de Patrulheiro.';

export const RANGER: ClassData = {
  id: 'ranger',
  name: 'Patrulheiro',
  nameEn: 'Ranger',
  summary:
    'Batedor e caçador das regiões selvagens, que combina perícia marcial, sobrevivência e magia primal para rastrear e abater suas presas.',
  hitDie: 10,
  primaryAbilities: ['dex', 'wis'],
  savingThrows: ['str', 'dex'],
  armorTraining: ['Armaduras Leves', 'Armaduras Médias', 'Escudos'],
  weaponProficiencies: ['Armas Simples', 'Armas Marciais'],
  toolProficiencies: [],
  skillChoices: {
    count: 3,
    options: [
      'animal-handling',
      'athletics',
      'insight',
      'investigation',
      'nature',
      'perception',
      'stealth',
      'survival',
    ],
  },
  features: [
    {
      level: 1,
      name: 'Conjuração',
      description:
        'Você aprendeu a canalizar a essência mágica da natureza para conjurar magias. Sabedoria é o seu atributo de conjuração: a CD de resistência das suas magias é 8 + modificador de Sabedoria + Bônus de Proficiência, e o modificador de ataque mágico é modificador de Sabedoria + Bônus de Proficiência. Você prepara magias da lista de Patrulheiro, na quantidade indicada na tabela da classe, e usa espaços de magia para conjurá-las, recuperando todos os espaços gastos ao terminar um Descanso Longo. Ao terminar um Descanso Longo, você pode trocar uma magia preparada por outra da lista de Patrulheiro. Você pode usar um Foco Druídico como foco de conjuração para as suas magias de Patrulheiro.',
    },
    {
      level: 1,
      name: 'Inimigo Favorito',
      description:
        'Você sempre tem a magia Marca do Caçador preparada. Você pode conjurá-la sem gastar um espaço de magia um número de vezes igual ao valor da coluna Inimigo Favorito da tabela da classe (2 no nível 1, 3 no nível 5, 4 no nível 9, 5 no nível 13 e 6 no nível 17) e recupera todos esses usos ao terminar um Descanso Longo.',
    },
    {
      level: 1,
      name: 'Maestria em Armas',
      description:
        'Seu treinamento permite usar as propriedades de maestria de dois tipos de armas de sua escolha com as quais você tenha proficiência. Sempre que terminar um Descanso Longo, você pode trocar um desses tipos de arma por outro elegível.',
    },
    {
      level: 2,
      name: 'Explorador Hábil',
      description:
        'Graças às suas viagens, você ganha Especialização em uma perícia na qual tenha proficiência, à sua escolha, e aprende dois idiomas à sua escolha.',
    },
    {
      level: 2,
      name: 'Estilo de Luta',
      description:
        'Você ganha um talento de Estilo de Luta à sua escolha. Em vez de escolher um desses talentos, você pode optar por Guerreiro Druídico: você aprende dois truques de Druida à sua escolha, que contam como magias de Patrulheiro e usam Sabedoria como atributo de conjuração. Sempre que ganhar um nível de Patrulheiro, você pode trocar um desses truques por outro truque de Druida.',
    },
    {
      level: 3,
      name: 'Subclasse de Patrulheiro',
      description:
        'Você ganha uma subclasse de Patrulheiro à sua escolha. A subclasse concede características nos níveis 3, 7, 11 e 15 de Patrulheiro.',
    },
    { level: 4, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 5,
      name: 'Ataque Extra',
      description:
        'Você pode atacar duas vezes, em vez de uma, sempre que realizar a ação Atacar no seu turno.',
    },
    {
      level: 6,
      name: 'Andarilho',
      description:
        'Seu Deslocamento aumenta em 3 metros enquanto você não estiver usando armadura pesada. Você também ganha Deslocamento de Escalada e Deslocamento de Natação iguais ao seu Deslocamento.',
    },
    { level: 7, name: 'Característica de Subclasse', description: SUB },
    { level: 8, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 9,
      name: 'Especialista',
      description:
        'Você ganha Especialização em duas perícias à sua escolha nas quais tenha proficiência e ainda não tenha Especialização.',
    },
    {
      level: 10,
      name: 'Incansável',
      description:
        'Forças primais ajudam a sustentar você. Com uma ação de Magia, você pode ganhar Pontos de Vida Temporários iguais a 1d8 + seu modificador de Sabedoria (mínimo de 1). Você pode usar essa ação um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma) e recupera todos os usos ao terminar um Descanso Longo. Além disso, sempre que terminar um Descanso Curto, seu nível de Exaustão, se houver, diminui em 1.',
    },
    { level: 11, name: 'Característica de Subclasse', description: SUB },
    { level: 12, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 13,
      name: 'Perseguidor Implacável',
      description:
        'Sofrer dano não pode quebrar a sua Concentração na magia Marca do Caçador.',
    },
    {
      level: 14,
      name: 'Véu da Natureza',
      description:
        'Você invoca os espíritos da natureza para se ocultar magicamente. Com uma Ação Bônus, você recebe a condição Invisível até o fim do seu próximo turno. Você pode usar esta característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma) e recupera todos os usos ao terminar um Descanso Longo.',
    },
    { level: 15, name: 'Característica de Subclasse', description: SUB },
    { level: 16, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 17,
      name: 'Caçador Preciso',
      description:
        'Você tem Vantagem em jogadas de ataque contra a criatura atualmente marcada pela sua Marca do Caçador.',
    },
    {
      level: 18,
      name: 'Sentidos Ferais',
      description:
        'Sua conexão com as forças da natureza concede a você Percepção às Cegas com alcance de 9 metros.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento de sua escolha para o qual se qualifique.',
    },
    {
      level: 20,
      name: 'Matador de Inimigos',
      description:
        'O dado de dano da sua Marca do Caçador passa a ser d10 em vez de d6.',
    },
  ],
  tableColumns: [
    {
      label: 'Inimigo Favorito',
      values: ['2', '2', '2', '2', '3', '3', '3', '3', '4', '4', '4', '4', '5', '5', '5', '5', '6', '6', '6', '6'],
    },
  ],
  subclasses: [
    {
      id: 'beast-master',
      name: 'Mestre das Feras',
      nameEn: 'Beast Master',
      summary:
        'Patrulheiros unidos por um vínculo místico a uma fera primal, que luta ao seu lado e obedece aos seus comandos.',
      features: [
        {
          level: 3,
          name: 'Companheiro Primal',
          description:
            'Você invoca magicamente uma fera primal, que obtém força do seu vínculo com a natureza. Escolha a forma: Fera da Terra, Fera do Mar ou Fera do Céu. Ela é Amistosa com você e seus aliados e obedece aos seus comandos. Em combate, age na sua contagem de Iniciativa, logo após o seu turno; pode se mover e usar sua Reação por conta própria, mas a única ação que realiza é Esquivar, a menos que você use uma Ação Bônus para comandá-la a realizar uma ação do seu bloco de estatísticas ou outra ação. Você pode comandá-la a usar Golpe da Fera abrindo mão de um dos seus ataques ao realizar a ação Atacar. Se você estiver Incapacitado, a fera age por conta própria. Se a fera tiver morrido na última hora, você pode tocá-la com uma ação de Magia e gastar um espaço de magia de qualquer círculo para revivê-la com todos os Pontos de Vida após 1 minuto. Ao terminar um Descanso Longo, você pode invocar uma fera diferente, e a anterior desaparece. Todas as formas usam o seu Bônus de Proficiência e têm CA 13 + seu modificador de Sabedoria. Fera da Terra (Média): Pontos de Vida 5 + cinco vezes seu nível de Patrulheiro; Deslocamento 12 m, Escalada 12 m; For 14, Des 14, Con 15, Int 8, Sab 14, Car 11; Visão no Escuro 18 m; Investida: se a fera se mover ao menos 6 m em linha reta até o alvo e então acertá-lo com Golpe da Fera, causa 1d6 de dano adicional do mesmo tipo e, se o alvo for Grande ou menor, ele deve passar em um teste de resistência de Força contra a sua CD de magia ou ficará Caído; Golpe da Fera: ataque corpo a corpo usando seu modificador de ataque mágico, alcance 1,5 m, 1d8 + 2 + seu modificador de Sabedoria de dano Contundente, Cortante ou Perfurante (escolhido na invocação). Fera do Mar (Média): Pontos de Vida 5 + cinco vezes seu nível de Patrulheiro; Deslocamento 1,5 m, Natação 18 m; For 14, Des 14, Con 15, Int 8, Sab 14, Car 11; Anfíbia; Visão no Escuro 27 m; Golpe da Fera: ataque corpo a corpo usando seu modificador de ataque mágico, alcance 1,5 m, 1d6 + 2 + seu modificador de Sabedoria de dano Contundente ou Perfurante, e o alvo fica Agarrado (CD para escapar igual à sua CD de magia). Fera do Céu (Pequena): Pontos de Vida 4 + quatro vezes seu nível de Patrulheiro; Deslocamento 3 m, Voo 18 m; For 6, Des 16, Con 13, Int 8, Sab 14, Car 11; Visão no Escuro 18 m; Voo Rasante: não provoca Ataques de Oportunidade ao sair do alcance de um inimigo; Golpe da Fera: ataque corpo a corpo usando seu modificador de ataque mágico, alcance 1,5 m, 1d4 + 3 + seu modificador de Sabedoria de dano Cortante.',
        },
        {
          level: 7,
          name: 'Treinamento Excepcional',
          description:
            'Quando você usa sua Ação Bônus para comandar a fera do Companheiro Primal a realizar uma ação, também pode comandá-la a usar a Ação Bônus dela para realizar Disparada, Desengajar, Esquivar ou Ajudar. Além disso, sempre que a fera acertar um ataque e causar dano, ela pode causar dano de Energia ou o tipo de dano normal do ataque.',
        },
        {
          level: 11,
          name: 'Fúria Bestial',
          description:
            'Quando você comanda a fera a usar Golpe da Fera, ela pode usá-lo duas vezes. Além disso, na primeira vez em cada turno que ela acertar uma criatura marcada pela sua Marca do Caçador, causa dano de Energia adicional igual ao dano adicional dessa magia.',
        },
        {
          level: 15,
          name: 'Compartilhar Magias',
          description:
            'Quando você conjura uma magia que tenha você como alvo, também pode fazer com que ela afete a fera do Companheiro Primal, desde que a fera esteja a até 9 metros de você.',
        },
      ],
    },
    {
      id: 'fey-wanderer',
      name: 'Andarilho Feérico',
      nameEn: 'Fey Wanderer',
      summary:
        'Patrulheiros marcados pela magia da Agrestia das Fadas, que unem alegria e terror feéricos à habilidade com armas.',
      features: [
        {
          level: 3,
          name: 'Golpes Terríveis',
          description:
            'Você pode aumentar os golpes das suas armas com magia que distorce a mente. Quando você atinge uma criatura com uma arma, pode causar 1d4 de dano Psíquico adicional ao alvo, que só pode sofrer esse dano adicional uma vez por turno. O dano adicional aumenta para 1d6 no nível 11 de Patrulheiro.',
        },
        {
          level: 3,
          name: 'Magias de Andarilho Feérico',
          description:
            'Ao atingir os níveis de Patrulheiro indicados, você passa a ter sempre preparadas: nível 3, Enfeitiçar Pessoa; nível 5, Passo Nebuloso; nível 9, Invocar Feérico; nível 13, Porta Dimensional; nível 17, Despistar. Você também recebe uma dádiva feérica à sua escolha ou sorteada (1d6): borboletas ilusórias esvoaçam ao seu redor durante Descansos Curtos; flores desabrocham do seu cabelo a cada amanhecer; você exala um leve aroma de flores, especiarias ou folhas; sua sombra dança quando ninguém olha diretamente para ela; chifres ou galhadas brotam da sua cabeça; ou sua pele e cabelo mudam de cor a cada amanhecer.',
        },
        {
          level: 3,
          name: 'Glamour Sobrenatural',
          description:
            'Sempre que fizer um teste de Carisma, você recebe um bônus igual ao seu modificador de Sabedoria (bônus mínimo de +1). Você também ganha proficiência em uma destas perícias à sua escolha: Atuação, Enganação ou Persuasão.',
        },
        {
          level: 7,
          name: 'Desvio Sedutor',
          description:
            'Você tem Vantagem em testes de resistência para evitar ou encerrar as condições Amedrontado ou Enfeitiçado. Além disso, sempre que você ou uma criatura que possa ver a até 36 metros for bem-sucedida em um teste de resistência para evitar ou encerrar essas condições, você pode usar sua Reação para forçar outra criatura que possa ver a até 36 metros a fazer um teste de resistência de Sabedoria contra a sua CD de magia. Se falhar, ela fica Amedrontada ou Enfeitiçada (à sua escolha) por 1 minuto, repetindo o teste no fim de cada um dos turnos dela e encerrando o efeito com um sucesso.',
        },
        {
          level: 11,
          name: 'Reforços Feéricos',
          description:
            'Você pode conjurar Invocar Feérico sem componente Material. Também pode conjurá-la uma vez sem gastar um espaço de magia, recuperando esse uso ao terminar um Descanso Longo. Sempre que começar a conjurar essa magia, você pode modificá-la para que não exija Concentração; nesse caso, a duração passa a ser de 1 minuto para essa conjuração.',
        },
        {
          level: 15,
          name: 'Andarilho Nebuloso',
          description:
            'Você pode conjurar Passo Nebuloso sem gastar um espaço de magia um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma) e recupera todos os usos ao terminar um Descanso Longo. Além disso, sempre que conjurar Passo Nebuloso, você pode levar junto uma criatura voluntária que possa ver a até 1,5 metro de você; ela se teletransporta para um espaço desocupado de sua escolha a até 1,5 metro do seu destino.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['charm-person'] },
        { level: 5, spells: ['misty-step'] },
        { level: 9, spells: ['summon-fey'] },
        { level: 13, spells: ['dimension-door'] },
        { level: 17, spells: ['mislead'] },
      ],
    },
    {
      id: 'gloom-stalker',
      name: 'Perseguidor Sombrio',
      nameEn: 'Gloom Stalker',
      summary:
        'Patrulheiros que caçam nos lugares mais escuros, emboscando ameaças nas sombras e agindo antes que o inimigo perceba sua presença.',
      features: [
        {
          level: 3,
          name: 'Magias de Perseguidor Sombrio',
          description:
            'Ao atingir os níveis de Patrulheiro indicados, você passa a ter sempre preparadas: nível 3, Disfarçar-se; nível 5, Truque de Corda; nível 9, Medo; nível 13, Invisibilidade Maior; nível 17, Similaridade.',
        },
        {
          level: 3,
          name: 'Emboscador Terrível',
          description:
            'Você domina a arte de criar emboscadas assustadoras, o que concede três benefícios. Salto do Emboscador: no início do seu primeiro turno de cada combate, seu Deslocamento aumenta em 3 metros até o fim desse turno. Golpe Terrível: quando atacar uma criatura e acertá-la com uma arma, você pode causar 2d6 de dano Psíquico adicional; pode usar esse benefício apenas uma vez por turno, um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma), recuperando todos os usos ao terminar um Descanso Longo. Bônus de Iniciativa: ao rolar Iniciativa, você soma seu modificador de Sabedoria ao resultado.',
        },
        {
          level: 3,
          name: 'Visão Umbral',
          description:
            'Você ganha Visão no Escuro com alcance de 18 metros. Se já tiver Visão no Escuro quando ganhar esta característica, o alcance dela aumenta em 18 metros. Você também é hábil em escapar de criaturas que dependem dessa visão: enquanto estiver inteiramente na Escuridão, você tem a condição Invisível para qualquer criatura que dependa de Visão no Escuro para vê-lo nessa Escuridão.',
        },
        {
          level: 7,
          name: 'Mente de Ferro',
          description:
            'Você aprimorou sua capacidade de resistir a poderes que alteram a mente. Você ganha proficiência em testes de resistência de Sabedoria. Se já tiver essa proficiência, ganha proficiência em testes de resistência de Inteligência ou Carisma, à sua escolha.',
        },
        {
          level: 11,
          name: 'Rajada do Perseguidor',
          description:
            'O dano Psíquico do seu Golpe Terrível passa a ser 2d8. Além disso, ao usar o efeito Golpe Terrível de Emboscador Terrível, você pode causar um dos seguintes efeitos adicionais. Golpe Súbito: você pode fazer outro ataque com a mesma arma contra uma criatura diferente que esteja a até 1,5 metro do alvo original e ao alcance da arma. Medo em Massa: o alvo e cada criatura a até 3 metros dele devem fazer um teste de resistência de Sabedoria contra a sua CD de magia; quem falhar fica Amedrontado por você até o início do seu próximo turno.',
        },
        {
          level: 15,
          name: 'Esquiva Sombria',
          description:
            'Quando uma criatura faz uma jogada de ataque contra você, você pode usar sua Reação para impor Desvantagem a essa jogada. Acertando ou errando o ataque, você pode então se teletransportar até 9 metros para um espaço desocupado que possa ver.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['disguise-self'] },
        { level: 5, spells: ['rope-trick'] },
        { level: 9, spells: ['fear'] },
        { level: 13, spells: ['greater-invisibility'] },
        { level: 17, spells: ['seeming'] },
      ],
    },
    {
      id: 'hunter',
      name: 'Caçador',
      nameEn: 'Hunter',
      summary:
        'Patrulheiros que protegem a natureza e os povos das ameaças que os atacam, aprendendo técnicas especializadas contra hordas e criaturas colossais.',
      features: [
        {
          level: 3,
          name: 'Saber do Caçador',
          description:
            'Você pode invocar as forças da natureza para revelar pontos fortes e fracos da sua presa. Enquanto uma criatura estiver marcada pela sua Marca do Caçador, você sabe se ela tem alguma Imunidade, Resistência ou Vulnerabilidade e, se tiver, quais são.',
        },
        {
          level: 3,
          name: 'Presa do Caçador',
          description:
            'Escolha uma das opções a seguir. Sempre que terminar um Descanso Curto ou Longo, você pode trocar a opção escolhida. Assassino de Colossos: sua tenacidade desgasta até os inimigos mais resistentes; quando atingir uma criatura com uma arma, ela sofre 1d8 de dano adicional se estiver com menos que o máximo de Pontos de Vida; você só pode causar esse dano adicional uma vez por turno. Destruidor de Hordas: uma vez em cada um dos seus turnos, quando fizer um ataque com uma arma, você pode fazer outro ataque com a mesma arma contra uma criatura diferente que esteja a até 1,5 metro do alvo original, ao alcance da arma, e que você ainda não tenha atacado neste turno.',
        },
        {
          level: 7,
          name: 'Táticas Defensivas',
          description:
            'Escolha uma das opções a seguir. Sempre que terminar um Descanso Curto ou Longo, você pode trocar a opção escolhida. Escapar da Horda: Ataques de Oportunidade contra você têm Desvantagem. Defesa contra Ataques Múltiplos: quando uma criatura atinge você com uma jogada de ataque, ela tem Desvantagem em todas as outras jogadas de ataque contra você neste turno.',
        },
        {
          level: 11,
          name: 'Presa Superior do Caçador',
          description:
            'Uma vez por turno, quando causar dano a uma criatura marcada pela sua Marca do Caçador, você também pode causar o dano adicional dessa magia a uma criatura diferente que possa ver a até 9 metros da primeira.',
        },
        {
          level: 15,
          name: 'Defesa Superior do Caçador',
          description:
            'Quando sofrer dano, você pode usar sua Reação para ganhar Resistência a esse dano e a qualquer outro dano do mesmo tipo até o fim do turno atual.',
        },
      ],
    },
  ],
};
