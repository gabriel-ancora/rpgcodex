import type { ClassData } from '../types';

export const BARD: ClassData = {
  id: 'bard',
  name: 'Bardo',
  nameEn: 'Bard',
  summary:
    'Artista e erudito que tece magia por meio da música, da fala e da dança, inspirando aliados e desestabilizando inimigos.',
  hitDie: 8,
  primaryAbilities: ['cha'],
  savingThrows: ['dex', 'cha'],
  armorTraining: ['Armaduras Leves'],
  weaponProficiencies: ['Armas Simples'],
  toolProficiencies: ['Três instrumentos musicais à sua escolha'],
  skillChoices: {
    count: 3,
    options: [
      'acrobatics',
      'animal-handling',
      'arcana',
      'athletics',
      'deception',
      'history',
      'insight',
      'intimidation',
      'investigation',
      'medicine',
      'nature',
      'perception',
      'performance',
      'persuasion',
      'religion',
      'sleight-of-hand',
      'stealth',
      'survival',
    ],
  },
  features: [
    {
      level: 1,
      name: 'Inspiração de Bardo',
      description:
        'Como Ação Bônus, você pode inspirar outra criatura a até 18 metros de você que possa ver ou ouvir você. Ela ganha um Dado de Inspiração de Bardo (d6 no nível 1; ver tabela da classe). Uma vez, dentro da próxima hora, quando falhar em um Teste de D20, a criatura pode rolar esse dado e somar o resultado ao d20, possivelmente transformando a falha em sucesso. O dado é gasto ao ser rolado, e uma criatura só pode ter um Dado de Inspiração de Bardo por vez. Você pode usar esta característica um número de vezes igual ao seu modificador de Carisma (mínimo 1) e recupera todos os usos ao terminar um Descanso Longo. O dado aumenta para d8 no nível 5, d10 no nível 10 e d12 no nível 15.',
    },
    {
      level: 1,
      name: 'Conjuração',
      description:
        'Você aprendeu a conjurar magias por meio das artes bárdicas, usando Carisma como atributo de conjuração e a lista de magias de Bardo. Você pode usar um Instrumento Musical como foco de conjuração. Truques, espaços de magia e magias preparadas seguem a tabela da classe. Sempre que ganhar um nível de Bardo, você pode substituir um truque e uma magia preparada por outros da lista de Bardo.',
    },
    {
      level: 2,
      name: 'Especialização',
      description:
        'Você ganha Especialização em duas de suas perícias com proficiência, à sua escolha, dobrando o Bônus de Proficiência em testes com elas. Recomenda-se Atuação e Persuasão, se tiver proficiência nelas. No nível 9 de Bardo, você ganha Especialização em mais duas perícias com proficiência.',
    },
    {
      level: 2,
      name: 'Versatilidade',
      description:
        'Você pode somar metade do seu Bônus de Proficiência (arredondado para baixo) a qualquer teste de atributo que fizer que ainda não use seu Bônus de Proficiência.',
    },
    {
      level: 3,
      name: 'Subclasse de Bardo',
      description:
        'Você escolhe uma subclasse de Bardo (Colégio da Dança, Colégio do Glamour, Colégio do Conhecimento ou Colégio da Bravura). Ela concede características nos níveis 3, 6 e 14 de Bardo.',
    },
    {
      level: 4,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique. Esta característica é obtida novamente nos níveis 8, 12 e 16 de Bardo.',
    },
    {
      level: 5,
      name: 'Fonte de Inspiração',
      description:
        'Você passa a recuperar todos os usos gastos de Inspiração de Bardo ao terminar um Descanso Curto ou Longo. Além disso, você pode gastar um espaço de magia (sem ação) para recuperar um uso gasto de Inspiração de Bardo.',
    },
    {
      level: 6,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Bardo.',
    },
    {
      level: 7,
      name: 'Contraencanto',
      description:
        'Você pode usar notas musicais ou palavras de poder para interromper efeitos que influenciam a mente. Se você ou uma criatura a até 9 metros de você falhar em uma salvaguarda contra um efeito que aplique a condição Amedrontado ou Enfeitiçado, você pode usar sua Reação para fazer a salvaguarda ser jogada novamente, e o novo teste tem Vantagem.',
    },
    {
      level: 8,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 9,
      name: 'Especialização',
      description: 'Você ganha Especialização em mais duas de suas perícias com proficiência, à sua escolha.',
    },
    {
      level: 10,
      name: 'Segredos Mágicos',
      description:
        'Você aprendeu segredos de várias tradições mágicas. Sempre que atingir um nível de Bardo (incluindo este) e o número de magias preparadas da tabela aumentar, você pode escolher qualquer uma das novas magias preparadas das listas de Bardo, Clérigo, Druida e Mago, e elas contam como magias de Bardo para você. Além disso, ao substituir uma magia preparada, a substituta também pode vir dessas listas.',
    },
    {
      level: 12,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 14,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Bardo.',
    },
    {
      level: 16,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 18,
      name: 'Inspiração Superior',
      description:
        'Quando você rolar Iniciativa, recupera usos gastos de Inspiração de Bardo até ter dois, caso tenha menos que isso.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento à sua escolha para o qual se qualifique. Recomenda-se a Dádiva da Recordação de Magia.',
    },
    {
      level: 20,
      name: 'Palavras de Criação',
      description:
        'Você domina duas das Palavras de Criação: sempre tem as magias Palavra de Poder: Curar e Palavra de Poder: Matar preparadas. Quando conjurar qualquer uma delas, pode escolher uma segunda criatura como alvo, desde que ela esteja a até 3 metros do primeiro alvo.',
    },
  ],
  tableColumns: [
    {
      label: 'Dado de Inspiração de Bardo',
      values: ['d6', 'd6', 'd6', 'd6', 'd8', 'd8', 'd8', 'd8', 'd8', 'd10', 'd10', 'd10', 'd10', 'd10', 'd12', 'd12', 'd12', 'd12', 'd12', 'd12'],
    },
  ],
  subclasses: [
    {
      id: 'college-of-dance',
      name: 'Colégio da Dança',
      nameEn: 'College of Dance',
      summary: 'Bardos que expressam a magia pelo movimento, lutando com agilidade e conduzindo os aliados pelo campo de batalha.',
      features: [
        {
          level: 3,
          name: 'Passos Deslumbrantes',
          description:
            'Enquanto não estiver usando armadura nem empunhando um Escudo, você ganha os benefícios a seguir. Virtuose da Dança: você tem Vantagem em testes de Carisma (Atuação) que envolvam dançar. Defesa sem Armadura: sua Classe de Armadura base é 10 + seu modificador de Destreza + seu modificador de Carisma. Golpes Ágeis: quando gastar um uso de Inspiração de Bardo como parte de uma ação, Ação Bônus ou Reação, você pode fazer um Ataque Desarmado como parte dessa mesma ação, Ação Bônus ou Reação. Dano Bárdico: você pode usar Destreza em vez de Força nas jogadas de ataque dos seus Ataques Desarmados; ao causar dano com um Ataque Desarmado, pode causar dano Contundente igual a um resultado do seu Dado de Inspiração de Bardo + seu modificador de Destreza, em vez do dano normal. Essa rolagem não gasta o dado.',
        },
        {
          level: 6,
          name: 'Movimento Inspirador',
          description:
            'Quando um inimigo que você possa ver terminar o turno dele a até 1,5 metro de você, você pode usar sua Reação e gastar um uso de Inspiração de Bardo para se mover até metade do seu Deslocamento. Em seguida, um aliado à sua escolha a até 9 metros de você também pode se mover até metade do Deslocamento dele usando a Reação dele. Nenhum desses movimentos provoca Ataques de Oportunidade.',
        },
        {
          level: 6,
          name: 'Passos em Conjunto',
          description:
            'Quando rolar Iniciativa, você pode gastar um uso de Inspiração de Bardo se não estiver Incapacitado. Ao fazê-lo, role o Dado de Inspiração de Bardo; você e cada aliado a até 9 metros de você que possa ver ou ouvir você ganham um bônus na Iniciativa igual ao resultado.',
        },
        {
          level: 14,
          name: 'Evasão Conduzida',
          description:
            'Quando você for alvo de um efeito que permita uma salvaguarda de Destreza para sofrer apenas metade do dano, não sofre dano algum se for bem-sucedido e apenas metade se falhar. Se outras criaturas a até 1,5 metro de você fizerem a mesma salvaguarda, você pode compartilhar este benefício com elas nessa salvaguarda. Você não pode usar esta característica se estiver Incapacitado.',
        },
      ],
    },
    {
      id: 'college-of-glamour',
      name: 'Colégio do Glamour',
      nameEn: 'College of Glamour',
      summary: 'Bardos que aprenderam sua arte na Agrestia das Fadas e usam uma presença fascinante para encantar e proteger.',
      features: [
        {
          level: 3,
          name: 'Magia Sedutora',
          description:
            'Você sempre tem as magias Enfeitiçar Pessoa e Imagem Espelhada preparadas. Além disso, imediatamente após conjurar uma magia de Encantamento ou Ilusão usando um espaço de magia, você pode fazer uma criatura que possa ver a até 18 metros de você realizar uma salvaguarda de Sabedoria contra a CD de resistência das suas magias. Se falhar, o alvo fica Enfeitiçado ou Amedrontado (à sua escolha) por 1 minuto, repetindo a salvaguarda no fim de cada um dos turnos dele e encerrando o efeito em caso de sucesso. Depois de usar este benefício, você não pode usá-lo novamente até terminar um Descanso Longo; também pode restaurá-lo gastando um uso de Inspiração de Bardo (sem ação).',
        },
        {
          level: 3,
          name: 'Manto de Inspiração',
          description:
            'Como Ação Bônus, você pode gastar um uso de Inspiração de Bardo e rolar o Dado de Inspiração de Bardo. Escolha um número de outras criaturas a até 18 metros de você igual ao seu modificador de Carisma (mínimo uma). Cada uma ganha Pontos de Vida Temporários iguais ao dobro do resultado do dado e pode, imediatamente, usar a Reação dela para se mover até o Deslocamento dela sem provocar Ataques de Oportunidade.',
        },
        {
          level: 6,
          name: 'Manto de Majestade',
          description:
            'Sempre tem a magia Comando preparada. Como Ação Bônus, você pode conjurar Comando sem gastar um espaço de magia e assumir uma aparência sobrenatural por 1 minuto ou até sua Concentração terminar. Durante esse tempo, pode conjurar Comando como Ação Bônus sem gastar espaço de magia, e qualquer criatura Enfeitiçada por você falha automaticamente na salvaguarda contra ela. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo; também pode restaurá-la gastando um espaço de magia de 3º círculo ou superior (sem ação).',
        },
        {
          level: 14,
          name: 'Majestade Inquebrável',
          description:
            'Como Ação Bônus, você assume uma presença majestosa por 1 minuto ou até ficar Incapacitado. Durante esse tempo, sempre que uma criatura atingir você com uma jogada de ataque pela primeira vez em um turno, o atacante deve ser bem-sucedido em uma salvaguarda de Carisma contra a CD de resistência das suas magias; se falhar, o ataque erra, pois a criatura recua diante da sua majestade. Depois de assumir essa presença, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['charm-person', 'mirror-image'] },
        { level: 6, spells: ['command'] },
      ],
    },
    {
      id: 'college-of-lore',
      name: 'Colégio do Conhecimento',
      nameEn: 'College of Lore',
      summary: 'Bardos que colecionam saberes e segredos de todas as fontes e usam a palavra para minar os inimigos.',
      features: [
        {
          level: 3,
          name: 'Proficiências Adicionais',
          description: 'Você ganha proficiência em três perícias à sua escolha.',
        },
        {
          level: 3,
          name: 'Palavras Cortantes',
          description:
            'Quando uma criatura que você possa ver a até 18 metros de você fizer uma jogada de dano ou for bem-sucedida em um teste de atributo ou jogada de ataque, você pode usar sua Reação e gastar um uso de Inspiração de Bardo. Role o Dado de Inspiração de Bardo e subtraia o resultado da jogada da criatura, o que pode reduzir o dano ou transformar o sucesso em falha.',
        },
        {
          level: 6,
          name: 'Descobertas Mágicas',
          description:
            'Você aprende duas magias à sua escolha. Elas podem vir das listas de Clérigo, Druida ou Mago, em qualquer combinação, e cada uma deve ser um truque ou uma magia de um círculo para o qual você tenha espaços de magia, conforme a tabela da classe. As magias escolhidas estão sempre preparadas. Sempre que ganhar um nível de Bardo, você pode substituir uma delas por outra que atenda a esses requisitos.',
        },
        {
          level: 14,
          name: 'Perícia Inigualável',
          description:
            'Quando fizer um teste de atributo ou uma jogada de ataque e falhar, você pode gastar um uso de Inspiração de Bardo; role o Dado de Inspiração de Bardo e some o resultado ao d20, possivelmente transformando a falha em sucesso. Se ainda assim falhar, o uso de Inspiração de Bardo não é gasto.',
        },
      ],
    },
    {
      id: 'college-of-valor',
      name: 'Colégio da Bravura',
      nameEn: 'College of Valor',
      summary: 'Escaldos destemidos que preservam as façanhas dos heróis e lutam ao lado deles na linha de frente.',
      features: [
        {
          level: 3,
          name: 'Inspiração em Combate',
          description:
            'Uma criatura que tenha um Dado de Inspiração de Bardo seu pode usá-lo de uma das formas a seguir. Defesa: quando for atingida por uma jogada de ataque, a criatura pode usar a Reação dela para rolar o dado e somar o resultado à CA contra esse ataque, possivelmente fazendo-o errar. Ataque: imediatamente após atingir um alvo com uma jogada de ataque, a criatura pode rolar o dado e somar o resultado ao dano contra esse alvo.',
        },
        {
          level: 3,
          name: 'Treinamento Marcial',
          description:
            'Você ganha proficiência com Armas Marciais e treinamento com Armaduras Médias e Escudos. Além disso, pode usar uma Arma Simples ou Marcial como foco de conjuração para suas magias de Bardo.',
        },
        {
          level: 6,
          name: 'Ataque Extra',
          description:
            'Você pode atacar duas vezes, em vez de uma, sempre que realizar a ação de Ataque no seu turno. Além disso, pode conjurar um dos seus truques que tenha tempo de conjuração de uma ação no lugar de um desses ataques.',
        },
        {
          level: 14,
          name: 'Magia de Batalha',
          description:
            'Depois de conjurar uma magia que tenha tempo de conjuração de uma ação, você pode fazer um ataque com uma arma como Ação Bônus.',
        },
      ],
    },
  ],
};
