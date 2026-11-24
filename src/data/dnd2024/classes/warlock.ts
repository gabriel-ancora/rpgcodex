import type { ClassData } from '../types';

const ASI =
  'Você ganha o talento Aumento no Valor de Atributo ou outro talento de sua escolha para o qual se qualifique.';
const SUB = 'Você ganha uma característica da sua subclasse de Bruxo.';

export const WARLOCK: ClassData = {
  id: 'warlock',
  name: 'Bruxo',
  nameEn: 'Warlock',
  summary:
    'Buscador de conhecimento oculto que obtém magia por meio de um pacto com uma entidade sobrenatural, combinando Magia de Pacto e Invocações Místicas.',
  hitDie: 8,
  primaryAbilities: ['cha'],
  savingThrows: ['wis', 'cha'],
  armorTraining: ['Armaduras Leves'],
  weaponProficiencies: ['Armas Simples'],
  toolProficiencies: [],
  skillChoices: {
    count: 2,
    options: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
  },
  features: [
    {
      level: 1,
      name: 'Invocações Místicas',
      description:
        'Você desvendou Invocações Místicas, fragmentos de conhecimento proibido que concedem habilidades mágicas permanentes ou outras lições. Você ganha uma invocação à sua escolha, como Pacto do Tomo. Você ganha mais invocações conforme os níveis de Bruxo, como indicado na coluna Invocações Místicas da tabela da classe. Sempre que ganhar um nível de Bruxo, você pode trocar uma invocação conhecida por outra para a qual se qualifique, desde que a invocação trocada não seja pré-requisito de outra que você tenha. Uma invocação com pré-requisito de nível só pode ser escolhida quando você atinge esse nível de Bruxo.',
    },
    {
      level: 1,
      name: 'Magia de Pacto',
      description:
        'Por meio de cerimônias ocultas, você estabeleceu um pacto com uma entidade misteriosa para obter poderes mágicos. Carisma é o seu atributo de conjuração: a CD de resistência das suas magias é 8 + modificador de Carisma + Bônus de Proficiência, e o modificador de ataque mágico é modificador de Carisma + Bônus de Proficiência. Você conhece truques e prepara magias da lista de Bruxo nas quantidades indicadas na tabela da classe. Todos os seus espaços de Magia de Pacto são do mesmo círculo, indicado na tabela, e você recupera todos os espaços gastos ao terminar um Descanso Curto ou Longo. Sempre que ganhar um nível de Bruxo, você pode trocar um truque por outro e uma magia preparada por outra da lista de Bruxo. Você pode usar um Foco Arcano como foco de conjuração para as suas magias de Bruxo.',
    },
    {
      level: 2,
      name: 'Astúcia Mágica',
      description:
        'Você pode realizar um rito esotérico de 1 minuto. Ao final dele, você recupera espaços de Magia de Pacto gastos, mas não mais que a metade do seu máximo de espaços de Magia de Pacto (arredondado para cima). Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.',
    },
    {
      level: 3,
      name: 'Subclasse de Bruxo',
      description:
        'Você ganha uma subclasse de Bruxo à sua escolha (um Patrono). A subclasse concede características nos níveis 3, 6, 10 e 14 de Bruxo.',
    },
    { level: 4, name: 'Aumento no Valor de Atributo', description: ASI },
    { level: 6, name: 'Característica de Subclasse', description: SUB },
    { level: 8, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 9,
      name: 'Contato com o Patrono',
      description:
        'Você sempre tem a magia Contatar Outro Plano preparada. Com esta característica, você pode conjurá-la sem gastar um espaço de magia para contatar o seu patrono, e passa automaticamente no teste de resistência da magia. Depois de conjurá-la dessa forma, você não pode fazer isso novamente até terminar um Descanso Longo.',
    },
    { level: 10, name: 'Característica de Subclasse', description: SUB },
    {
      level: 11,
      name: 'Arcana Mística',
      description:
        'Seu patrono concede a você um segredo mágico chamado arcana. Escolha uma magia de Bruxo de 6º círculo como esta arcana. Você pode conjurá-la uma vez sem gastar um espaço de magia e recupera essa capacidade ao terminar um Descanso Longo. Sempre que ganhar um nível de Bruxo, você pode trocar uma magia de Arcana Mística por outra magia de Bruxo do mesmo círculo.',
    },
    { level: 12, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 13,
      name: 'Arcana Mística',
      description:
        'Você ganha outra Arcana Mística: escolha uma magia de Bruxo de 7º círculo, que pode conjurar uma vez sem gastar espaço de magia, recuperando esse uso ao terminar um Descanso Longo.',
    },
    { level: 14, name: 'Característica de Subclasse', description: SUB },
    {
      level: 15,
      name: 'Arcana Mística',
      description:
        'Você ganha outra Arcana Mística: escolha uma magia de Bruxo de 8º círculo, que pode conjurar uma vez sem gastar espaço de magia, recuperando esse uso ao terminar um Descanso Longo.',
    },
    { level: 16, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 17,
      name: 'Arcana Mística',
      description:
        'Você ganha outra Arcana Mística: escolha uma magia de Bruxo de 9º círculo, que pode conjurar uma vez sem gastar espaço de magia, recuperando esse uso ao terminar um Descanso Longo.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento de sua escolha para o qual se qualifique.',
    },
    {
      level: 20,
      name: 'Mestre Místico',
      description:
        'Quando usar a sua característica Astúcia Mágica, você recupera todos os seus espaços de Magia de Pacto gastos.',
    },
  ],
  tableColumns: [
    {
      label: 'Invocações Místicas',
      values: ['1', '3', '3', '3', '5', '5', '6', '6', '7', '7', '7', '8', '8', '8', '9', '9', '9', '10', '10', '10'],
    },
  ],
  subclasses: [
    {
      id: 'archfey-patron',
      name: 'Patrono Arquifada',
      nameEn: 'Archfey Patron',
      summary:
        'Bruxos ligados a um senhor ou senhora da Agrestia das Fadas, que concede magia de teletransporte, encantamento e ilusão.',
      features: [
        {
          level: 3,
          name: 'Magias do Arquifada',
          description:
            'Ao atingir os níveis de Bruxo indicados, você passa a ter sempre preparadas: nível 3, Acalmar Emoções, Fogo das Fadas, Passo Nebuloso, Força Fantasmagórica e Sono; nível 5, Piscar e Ampliar Plantas; nível 7, Dominar Fera e Invisibilidade Maior; nível 9, Dominar Pessoa e Similaridade.',
        },
        {
          level: 3,
          name: 'Passos Feéricos',
          description:
            'Seu patrono concede a capacidade de se mover entre as fronteiras dos planos. Você pode conjurar Passo Nebuloso sem gastar um espaço de magia um número de vezes igual ao seu modificador de Carisma (mínimo de uma) e recupera todos os usos ao terminar um Descanso Longo. Além disso, sempre que conjurar essa magia, você pode escolher um dos efeitos adicionais a seguir. Passo Revigorante: imediatamente após se teletransportar, você ou uma criatura que possa ver a até 3 metros de você ganha 1d10 Pontos de Vida Temporários. Passo Provocador: as criaturas a até 1,5 metro do espaço que você deixou devem passar em um teste de resistência de Sabedoria contra a sua CD de magia ou terão Desvantagem em jogadas de ataque contra criaturas que não sejam você até o início do seu próximo turno.',
        },
        {
          level: 6,
          name: 'Fuga Nebulosa',
          description:
            'Você pode conjurar Passo Nebuloso como Reação quando sofrer dano. Além disso, as opções a seguir passam a estar disponíveis para os seus Passos Feéricos. Passo Evanescente: você recebe a condição Invisível até o início do seu próximo turno ou até imediatamente após fazer uma jogada de ataque, causar dano ou conjurar uma magia. Passo Terrível: as criaturas a até 1,5 metro do espaço que você deixou ou do espaço em que aparecer (à sua escolha) devem passar em um teste de resistência de Sabedoria contra a sua CD de magia ou sofrerão 2d10 de dano Psíquico.',
        },
        {
          level: 10,
          name: 'Defesas Sedutoras',
          description:
            'Seu patrono ensina você a voltar contra os inimigos as magias que afetam a mente. Você tem Imunidade à condição Enfeitiçado. Além disso, imediatamente após uma criatura que você possa ver atingi-lo com uma jogada de ataque, você pode usar sua Reação para reduzir o dano sofrido à metade (arredondado para baixo) e forçar o atacante a fazer um teste de resistência de Sabedoria contra a sua CD de magia; se falhar, o atacante sofre dano Psíquico igual ao dano que você sofreu. Depois de usar esta Reação, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um espaço de Magia de Pacto para restaurar o uso.',
        },
        {
          level: 14,
          name: 'Magia Encantadora',
          description:
            'Seu patrono concede a capacidade de entrelaçar sua magia com o teletransporte. Imediatamente após conjurar uma magia de Encantamento ou Ilusão usando uma ação e um espaço de magia, você pode conjurar Passo Nebuloso como parte da mesma ação sem gastar um espaço de magia.',
        },
      ],
      alwaysPrepared: [
        {
          level: 3,
          spells: ['calm-emotions', 'faerie-fire', 'misty-step', 'phantasmal-force', 'sleep'],
        },
        { level: 5, spells: ['blink', 'plant-growth'] },
        { level: 7, spells: ['dominate-beast', 'greater-invisibility'] },
        { level: 9, spells: ['dominate-person', 'seeming'] },
      ],
    },
    {
      id: 'celestial-patron',
      name: 'Patrono Celestial',
      nameEn: 'Celestial Patron',
      summary:
        'Bruxos que fizeram um pacto com um ser dos Planos Superiores, recebendo magia de cura e de luz radiante.',
      features: [
        {
          level: 3,
          name: 'Magias Celestiais',
          description:
            'Ao atingir os níveis de Bruxo indicados, você passa a ter sempre preparadas: nível 3, Auxílio, Curar Ferimentos, Raio Guia, Restauração Menor, Luz e Chama Sagrada; nível 5, Luz do Dia e Revivificar; nível 7, Guardião da Fé e Muralha de Fogo; nível 9, Restauração Maior e Invocar Celestial.',
        },
        {
          level: 3,
          name: 'Luz Curativa',
          description:
            'Você ganha a capacidade de canalizar energia celestial para curar ferimentos. Você tem uma reserva de d6 para esse fim, em quantidade igual a 1 + seu nível de Bruxo. Com uma Ação Bônus, você pode curar a si mesmo ou uma criatura que possa ver a até 18 metros, gastando dados da reserva. A quantidade máxima de dados gastos de uma vez é igual ao seu modificador de Carisma (mínimo de um). Role os dados gastos e restaure Pontos de Vida iguais ao total. Você recupera todos os dados gastos ao terminar um Descanso Longo.',
        },
        {
          level: 6,
          name: 'Alma Radiante',
          description:
            'Seu vínculo com o patrono permite que você sirva como canal de energia radiante. Você tem Resistência a dano Radiante. Uma vez por turno, quando uma magia que você conjurar causar dano Radiante ou de Fogo, você pode somar seu modificador de Carisma ao dano dessa magia contra um dos alvos.',
        },
        {
          level: 10,
          name: 'Resiliência Celestial',
          description:
            'Você ganha Pontos de Vida Temporários sempre que usar a sua característica Astúcia Mágica ou terminar um Descanso Curto ou Longo. Esses Pontos de Vida Temporários são iguais ao seu nível de Bruxo mais o seu modificador de Carisma. Além disso, escolha até cinco criaturas que você possa ver quando ganhar esses pontos; cada uma delas ganha Pontos de Vida Temporários iguais à metade do seu nível de Bruxo mais o seu modificador de Carisma.',
        },
        {
          level: 14,
          name: 'Vingança Calcinante',
          description:
            'Quando você ou um aliado a até 18 metros de você estiver prestes a fazer um Teste de Resistência contra a Morte, você pode liberar energia radiante para salvar a criatura. Ela recupera Pontos de Vida iguais à metade do seu máximo de Pontos de Vida e pode encerrar a condição Caído sobre si. Cada criatura de sua escolha a até 9 metros dela sofre dano Radiante igual a 2d8 + seu modificador de Carisma e fica Cega até o fim do turno atual. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.',
        },
      ],
      alwaysPrepared: [
        {
          level: 3,
          spells: ['aid', 'cure-wounds', 'guiding-bolt', 'lesser-restoration', 'light', 'sacred-flame'],
        },
        { level: 5, spells: ['daylight', 'revivify'] },
        { level: 7, spells: ['guardian-of-faith', 'wall-of-fire'] },
        { level: 9, spells: ['greater-restoration', 'summon-celestial'] },
      ],
    },
    {
      id: 'fiend-patron',
      name: 'Patrono Ínfero',
      nameEn: 'Fiend Patron',
      summary:
        'Bruxos que fizeram um pacto com um ser dos Planos Inferiores, como um demônio, diabo ou yugoloth, ganhando magia de fogo e resistência.',
      features: [
        {
          level: 3,
          name: 'Magias do Ínfero',
          description:
            'Ao atingir os níveis de Bruxo indicados, você passa a ter sempre preparadas: nível 3, Mãos Flamejantes, Comando, Raio Ardente e Sugestão; nível 5, Bola de Fogo e Névoa Fétida; nível 7, Escudo de Fogo e Muralha de Fogo; nível 9, Missão e Praga de Insetos.',
        },
        {
          level: 3,
          name: 'Bênção do Tenebroso',
          description:
            'Quando você reduz um inimigo a 0 Pontos de Vida, ganha Pontos de Vida Temporários iguais ao seu modificador de Carisma mais o seu nível de Bruxo (mínimo de 1). Você também ganha esse benefício se outra criatura reduzir a 0 Pontos de Vida um inimigo que esteja a até 3 metros de você.',
        },
        {
          level: 6,
          name: 'Sorte do Tenebroso',
          description:
            'Você pode invocar seu patrono para alterar o destino a seu favor. Quando fizer um teste de atributo ou de resistência, você pode usar esta característica para somar 1d10 ao resultado, depois de ver a rolagem, mas antes de conhecer o efeito. Você pode usar esta característica um número de vezes igual ao seu modificador de Carisma (mínimo de uma), mas não mais de uma vez por rolagem, e recupera todos os usos ao terminar um Descanso Longo.',
        },
        {
          level: 10,
          name: 'Resiliência Ínfera',
          description:
            'Escolha um tipo de dano, exceto Energia, sempre que terminar um Descanso Curto ou Longo. Você tem Resistência a esse tipo de dano até escolher outro com esta característica.',
        },
        {
          level: 14,
          name: 'Arremessar Através do Inferno',
          description:
            'Uma vez por turno, quando atingir uma criatura com uma jogada de ataque, você pode tentar transportá-la instantaneamente através dos Planos Inferiores. O alvo deve fazer um teste de resistência de Carisma contra a sua CD de magia. Se falhar, ele desaparece e atravessa uma paisagem de pesadelo, sofrendo 8d10 de dano Psíquico se não for um Corruptor, e fica com a condição Incapacitado até o fim do seu próximo turno, quando retorna ao espaço que ocupava antes ou ao espaço desocupado mais próximo. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um espaço de Magia de Pacto para restaurar o uso.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['burning-hands', 'command', 'scorching-ray', 'suggestion'] },
        { level: 5, spells: ['fireball', 'stinking-cloud'] },
        { level: 7, spells: ['fire-shield', 'wall-of-fire'] },
        { level: 9, spells: ['geas', 'insect-plague'] },
      ],
    },
    {
      id: 'great-old-one-patron',
      name: 'Patrono Grande Antigo',
      nameEn: 'Great Old One Patron',
      summary:
        'Bruxos ligados a uma entidade incompreensível do Reino Distante ou de eras esquecidas, que concede poderes telepáticos e magia que distorce a mente.',
      features: [
        {
          level: 3,
          name: 'Magias do Grande Antigo',
          description:
            'Ao atingir os níveis de Bruxo indicados, você passa a ter sempre preparadas: nível 3, Detectar Pensamentos, Sussurros Dissonantes, Força Fantasmagórica e Riso Histérico de Tasha; nível 5, Clarividência e Fome de Hadar; nível 7, Confusão e Invocar Aberração; nível 9, Modificar Memória e Telecinese.',
        },
        {
          level: 3,
          name: 'Mente Desperta',
          description:
            'Você pode formar uma conexão telepática entre a sua mente e a de outra criatura. Com uma Ação Bônus, escolha uma criatura que você possa ver a até 9 metros. Você e ela podem falar telepaticamente um com o outro enquanto estiverem a uma distância de até 1,5 quilômetro vezes o seu modificador de Carisma (mínimo de 1,5 quilômetro). Para se entenderem, ambos precisam usar mentalmente um idioma que o outro conheça. A conexão dura um número de minutos igual ao seu nível de Bruxo e termina antes se você usar esta característica para se conectar a outra criatura.',
        },
        {
          level: 3,
          name: 'Feitiços Psíquicos',
          description:
            'Quando conjurar uma magia de Bruxo que cause dano, você pode trocar o tipo de dano dela para Psíquico. Além disso, quando conjurar uma magia de Bruxo da escola de Encantamento ou Ilusão, você pode fazê-lo sem componentes Verbais ou Somáticos.',
        },
        {
          level: 6,
          name: 'Combatente Clarividente',
          description:
            'Quando formar uma conexão telepática com uma criatura usando Mente Desperta, você pode forçá-la a fazer um teste de resistência de Sabedoria contra a sua CD de magia. Se falhar, enquanto a conexão durar, a criatura tem Desvantagem em jogadas de ataque contra você e você tem Vantagem em jogadas de ataque contra ela. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Curto ou Longo, a menos que gaste um espaço de Magia de Pacto para restaurar o uso.',
        },
        {
          level: 10,
          name: 'Maldição Mística',
          description:
            'Seu patrono alienígena concede a você uma maldição poderosa. Você sempre tem a magia Bruxaria preparada. Quando conjurar Bruxaria e escolher um atributo, o alvo também tem Desvantagem em testes de resistência do atributo escolhido enquanto a magia durar.',
        },
        {
          level: 10,
          name: 'Escudo de Pensamentos',
          description:
            'Seus pensamentos não podem ser lidos por telepatia ou outros meios, a menos que você permita. Você também tem Resistência a dano Psíquico e, sempre que uma criatura causar dano Psíquico a você, ela sofre a mesma quantidade de dano que você sofreu.',
        },
        {
          level: 14,
          name: 'Criar Servo',
          description:
            'Quando conjurar Invocar Aberração, você pode modificá-la para que não exija Concentração. Nesse caso, a duração da magia passa a ser de 1 minuto para essa conjuração, e a Aberração invocada recebe Pontos de Vida Temporários iguais ao seu nível de Bruxo mais o seu modificador de Carisma. Além disso, na primeira vez em cada turno que a Aberração atingir uma criatura sob efeito da sua Bruxaria, ela causa dano Psíquico adicional ao alvo igual ao dano adicional dessa magia.',
        },
      ],
      alwaysPrepared: [
        {
          level: 3,
          spells: ['detect-thoughts', 'dissonant-whispers', 'phantasmal-force', 'tashas-hideous-laughter'],
        },
        { level: 5, spells: ['clairvoyance', 'hunger-of-hadar'] },
        { level: 7, spells: ['confusion', 'summon-aberration'] },
        { level: 9, spells: ['modify-memory', 'telekinesis'] },
        { level: 10, spells: ['hex'] },
      ],
    },
  ],
  optionGroups: [
    {
      id: 'eldritch-invocations',
      name: 'Invocações Místicas',
      level: 1,
      countByLevel: [1, 3, 3, 3, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10],
      options: [
        {
          id: 'agonizing-blast',
          name: 'Explosão Agonizante',
          prerequisite: 'Nível 2+ de Bruxo e um truque de Bruxo que cause dano',
          minLevel: 2,
          description:
            'Escolha um dos seus truques de Bruxo que cause dano. Você soma seu modificador de Carisma às jogadas de dano desse truque. Esta invocação pode ser escolhida mais de uma vez, sempre para um truque elegível diferente.',
        },
        {
          id: 'armor-of-shadows',
          name: 'Armadura de Sombras',
          description:
            'Você pode conjurar Armadura Arcana em si mesmo sem gastar um espaço de magia.',
        },
        {
          id: 'ascendant-step',
          name: 'Passo Ascendente',
          prerequisite: 'Nível 5+ de Bruxo',
          minLevel: 5,
          description: 'Você pode conjurar Levitação em si mesmo sem gastar um espaço de magia.',
        },
        {
          id: 'devils-sight',
          name: 'Visão do Diabo',
          prerequisite: 'Nível 2+ de Bruxo',
          minLevel: 2,
          description:
            'Você pode ver normalmente em Penumbra e Escuridão, tanto mágica quanto não mágica, a até 36 metros de você.',
        },
        {
          id: 'devouring-blade',
          name: 'Lâmina Devoradora',
          prerequisite: 'Nível 12+ de Bruxo e a invocação Lâmina Sedenta',
          minLevel: 12,
          description:
            'O Ataque Extra concedido pela invocação Lâmina Sedenta passa a conceder dois ataques adicionais em vez de um.',
        },
        {
          id: 'eldritch-mind',
          name: 'Mente Mística',
          description:
            'Você tem Vantagem em testes de resistência de Constituição feitos para manter Concentração.',
        },
        {
          id: 'eldritch-smite',
          name: 'Destruição Mística',
          prerequisite: 'Nível 5+ de Bruxo e a invocação Pacto da Lâmina',
          minLevel: 5,
          description:
            'Uma vez por turno, quando atingir uma criatura com a sua arma de pacto, você pode gastar um espaço de Magia de Pacto para causar 1d8 de dano de Energia adicional ao alvo, mais 1d8 por círculo do espaço, e pode deixar o alvo Caído se ele for Enorme ou menor.',
        },
        {
          id: 'eldritch-spear',
          name: 'Lança Mística',
          prerequisite: 'Nível 2+ de Bruxo e um truque de Bruxo que cause dano',
          minLevel: 2,
          description:
            'Escolha um dos seus truques de Bruxo que cause dano e tenha alcance de 3 metros ou mais. Quando conjurar esse truque, o alcance dele aumenta em uma distância igual a 9 metros vezes o seu nível de Bruxo. Esta invocação pode ser escolhida mais de uma vez, sempre para um truque elegível diferente.',
        },
        {
          id: 'fiendish-vigor',
          name: 'Vigor Ínfero',
          prerequisite: 'Nível 2+ de Bruxo',
          minLevel: 2,
          description:
            'Você pode conjurar Vitalidade Falsa em si mesmo sem gastar um espaço de magia. Ao conjurá-la dessa forma, você não rola os dados de Pontos de Vida Temporários; em vez disso, recebe automaticamente o resultado máximo.',
        },
        {
          id: 'gaze-of-two-minds',
          name: 'Olhar de Duas Mentes',
          prerequisite: 'Nível 5+ de Bruxo',
          minLevel: 5,
          description:
            'Com uma Ação Bônus, você toca uma criatura voluntária e percebe o mundo através dos sentidos dela até o fim do seu próximo turno. Enquanto a criatura estiver no mesmo plano de existência que você, nos turnos seguintes você pode usar uma Ação Bônus para estender a duração até o fim do seu próximo turno. Enquanto perceber através dos sentidos da outra criatura, você se beneficia de quaisquer sentidos especiais dela, e pode conjurar magias como se estivesse no seu espaço ou no espaço da outra criatura, desde que vocês estejam a até 18 metros um do outro.',
        },
        {
          id: 'gift-of-the-depths',
          name: 'Dádiva das Profundezas',
          prerequisite: 'Nível 5+ de Bruxo',
          minLevel: 5,
          description:
            'Você pode respirar debaixo da água e ganha Deslocamento de Natação igual ao seu Deslocamento. Você também pode conjurar Respirar na Água uma vez sem gastar um espaço de magia, recuperando essa capacidade ao terminar um Descanso Longo.',
        },
        {
          id: 'gift-of-the-protectors',
          name: 'Dádiva dos Protetores',
          prerequisite: 'Nível 9+ de Bruxo e a invocação Pacto do Tomo',
          minLevel: 9,
          description:
            'Uma nova página aparece no seu Livro das Sombras quando você o conjura. Com a sua permissão, uma criatura pode usar uma ação para escrever seu nome nessa página, que comporta um número de nomes igual ao seu modificador de Carisma (mínimo de um). Quando uma criatura cujo nome esteja na página for reduzida a 0 Pontos de Vida, mas não for morta imediatamente, ela cai a 1 Ponto de Vida em vez disso. Depois que esse benefício for usado, nenhuma criatura pode se beneficiar dele novamente até você terminar um Descanso Longo. Com uma ação de Magia, você pode apagar um nome da página tocando-o.',
        },
        {
          id: 'investment-of-the-chain-master',
          name: 'Investidura do Mestre das Correntes',
          prerequisite: 'Nível 5+ de Bruxo e a invocação Pacto da Corrente',
          minLevel: 5,
          description:
            'Quando conjurar Convocar Familiar, você infunde o familiar invocado com uma parte do seu poder, concedendo a ele os seguintes benefícios. Aéreo ou Aquático: o familiar ganha Deslocamento de Voo ou de Natação (à sua escolha) de 12 metros. Ataque Rápido: com uma Ação Bônus, você pode comandar o familiar a realizar a ação Atacar. Dano Necrótico ou Radiante: sempre que o familiar causar dano Contundente, Cortante ou Perfurante, você pode fazer com que ele cause dano Necrótico ou Radiante. Sua CD de Resistência: se o familiar forçar uma criatura a fazer um teste de resistência, ele usa a sua CD de magia. Resistência: quando o familiar sofrer dano, você pode usar sua Reação para conceder a ele Resistência a esse dano.',
        },
        {
          id: 'lessons-of-the-first-ones',
          name: 'Lições dos Primordiais',
          prerequisite: 'Nível 2+ de Bruxo',
          minLevel: 2,
          description:
            'Você recebeu conhecimento de uma entidade ancestral do multiverso, o que permite ganhar um talento de Origem à sua escolha. Esta invocação pode ser escolhida mais de uma vez, sempre para um talento de Origem diferente, a menos que o talento seja repetível.',
        },
        {
          id: 'lifedrinker',
          name: 'Bebedor de Vida',
          prerequisite: 'Nível 9+ de Bruxo e a invocação Pacto da Lâmina',
          minLevel: 9,
          description:
            'Uma vez por turno, quando atingir uma criatura com a sua arma de pacto, você pode causar 1d6 de dano adicional Necrótico, Psíquico ou Radiante (à sua escolha) à criatura, e pode gastar um dos seus Dados de Ponto de Vida para rolá-lo e recuperar Pontos de Vida iguais ao resultado mais o seu modificador de Constituição (mínimo de 1 Ponto de Vida).',
        },
        {
          id: 'mask-of-many-faces',
          name: 'Máscara das Muitas Faces',
          prerequisite: 'Nível 2+ de Bruxo',
          minLevel: 2,
          description: 'Você pode conjurar Disfarçar-se sem gastar um espaço de magia.',
        },
        {
          id: 'master-of-myriad-forms',
          name: 'Mestre das Formas Infinitas',
          prerequisite: 'Nível 5+ de Bruxo',
          minLevel: 5,
          description: 'Você pode conjurar Alterar-se sem gastar um espaço de magia.',
        },
        {
          id: 'misty-visions',
          name: 'Visões Nebulosas',
          prerequisite: 'Nível 2+ de Bruxo',
          minLevel: 2,
          description: 'Você pode conjurar Imagem Silenciosa sem gastar um espaço de magia.',
        },
        {
          id: 'one-with-shadows',
          name: 'Um com as Sombras',
          prerequisite: 'Nível 5+ de Bruxo',
          minLevel: 5,
          description:
            'Enquanto estiver em uma área de Penumbra ou Escuridão, você pode conjurar Invisibilidade em si mesmo sem gastar um espaço de magia.',
        },
        {
          id: 'otherworldly-leap',
          name: 'Salto Sobrenatural',
          prerequisite: 'Nível 2+ de Bruxo',
          minLevel: 2,
          description: 'Você pode conjurar Salto em si mesmo sem gastar um espaço de magia.',
        },
        {
          id: 'pact-of-the-blade',
          name: 'Pacto da Lâmina',
          description:
            'Com uma Ação Bônus, você pode conjurar uma arma de pacto na sua mão, uma arma Simples ou Marcial Corpo a Corpo à sua escolha com a qual você cria um vínculo, ou criar um vínculo com uma arma mágica que esteja tocando; você não pode criar vínculo com uma arma mágica se outra criatura estiver em sintonia com ela ou se ela for senciente. Até o vínculo terminar, você tem proficiência com a arma e pode usá-la como foco de conjuração. Sempre que atacar com a arma vinculada, você pode usar seu modificador de Carisma nas jogadas de ataque e de dano em vez de Força ou Destreza, e pode fazer com que ela cause dano Necrótico, Psíquico ou Radiante, ou o tipo de dano normal da arma. O vínculo termina se você usar esta característica novamente, se a arma ficar a mais de 1,5 metro de você por 1 minuto ou mais, ou se você morrer. Uma arma conjurada desaparece quando o vínculo termina.',
        },
        {
          id: 'pact-of-the-chain',
          name: 'Pacto da Corrente',
          description:
            'Você aprende a magia Convocar Familiar e pode conjurá-la como uma ação de Magia sem gastar um espaço de magia. Ao conjurá-la, você escolhe uma das formas normais do familiar ou uma das formas especiais a seguir: Diabrete, Pseudodragão, Quasit, Esqueleto, Girino Slaad, Esfinge das Maravilhas, Sprite ou Serpente Venenosa. Além disso, quando realizar a ação Atacar, você pode abrir mão de um dos seus ataques para permitir que o familiar faça um ataque próprio usando a Reação dele.',
        },
        {
          id: 'pact-of-the-tome',
          name: 'Pacto do Tomo',
          description:
            'Entrelaçando fios de sombra, você conjura um livro na sua mão ao terminar um Descanso Curto ou Longo. Este Livro das Sombras (você escolhe sua aparência) contém magia mística que só você pode acessar. Quando o livro aparece, escolha três truques e duas magias de 1º círculo com o marcador Ritual, de qualquer lista de classe; elas não precisam ser da mesma lista. Enquanto o livro estiver com você, essas magias estão preparadas e funcionam como magias de Bruxo para você. Você pode usar o livro como foco de conjuração. Você pode trocar as magias escolhidas sempre que conjurar o livro novamente. O livro desaparece se você conjurar outro ou se morrer.',
        },
        {
          id: 'repelling-blast',
          name: 'Explosão Repulsiva',
          prerequisite: 'Nível 2+ de Bruxo e um truque de Bruxo que cause dano por meio de jogada de ataque',
          minLevel: 2,
          description:
            'Escolha um dos seus truques de Bruxo que exija jogada de ataque. Quando atingir uma criatura Grande ou menor com esse truque, você pode empurrá-la até 3 metros em linha reta para longe de você. Esta invocação pode ser escolhida mais de uma vez, sempre para um truque elegível diferente.',
        },
        {
          id: 'thirsting-blade',
          name: 'Lâmina Sedenta',
          prerequisite: 'Nível 5+ de Bruxo e a invocação Pacto da Lâmina',
          minLevel: 5,
          description:
            'Você ganha a característica Ataque Extra apenas para a sua arma de pacto. Com ela, você pode atacar duas vezes com essa arma, em vez de uma, sempre que realizar a ação Atacar no seu turno.',
        },
        {
          id: 'visions-of-distant-realms',
          name: 'Visões de Reinos Distantes',
          prerequisite: 'Nível 9+ de Bruxo',
          minLevel: 9,
          description: 'Você pode conjurar Olho Arcano sem gastar um espaço de magia.',
        },
        {
          id: 'whispers-of-the-grave',
          name: 'Sussurros da Sepultura',
          prerequisite: 'Nível 7+ de Bruxo',
          minLevel: 7,
          description: 'Você pode conjurar Falar com os Mortos sem gastar um espaço de magia.',
        },
        {
          id: 'witch-sight',
          name: 'Visão Bruxa',
          prerequisite: 'Nível 15+ de Bruxo',
          minLevel: 15,
          description: 'Você ganha Visão Verdadeira com alcance de 9 metros.',
        },
      ],
    },
  ],
};
