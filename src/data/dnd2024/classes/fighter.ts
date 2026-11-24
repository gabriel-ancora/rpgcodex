import type { ClassData } from '../types';

export const FIGHTER: ClassData = {
  id: 'fighter',
  name: 'Guerreiro',
  nameEn: 'Fighter',
  summary:
    'Mestre do combate armado, treinado em todas as armas e armaduras, capaz de atacar repetidas vezes e superar adversidades com pura tenacidade.',
  hitDie: 10,
  primaryAbilities: ['str', 'dex'],
  savingThrows: ['str', 'con'],
  armorTraining: ['Armaduras Leves', 'Armaduras Médias', 'Armaduras Pesadas', 'Escudos'],
  weaponProficiencies: ['Armas Simples', 'Armas Marciais'],
  toolProficiencies: [],
  skillChoices: {
    count: 2,
    options: [
      'acrobatics',
      'animal-handling',
      'athletics',
      'history',
      'insight',
      'intimidation',
      'persuasion',
      'perception',
      'survival',
    ],
  },
  features: [
    {
      level: 1,
      name: 'Estilo de Luta',
      description:
        'Você aprimorou suas proezas marciais e ganha um talento de Estilo de Luta à sua escolha (recomenda-se Defesa). Sempre que ganhar um nível de Guerreiro, pode substituir esse talento por outro talento de Estilo de Luta.',
    },
    {
      level: 1,
      name: 'Retomar o Fôlego',
      description:
        'Você tem uma reserva de energia física e mental. Como Ação Bônus, pode usá-la para recuperar Pontos de Vida iguais a 1d10 + seu nível de Guerreiro. Você pode usar esta característica duas vezes (três no nível 4 e quatro no nível 10; ver tabela da classe), recuperando um uso gasto ao terminar um Descanso Curto e todos ao terminar um Descanso Longo.',
    },
    {
      level: 1,
      name: 'Maestria em Armas',
      description:
        'Seu treinamento permite usar a propriedade de maestria de três tipos de Armas Simples ou Marciais à sua escolha. Sempre que terminar um Descanso Longo, pode praticar exercícios com armas e trocar um desses tipos por outro. O número de tipos aumenta conforme a coluna Maestria em Armas da tabela (4 no nível 4, 5 no nível 10 e 6 no nível 16).',
    },
    {
      level: 2,
      name: 'Surto de Ação',
      description:
        'Você pode se esforçar além dos seus limites por um momento. No seu turno, pode realizar uma ação adicional, exceto a ação de Magia. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Curto ou Longo. A partir do nível 17, você pode usá-la duas vezes antes de um descanso, mas apenas uma vez por turno.',
    },
    {
      level: 2,
      name: 'Mente Tática',
      description:
        'Você tem uma mente para a tática dentro e fora do campo de batalha. Quando falhar em um teste de atributo, pode gastar um uso de Retomar o Fôlego para, em vez de recuperar Pontos de Vida, rolar 1d10 e somar o resultado ao teste, possivelmente transformando-o em sucesso. Se o teste ainda falhar, o uso de Retomar o Fôlego não é gasto.',
    },
    {
      level: 3,
      name: 'Subclasse de Guerreiro',
      description:
        'Você escolhe uma subclasse de Guerreiro (Mestre de Batalha, Campeão, Cavaleiro Arcano ou Guerreiro Psíquico). Ela concede características nos níveis 3, 7, 10, 15 e 18 de Guerreiro.',
    },
    {
      level: 4,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique. Esta característica é obtida novamente nos níveis 6, 8, 12, 14 e 16 de Guerreiro.',
    },
    {
      level: 5,
      name: 'Ataque Extra',
      description:
        'Você pode atacar duas vezes, em vez de uma, sempre que realizar a ação de Ataque no seu turno.',
    },
    {
      level: 5,
      name: 'Mudança Tática',
      description:
        'Sempre que ativar Retomar o Fôlego com uma Ação Bônus, você pode se mover até metade do seu Deslocamento sem provocar Ataques de Oportunidade.',
    },
    {
      level: 6,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 7,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Guerreiro.',
    },
    {
      level: 8,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 9,
      name: 'Indomável',
      description:
        'Se falhar em uma salvaguarda, você pode jogá-la novamente com um bônus igual ao seu nível de Guerreiro, e deve usar o novo resultado. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo. Você pode usá-la duas vezes entre Descansos Longos a partir do nível 13 e três vezes a partir do nível 17.',
    },
    {
      level: 9,
      name: 'Mestre Tático',
      description:
        'Quando atacar com uma arma cuja propriedade de maestria você possa usar, você pode substituir essa propriedade pela propriedade Empurrar, Enfraquecer ou Lentidão para esse ataque.',
    },
    {
      level: 10,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Guerreiro.',
    },
    {
      level: 11,
      name: 'Dois Ataques Extras',
      description:
        'Você pode atacar três vezes, em vez de uma, sempre que realizar a ação de Ataque no seu turno.',
    },
    {
      level: 12,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 13,
      name: 'Indomável',
      description: 'Você pode usar Indomável duas vezes entre Descansos Longos.',
    },
    {
      level: 13,
      name: 'Ataques Estudados',
      description:
        'Você estuda seus oponentes e aprende com cada ataque. Se fizer uma jogada de ataque contra uma criatura e errar, você tem Vantagem na próxima jogada de ataque contra essa criatura antes do fim do seu próximo turno.',
    },
    {
      level: 14,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 15,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Guerreiro.',
    },
    {
      level: 16,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 17,
      name: 'Surto de Ação',
      description:
        'Você pode usar Surto de Ação duas vezes antes de um descanso, mas apenas uma vez no mesmo turno.',
    },
    {
      level: 17,
      name: 'Indomável',
      description: 'Você pode usar Indomável três vezes entre Descansos Longos.',
    },
    {
      level: 18,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Guerreiro.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento à sua escolha para o qual se qualifique. Recomenda-se a Dádiva da Proeza em Combate.',
    },
    {
      level: 20,
      name: 'Três Ataques Extras',
      description:
        'Você pode atacar quatro vezes, em vez de uma, sempre que realizar a ação de Ataque no seu turno.',
    },
  ],
  tableColumns: [
    {
      label: 'Retomar o Fôlego',
      values: ['2', '2', '2', '3', '3', '3', '3', '3', '3', '4', '4', '4', '4', '4', '4', '4', '4', '4', '4', '4'],
    },
    {
      label: 'Maestria em Armas',
      values: ['3', '3', '3', '4', '4', '4', '4', '4', '4', '5', '5', '5', '5', '5', '5', '6', '6', '6', '6', '6'],
    },
  ],
  subclasses: [
    {
      id: 'battle-master',
      name: 'Mestre de Batalha',
      nameEn: 'Battle Master',
      summary: 'Estudioso da guerra que usa manobras táticas alimentadas por Dados de Superioridade para controlar o combate.',
      features: [
        {
          level: 3,
          name: 'Superioridade em Combate',
          description:
            'Você aprende manobras alimentadas por dados especiais chamados Dados de Superioridade. Manobras: você aprende três manobras à sua escolha (ver o grupo de opções Manobras). Você pode usar apenas uma manobra por ataque. Aprende duas manobras adicionais nos níveis 7, 10 e 15 de Guerreiro, e sempre que ganhar um nível de Guerreiro pode substituir uma manobra conhecida por outra. Dados de Superioridade: você tem quatro Dados de Superioridade, que são d8. Um dado é gasto quando usado, e você recupera todos ao terminar um Descanso Curto ou Longo. Você ganha um Dado de Superioridade adicional no nível 7 (cinco) e outro no nível 15 (seis). Salvaguardas: se uma manobra exigir salvaguarda, a CD é 8 + seu modificador de Força ou Destreza (à sua escolha) + seu Bônus de Proficiência.',
        },
        {
          level: 3,
          name: 'Estudioso da Guerra',
          description:
            'Você ganha proficiência com um tipo de Ferramentas de Artesão à sua escolha e proficiência em uma perícia à sua escolha entre as disponíveis para Guerreiros no nível 1.',
        },
        {
          level: 7,
          name: 'Conheça seu Inimigo',
          description:
            'Como uma Ação Bônus, você pode discernir certas informações sobre uma criatura que possa ver a até 9 metros de você: você descobre quaisquer Imunidades, Resistências e Vulnerabilidades que ela tenha. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo; também pode restaurá-la gastando um Dado de Superioridade (sem ação).',
        },
        {
          level: 10,
          name: 'Superioridade em Combate Aprimorada',
          description: 'Seu Dado de Superioridade passa a ser um d10.',
        },
        {
          level: 15,
          name: 'Implacável',
          description:
            'Uma vez por turno, quando usar uma manobra, você pode rolar 1d8 e usar o resultado em vez de gastar um Dado de Superioridade.',
        },
        {
          level: 18,
          name: 'Superioridade em Combate Suprema',
          description: 'Seu Dado de Superioridade passa a ser um d12.',
        },
      ],
    },
    {
      id: 'champion',
      name: 'Campeão',
      nameEn: 'Champion',
      summary: 'Busca a excelência física no combate, desferindo golpes críticos com frequência e se recuperando sozinho.',
      features: [
        {
          level: 3,
          name: 'Crítico Aprimorado',
          description:
            'Suas jogadas de ataque com armas e Ataques Desarmados são Acertos Críticos com resultado 19 ou 20 no d20.',
        },
        {
          level: 3,
          name: 'Atleta Notável',
          description:
            'Graças ao seu vigor, você tem Vantagem em jogadas de Iniciativa e em testes de Força (Atletismo). Além disso, imediatamente após obter um Acerto Crítico, você pode se mover até metade do seu Deslocamento sem provocar Ataques de Oportunidade.',
        },
        {
          level: 7,
          name: 'Estilo de Luta Adicional',
          description: 'Você ganha outro talento de Estilo de Luta à sua escolha.',
        },
        {
          level: 10,
          name: 'Guerreiro Heroico',
          description:
            'O calor da batalha o leva ao triunfo. Durante um combate, você pode conceder a si mesmo Inspiração Heroica sempre que começar seu turno sem ela.',
        },
        {
          level: 15,
          name: 'Crítico Superior',
          description:
            'Suas jogadas de ataque com armas e Ataques Desarmados passam a ser Acertos Críticos com resultado de 18 a 20 no d20.',
        },
        {
          level: 18,
          name: 'Sobrevivente',
          description:
            'Você alcança o auge da resiliência em batalha. Desafiar a Morte: você tem Vantagem em testes de resistência contra a morte; além disso, um resultado de 18 a 20 em um desses testes conta como 20. Recuperação Heroica: no início de cada um dos seus turnos, você recupera Pontos de Vida iguais a 5 + seu modificador de Constituição se estiver Sangrando e tiver pelo menos 1 Ponto de Vida.',
        },
      ],
    },
    {
      id: 'eldritch-knight',
      name: 'Cavaleiro Arcano',
      nameEn: 'Eldritch Knight',
      summary: 'Combina a maestria marcial com o estudo da magia arcana, usando magias de Mago para proteger e atacar.',
      features: [
        {
          level: 3,
          name: 'Conjuração',
          description:
            'Você aprendeu a conjurar magias arcanas. Inteligência é seu atributo de conjuração, e você escolhe truques e magias da lista de Mago. Você pode usar um Foco Arcano como foco de conjuração. Truques conhecidos, espaços de magia e magias preparadas seguem a tabela própria do Cavaleiro Arcano. Sempre que ganhar um nível de Guerreiro, pode substituir um truque e uma magia preparada por outros da lista de Mago.',
        },
        {
          level: 3,
          name: 'Vínculo com Arma',
          description:
            'Você aprende um ritual que cria um vínculo mágico entre você e uma arma. Você realiza o ritual ao longo de 1 hora, que pode ser feito durante um Descanso Curto, e deve ter a arma ao seu alcance durante todo o processo. Depois de vinculado, você não pode ser desarmado dessa arma, a menos que esteja Incapacitado. Se ela estiver no mesmo plano de existência, você pode invocá-la como Ação Bônus, fazendo-a se teletransportar instantaneamente para a sua mão. Você pode ter até duas armas vinculadas, mas só pode invocar uma por vez com a Ação Bônus. Se tentar vincular uma terceira arma, deve quebrar o vínculo com uma das outras duas.',
        },
        {
          level: 7,
          name: 'Magia de Guerra',
          description:
            'Quando realizar a ação de Ataque no seu turno, você pode substituir um dos ataques pela conjuração de um dos seus truques de Mago que tenha tempo de conjuração de uma ação.',
        },
        {
          level: 10,
          name: 'Golpe Místico',
          description:
            'Quando atingir uma criatura com um ataque usando uma arma, essa criatura tem Desvantagem na próxima salvaguarda que fizer contra uma magia que você conjurar antes do fim do seu próximo turno.',
        },
        {
          level: 15,
          name: 'Investida Arcana',
          description:
            'Quando usar Surto de Ação, você pode se teletransportar até 9 metros para um espaço desocupado que possa ver. O teletransporte pode ocorrer antes ou depois da ação adicional.',
        },
        {
          level: 18,
          name: 'Magia de Guerra Aprimorada',
          description:
            'Quando realizar a ação de Ataque no seu turno, você pode substituir dois dos ataques pela conjuração de uma das suas magias de Mago de 1º ou 2º círculo que tenha tempo de conjuração de uma ação.',
        },
      ],
    },
    {
      id: 'psi-warrior',
      name: 'Guerreiro Psíquico',
      nameEn: 'Psi Warrior',
      summary: 'Desperta o poder psiônico da mente para ampliar sua proeza marcial com golpes e escudos telecinéticos.',
      features: [
        {
          level: 3,
          name: 'Poder Psiônico',
          description:
            'Você abriga uma fonte de energia psiônica representada por Dados de Energia Psiônica. Você tem quatro dados d6 no nível 3; o tamanho e a quantidade aumentam conforme seu nível de Guerreiro: nível 5, seis d8; nível 9, oito d8; nível 11, oito d10; nível 13, dez d10; nível 17, doze d12. Você recupera um dado gasto ao terminar um Descanso Curto e todos ao terminar um Descanso Longo. Você ganha os poderes a seguir. Campo Protetor: quando você ou outra criatura que possa ver a até 9 metros de você sofrer dano, você pode usar sua Reação para gastar um Dado de Energia Psiônica, rolá-lo e reduzir o dano sofrido em uma quantidade igual ao resultado + seu modificador de Inteligência (mínimo redução de 1). Golpe Psiônico: uma vez em cada um dos seus turnos, imediatamente após atingir um alvo a até 9 metros de você com um ataque e causar dano a ele com uma arma, você pode gastar um Dado de Energia Psiônica, rolá-lo e causar dano de Energia ao alvo igual ao resultado + seu modificador de Inteligência. Movimento Telecinético: como uma ação de Magia, você escolhe um objeto solto Grande ou menor ou uma criatura voluntária que não seja você, a até 9 metros de você, e a move até 9 metros para um espaço desocupado que possa ver; se for um objeto Minúsculo, pode movê-lo para a sua mão ou a partir dela. Depois de usar o Movimento Telecinético, você não pode usá-lo novamente até terminar um Descanso Curto ou Longo, a menos que gaste um Dado de Energia Psiônica (sem ação) para usá-lo de novo.',
        },
        {
          level: 7,
          name: 'Adepto Telecinético',
          description:
            'Você domina novas formas de usar sua telecinese. Salto Psiônico: como uma Ação Bônus, você ganha Deslocamento de Voo igual ao dobro do seu Deslocamento até o fim do turno atual. Depois de usar este benefício, não pode usá-lo novamente até terminar um Descanso Curto ou Longo, a menos que gaste um Dado de Energia Psiônica (sem ação). Impulso Telecinético: quando causar dano a um alvo com Golpe Psiônico, você pode forçá-lo a fazer uma salvaguarda de Força (CD 8 + seu modificador de Inteligência + seu Bônus de Proficiência). Se falhar, você pode deixá-lo Caído ou empurrá-lo até 3 metros em qualquer direção horizontal.',
        },
        {
          level: 10,
          name: 'Mente Protegida',
          description:
            'Você tem Resistência a dano Psíquico. Além disso, se começar seu turno Amedrontado ou Enfeitiçado, pode gastar um Dado de Energia Psiônica (sem ação) e encerrar em si todos os efeitos que causam essas condições.',
        },
        {
          level: 15,
          name: 'Baluarte de Força',
          description:
            'Como uma Ação Bônus, você pode escolher criaturas, incluindo você, a até 9 metros de você, em número igual ao seu modificador de Inteligência (mínimo uma). Cada uma tem Meia Cobertura por 1 minuto ou até você ficar Incapacitado. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um Dado de Energia Psiônica (sem ação) para usá-la de novo.',
        },
        {
          level: 18,
          name: 'Mestre Telecinético',
          description:
            'Você sempre tem a magia Telecinese preparada. Com esta característica, pode conjurá-la sem espaço de magia nem componentes, usando Inteligência como atributo de conjuração; depois de fazer isso, não pode fazê-lo novamente até terminar um Descanso Longo, a menos que gaste um Dado de Energia Psiônica (sem ação). Além disso, em cada um dos seus turnos enquanto mantiver Concentração nessa magia, incluindo o turno em que a conjurou, você pode fazer um ataque com uma arma como Ação Bônus.',
        },
      ],
      alwaysPrepared: [{ level: 18, spells: ['telekinesis'] }],
    },
  ],
  optionGroups: [
    {
      id: 'maneuvers',
      name: 'Manobras',
      subclassId: 'battle-master',
      level: 3,
      countByLevel: [0, 0, 3, 3, 3, 3, 5, 5, 5, 7, 7, 7, 7, 7, 9, 9, 9, 9, 9, 9],
      options: [
        {
          id: 'ambush',
          name: 'Emboscada',
          description:
            'Quando fizer um teste de Destreza (Furtividade) ou uma jogada de Iniciativa, você pode gastar um Dado de Superioridade e somar o resultado à jogada, a menos que esteja Incapacitado.',
        },
        {
          id: 'bait-and-switch',
          name: 'Isca e Troca',
          description:
            'Quando estiver a até 1,5 metro de outra criatura no seu turno, você pode gastar um Dado de Superioridade e trocar de lugar com ela, desde que você gaste pelo menos 1,5 metro de movimento e a criatura esteja disposta e não Incapacitada. Esse movimento não provoca Ataques de Oportunidade. Role o dado; até o início do seu próximo turno, você ou a outra criatura (à sua escolha) ganha um bônus na CA igual ao resultado.',
        },
        {
          id: 'commanders-strike',
          name: 'Golpe do Comandante',
          description:
            'Quando realizar a ação de Ataque no seu turno, você pode substituir um dos seus ataques por uma ordem a um companheiro. Escolha uma criatura disposta que possa ver ou ouvir você e gaste um Dado de Superioridade; essa criatura pode usar imediatamente a Reação dela para fazer um ataque com uma arma ou um Ataque Desarmado, somando o resultado do dado ao dano se acertar.',
        },
        {
          id: 'commanding-presence',
          name: 'Presença de Comando',
          description:
            'Quando fizer um teste de Carisma (Atuação, Intimidação ou Persuasão), você pode gastar um Dado de Superioridade e somar o resultado ao teste.',
        },
        {
          id: 'disarming-attack',
          name: 'Ataque Desarmante',
          description:
            'Quando atingir uma criatura com uma jogada de ataque usando uma arma ou um Ataque Desarmado, você pode gastar um Dado de Superioridade para tentar desarmá-la. Some o resultado do dado ao dano. O alvo faz uma salvaguarda de Força; se falhar, larga um objeto à sua escolha que esteja segurando, e o objeto cai no espaço dele.',
        },
        {
          id: 'distracting-strike',
          name: 'Golpe Distrativo',
          description:
            'Quando atingir uma criatura com uma jogada de ataque usando uma arma ou um Ataque Desarmado, você pode gastar um Dado de Superioridade para distraí-la. Some o resultado do dado ao dano. A próxima jogada de ataque contra o alvo feita por um atacante que não seja você tem Vantagem, se feita antes do início do seu próximo turno.',
        },
        {
          id: 'evasive-footwork',
          name: 'Passos Evasivos',
          description:
            'Como uma Ação Bônus, você pode gastar um Dado de Superioridade e realizar a ação Desengajar. Role o dado e some o resultado à sua CA até o início do seu próximo turno.',
        },
        {
          id: 'feinting-attack',
          name: 'Ataque Fingido',
          description:
            'Como uma Ação Bônus, você pode gastar um Dado de Superioridade para fingir um ataque contra uma criatura a até 1,5 metro de você. Você tem Vantagem na próxima jogada de ataque contra essa criatura neste turno. Se esse ataque acertar, some o resultado do dado ao dano.',
        },
        {
          id: 'goading-attack',
          name: 'Ataque Provocante',
          description:
            'Quando atingir uma criatura com uma jogada de ataque usando uma arma ou um Ataque Desarmado, você pode gastar um Dado de Superioridade para tentar provocá-la. Some o resultado do dado ao dano. O alvo faz uma salvaguarda de Sabedoria; se falhar, tem Desvantagem em jogadas de ataque contra alvos que não sejam você até o fim do seu próximo turno.',
        },
        {
          id: 'lunging-attack',
          name: 'Ataque Estendido',
          description:
            'Como uma Ação Bônus, você pode gastar um Dado de Superioridade e realizar a ação Disparada. Se você se mover pelo menos 1,5 metro em linha reta imediatamente antes de atingir com um ataque corpo a corpo como parte da ação de Ataque neste turno, some o resultado do dado ao dano desse ataque.',
        },
        {
          id: 'maneuvering-attack',
          name: 'Ataque de Manobra',
          description:
            'Quando atingir uma criatura com uma jogada de ataque usando uma arma ou um Ataque Desarmado, você pode gastar um Dado de Superioridade para manobrar um aliado para uma posição melhor. Some o resultado do dado ao dano e escolha uma criatura amigável que possa ver ou ouvir você. Ela pode usar a Reação dela para se mover até metade do Deslocamento dela sem provocar Ataques de Oportunidade do alvo do seu ataque.',
        },
        {
          id: 'menacing-attack',
          name: 'Ataque Ameaçador',
          description:
            'Quando atingir uma criatura com uma jogada de ataque usando uma arma ou um Ataque Desarmado, você pode gastar um Dado de Superioridade para tentar amedrontá-la. Some o resultado do dado ao dano. O alvo faz uma salvaguarda de Sabedoria; se falhar, fica Amedrontado por você até o fim do seu próximo turno.',
        },
        {
          id: 'parry',
          name: 'Aparar',
          description:
            'Quando outra criatura causar dano a você com uma jogada de ataque corpo a corpo, você pode usar sua Reação e gastar um Dado de Superioridade para reduzir o dano em uma quantidade igual ao resultado do dado + seu modificador de Força ou Destreza (à sua escolha).',
        },
        {
          id: 'precision-attack',
          name: 'Ataque Preciso',
          description:
            'Quando errar uma jogada de ataque, você pode gastar um Dado de Superioridade, rolá-lo e somar o resultado à jogada, possivelmente fazendo o ataque acertar.',
        },
        {
          id: 'pushing-attack',
          name: 'Ataque Empurrão',
          description:
            'Quando atingir uma criatura com uma jogada de ataque usando uma arma ou um Ataque Desarmado, você pode gastar um Dado de Superioridade para tentar empurrá-la. Some o resultado do dado ao dano. Se o alvo for Grande ou menor, ele faz uma salvaguarda de Força; se falhar, é empurrado até 4,5 metros diretamente para longe de você.',
        },
        {
          id: 'rally',
          name: 'Inspirar',
          description:
            'Como uma Ação Bônus, você pode gastar um Dado de Superioridade para fortalecer a determinação de um companheiro. Escolha um aliado a até 9 metros de você que possa ver ou ouvir você. Ele ganha Pontos de Vida Temporários iguais ao resultado do dado + metade do seu nível de Guerreiro (arredondado para baixo).',
        },
        {
          id: 'riposte',
          name: 'Contra-Ataque',
          description:
            'Quando uma criatura errar você com uma jogada de ataque corpo a corpo, você pode usar sua Reação e gastar um Dado de Superioridade para fazer um ataque corpo a corpo contra ela com uma arma ou um Ataque Desarmado. Se acertar, some o resultado do dado ao dano.',
        },
        {
          id: 'sweeping-attack',
          name: 'Ataque Abrangente',
          description:
            'Quando atingir uma criatura com uma jogada de ataque corpo a corpo usando uma arma ou um Ataque Desarmado, você pode gastar um Dado de Superioridade para tentar causar dano a outra criatura. Escolha outra criatura a até 1,5 metro do alvo original e dentro do seu alcance. Se a jogada de ataque original atingiria essa segunda criatura, ela sofre dano igual ao resultado do dado, do mesmo tipo causado pelo ataque original.',
        },
        {
          id: 'tactical-assessment',
          name: 'Avaliação Tática',
          description:
            'Quando fizer um teste de Inteligência (História ou Investigação) ou de Sabedoria (Intuição), você pode gastar um Dado de Superioridade e somar o resultado ao teste.',
        },
        {
          id: 'trip-attack',
          name: 'Ataque Derrubador',
          description:
            'Quando atingir uma criatura com uma jogada de ataque usando uma arma ou um Ataque Desarmado, você pode gastar um Dado de Superioridade para tentar derrubá-la. Some o resultado do dado ao dano. Se o alvo for Grande ou menor, ele faz uma salvaguarda de Força; se falhar, fica Caído.',
        },
      ],
    },
  ],
};
