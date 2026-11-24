import type { ClassData } from '../types';

const ASI =
  'Você ganha o talento Aumento no Valor de Atributo ou outro talento de sua escolha para o qual se qualifique.';
const SUB = 'Você ganha uma característica da sua subclasse de Ladino.';

export const ROGUE: ClassData = {
  id: 'rogue',
  name: 'Ladino',
  nameEn: 'Rogue',
  summary:
    'Especialista furtivo e versátil que confia em astúcia, precisão e perícia para explorar as fraquezas dos inimigos e superar obstáculos.',
  hitDie: 8,
  primaryAbilities: ['dex'],
  savingThrows: ['dex', 'int'],
  armorTraining: ['Armaduras Leves'],
  weaponProficiencies: ['Armas Simples', 'Armas Marciais com a propriedade Acuidade ou Leve'],
  toolProficiencies: ['Ferramentas de Ladrão'],
  skillChoices: {
    count: 4,
    options: [
      'acrobatics',
      'athletics',
      'deception',
      'insight',
      'intimidation',
      'investigation',
      'perception',
      'persuasion',
      'sleight-of-hand',
      'stealth',
    ],
  },
  features: [
    {
      level: 1,
      name: 'Especialização',
      description:
        'Você ganha Especialização em duas perícias à sua escolha nas quais tenha proficiência. Prestidigitação e Furtividade são as sugestões. No nível 6 de Ladino, você ganha Especialização em mais duas perícias com proficiência.',
    },
    {
      level: 1,
      name: 'Ataque Furtivo',
      description:
        'Você sabe explorar a distração de um inimigo. Uma vez por turno, você pode causar dano adicional a uma criatura que atingir com uma jogada de ataque, desde que tenha Vantagem nessa jogada e o ataque use uma arma com a propriedade Acuidade ou uma arma de Longo Alcance. O dano adicional é indicado na coluna Ataque Furtivo da tabela da classe (1d6 no nível 1, aumentando 1d6 a cada dois níveis até 10d6 no nível 19) e é do mesmo tipo do dano da arma. Você não precisa ter Vantagem se pelo menos um aliado seu estiver a até 1,5 metro do alvo, esse aliado não estiver Incapacitado e você não tiver Desvantagem na jogada de ataque.',
    },
    {
      level: 1,
      name: 'Gíria de Ladrão',
      description:
        'Você aprendeu a Gíria de Ladrão, um idioma secreto de jargões, códigos e sinais que permite esconder mensagens em conversas aparentemente comuns. Você também aprende um idioma adicional à sua escolha entre os idiomas disponíveis para personagens.',
    },
    {
      level: 1,
      name: 'Maestria em Armas',
      description:
        'Seu treinamento permite usar as propriedades de maestria de dois tipos de armas Simples ou Marciais de sua escolha com a propriedade Acuidade ou Leve e com as quais você tenha proficiência. Sempre que terminar um Descanso Longo, você pode trocar um desses tipos de arma por outro elegível.',
    },
    {
      level: 2,
      name: 'Ação Ardilosa',
      description:
        'Seu raciocínio e agilidade permitem agir rapidamente. No seu turno, você pode realizar uma das seguintes ações como Ação Bônus: Disparada, Desengajar ou Esconder.',
    },
    {
      level: 3,
      name: 'Subclasse de Ladino',
      description:
        'Você ganha uma subclasse de Ladino à sua escolha. A subclasse concede características nos níveis 3, 9, 13 e 17 de Ladino.',
    },
    {
      level: 3,
      name: 'Mira Firme',
      description:
        'Com uma Ação Bônus, você concede a si mesmo Vantagem na próxima jogada de ataque que fizer no turno atual. Você só pode usar esta característica se não tiver se movido durante o turno, e depois de usá-la seu Deslocamento fica 0 até o fim do turno atual.',
    },
    { level: 4, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 5,
      name: 'Golpe Astuto',
      description:
        'Você desenvolveu formas astutas de usar o Ataque Furtivo. Ao causar dano de Ataque Furtivo, você pode adicionar um dos efeitos a seguir. Cada efeito tem um custo em dados, que é o número de dados de Ataque Furtivo que você deixa de rolar; você remove os dados antes de rolar o dano e o efeito ocorre logo após o dano. Se um efeito exigir teste de resistência, a CD é 8 + seu modificador de Destreza + seu Bônus de Proficiência. Envenenar (custo 1d6): você aplica uma toxina; o alvo deve passar em um teste de resistência de Constituição ou ficará Envenenado por 1 minuto, repetindo o teste no fim de cada um dos turnos dele e encerrando o efeito com um sucesso; para usar esta opção, você precisa ter um Kit de Venenos consigo. Derrubar (custo 1d6): se o alvo for Grande ou menor, ele deve passar em um teste de resistência de Destreza ou ficará Caído. Recuar (custo 1d6): imediatamente após o ataque, você se move até metade do seu Deslocamento sem provocar Ataques de Oportunidade.',
    },
    {
      level: 5,
      name: 'Esquiva Sobrenatural',
      description:
        'Quando um atacante que você possa ver atinge você com uma jogada de ataque, você pode usar sua Reação para reduzir à metade o dano do ataque (arredondado para baixo).',
    },
    {
      level: 6,
      name: 'Especialização',
      description:
        'Você ganha Especialização em duas perícias adicionais à sua escolha nas quais tenha proficiência e ainda não tenha Especialização.',
    },
    {
      level: 7,
      name: 'Evasão',
      description:
        'Você consegue se esquivar de certos perigos com agilidade. Quando for alvo de um efeito que permita um teste de resistência de Destreza para sofrer apenas metade do dano, você não sofre dano algum se passar no teste e sofre apenas metade do dano se falhar. Você não pode usar esta característica se estiver Incapacitado.',
    },
    {
      level: 7,
      name: 'Talento Confiável',
      description:
        'Sempre que fizer um teste de atributo que use uma de suas proficiências em perícia ou ferramenta, você pode tratar um resultado de 9 ou menos no d20 como um 10.',
    },
    { level: 8, name: 'Aumento no Valor de Atributo', description: ASI },
    { level: 9, name: 'Característica de Subclasse', description: SUB },
    { level: 10, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 11,
      name: 'Golpes Aprimorados',
      description:
        'Você pode usar até dois efeitos de Golpe Astuto ao causar dano de Ataque Furtivo, pagando o custo em dados de cada um.',
    },
    { level: 12, name: 'Aumento no Valor de Atributo', description: ASI },
    { level: 13, name: 'Característica de Subclasse', description: SUB },
    {
      level: 14,
      name: 'Golpes Devastadores',
      description:
        'Você aprende novas formas de usar o Ataque Furtivo, que se somam às opções do Golpe Astuto. Atordoar (custo 2d6): o alvo deve passar em um teste de resistência de Constituição ou, no próximo turno dele, só poderá fazer uma das seguintes coisas: mover-se, realizar uma ação ou realizar uma Ação Bônus. Nocautear (custo 6d6): o alvo deve passar em um teste de resistência de Constituição ou ficará Inconsciente por 1 minuto ou até sofrer qualquer dano; ele repete o teste no fim de cada um dos turnos dele, encerrando o efeito com um sucesso. Obscurecer (custo 3d6): o alvo deve passar em um teste de resistência de Destreza ou ficará Cego até o fim do próximo turno dele.',
    },
    {
      level: 15,
      name: 'Mente Escorregadia',
      description:
        'Sua mente astuta é excepcionalmente difícil de controlar. Você ganha proficiência em testes de resistência de Sabedoria e Carisma.',
    },
    { level: 16, name: 'Aumento no Valor de Atributo', description: ASI },
    { level: 17, name: 'Característica de Subclasse', description: SUB },
    {
      level: 18,
      name: 'Elusivo',
      description:
        'Você é tão evasivo que raramente baixa a guarda. Nenhuma jogada de ataque pode ter Vantagem contra você, a menos que você esteja Incapacitado.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento de sua escolha para o qual se qualifique.',
    },
    {
      level: 20,
      name: 'Golpe de Sorte',
      description:
        'Você tem um talento sobrenatural para ter sucesso quando mais precisa. Se falhar em um Teste de D20, você pode transformar o resultado do d20 em um 20. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Curto ou Longo.',
    },
  ],
  tableColumns: [
    {
      label: 'Ataque Furtivo',
      values: [
        '1d6', '1d6', '2d6', '2d6', '3d6', '3d6', '4d6', '4d6', '5d6', '5d6',
        '6d6', '6d6', '7d6', '7d6', '8d6', '8d6', '9d6', '9d6', '10d6', '10d6',
      ],
    },
  ],
  subclasses: [
    {
      id: 'arcane-trickster',
      name: 'Trapaceiro Arcano',
      nameEn: 'Arcane Trickster',
      summary:
        'Ladinos que complementam furtividade e agilidade com magia arcana, usando ilusões e encantamentos para enganar e roubar.',
      features: [
        {
          level: 3,
          name: 'Conjuração',
          description:
            'Você aprendeu a conjurar magias arcanas. Inteligência é o seu atributo de conjuração: a CD de resistência das suas magias é 8 + modificador de Inteligência + Bônus de Proficiência, e o modificador de ataque mágico é modificador de Inteligência + Bônus de Proficiência. Truques: você aprende Mão Mágica e dois outros truques da lista de Mago à sua escolha; recebe mais um truque de Mago no nível 10 de Ladino, e sempre que ganhar um nível de Ladino pode trocar um desses truques (exceto Mão Mágica) por outro truque de Mago. Magias preparadas: você prepara magias de 1º círculo ou superior da lista de Mago, começando com três magias de 1º círculo, e a quantidade e os espaços de magia aumentam conforme a tabela de conjuração do Trapaceiro Arcano; sempre que ganhar um nível de Ladino, pode trocar uma magia preparada por outra da lista de Mago para a qual tenha espaços. Você recupera todos os espaços gastos ao terminar um Descanso Longo. Você pode usar um Foco Arcano como foco de conjuração para essas magias.',
        },
        {
          level: 3,
          name: 'Mão Mágica do Trapaceiro',
          description:
            'Quando conjura Mão Mágica, você pode fazê-lo com uma Ação Bônus, e a mão espectral fica Invisível. Você pode controlar a mão com uma Ação Bônus e, por meio dela, pode fazer testes de Destreza (Prestidigitação).',
        },
        {
          level: 9,
          name: 'Emboscada Mágica',
          description:
            'Se você estiver com a condição Invisível quando conjurar uma magia sobre uma criatura, ela tem Desvantagem em qualquer teste de resistência que fizer contra essa magia no mesmo turno.',
        },
        {
          level: 13,
          name: 'Trapaceiro Versátil',
          description:
            'Você ganha a capacidade de distrair alvos com a sua Mão Mágica. Quando usar a opção Derrubar do Golpe Astuto em uma criatura, você também pode usar essa opção em outra criatura que esteja a até 1,5 metro da mão espectral.',
        },
        {
          level: 17,
          name: 'Ladrão de Magia',
          description:
            'Você ganha a capacidade de roubar magicamente o conhecimento de como conjurar uma magia de outro conjurador. Imediatamente após uma criatura conjurar uma magia que tenha você como alvo ou inclua você na área de efeito, você pode usar sua Reação para forçá-la a fazer um teste de resistência usando o modificador do atributo de conjuração dela, contra a sua CD de magia. Se falhar, você anula o efeito da magia sobre você e rouba o conhecimento dessa magia, desde que ela seja de 1º círculo ou superior e de um círculo que você possa conjurar (não precisa ser uma magia de Mago). Pelas próximas 8 horas, você tem a magia preparada, e a criatura não pode conjurá-la até que essas 8 horas passem. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.',
        },
      ],
    },
    {
      id: 'assassin',
      name: 'Assassino',
      nameEn: 'Assassin',
      summary:
        'Ladinos especializados em emboscadas, disfarces e venenos, capazes de eliminar alvos com rapidez e precisão letais.',
      features: [
        {
          level: 3,
          name: 'Assassinar',
          description:
            'Você é perito em emboscar um alvo. Iniciativa: você tem Vantagem nas jogadas de Iniciativa. Golpes Surpreendentes: durante a primeira rodada de cada combate, você tem Vantagem em jogadas de ataque contra qualquer criatura que ainda não tenha tido um turno; se o seu Ataque Furtivo atingir qualquer alvo durante essa rodada, ele sofre dano adicional do tipo da arma igual ao seu nível de Ladino.',
        },
        {
          level: 3,
          name: 'Ferramentas do Assassino',
          description:
            'Você ganha um Kit de Disfarce e um Kit de Venenos e tem proficiência com ambos.',
        },
        {
          level: 9,
          name: 'Especialista em Infiltração',
          description:
            'Você é perito nas seguintes técnicas. Imitação Magistral: você consegue imitar com perfeição a fala, a caligrafia ou ambas de outra pessoa, desde que tenha passado pelo menos 1 hora estudando-as. Mira Itinerante: seu Deslocamento não é reduzido a 0 ao usar Mira Firme.',
        },
        {
          level: 13,
          name: 'Armas Envenenadas',
          description:
            'Quando usar a opção Envenenar do Golpe Astuto, o alvo também sofre 2d6 de dano Venenoso sempre que falhar no teste de resistência. Esse dano ignora Resistência a dano Venenoso.',
        },
        {
          level: 17,
          name: 'Golpe Mortal',
          description:
            'Quando atingir com o seu Ataque Furtivo na primeira rodada de um combate, você pode forçar o alvo a fazer um teste de resistência de Constituição (CD 8 + seu modificador de Destreza + seu Bônus de Proficiência). Se falhar, o dano do ataque contra esse alvo é dobrado.',
        },
      ],
    },
    {
      id: 'soulknife',
      name: 'Lâmina da Alma',
      nameEn: 'Soulknife',
      summary:
        'Ladinos dotados de poder psiônico que manifestam lâminas de energia psíquica e usam a mente para se comunicar e se infiltrar.',
      features: [
        {
          level: 3,
          name: 'Poder Psiônico',
          description:
            'Você abriga uma fonte de energia psiônica, representada por Dados de Energia Psiônica. Você tem 4d6 no nível 3 de Ladino, 6d8 no nível 5, 8d8 no nível 9, 8d10 no nível 11, 10d10 no nível 13 e 12d12 no nível 17. Você recupera um dado gasto ao terminar um Descanso Curto e todos ao terminar um Descanso Longo. Você conhece os seguintes poderes. Talento Psi-Reforçado: se falhar em um teste de atributo que use uma perícia ou ferramenta com a qual tenha proficiência, você pode rolar um Dado de Energia Psiônica e somar o resultado ao teste, potencialmente transformando a falha em sucesso; o dado só é gasto se o teste passar a ser um sucesso. Sussurros Psíquicos: com uma ação de Magia, escolha criaturas que você possa ver em número igual ao seu Bônus de Proficiência e role um Dado de Energia Psiônica; por um número de horas igual ao resultado, os alvos podem falar telepaticamente com você e você com eles, desde que estejam a até 1,5 quilômetro de distância. O primeiro uso deste poder após cada Descanso Longo não gasta o dado; usos seguintes gastam um dado.',
        },
        {
          level: 3,
          name: 'Lâminas Psíquicas',
          description:
            'Sempre que realizar a ação Atacar ou fizer um Ataque de Oportunidade, você pode manifestar uma Lâmina Psíquica na sua mão livre e atacar com ela. A lâmina é uma arma Simples Corpo a Corpo com as propriedades Acuidade e Arremesso (distância 18/36 metros) e a propriedade de maestria Irritar; causa 1d6 de dano Psíquico mais o modificador de atributo usado na jogada de ataque, e desaparece imediatamente após acertar ou errar o alvo. Depois de atacar com a lâmina no turno, você pode fazer um ataque corpo a corpo ou à distância com uma segunda lâmina como Ação Bônus no mesmo turno, desde que a outra mão esteja livre; o dado de dano dessa lâmina é 1d4 em vez de 1d6.',
        },
        {
          level: 9,
          name: 'Lâminas da Alma',
          description:
            'Suas Lâminas Psíquicas tornam-se uma extensão da sua psique. Golpes Teleguiados: se errar uma jogada de ataque com uma Lâmina Psíquica, você pode rolar um Dado de Energia Psiônica e somar o resultado à jogada; se isso fizer o ataque acertar, o dado é gasto. Teletransporte Psíquico: com uma Ação Bônus, você gasta um Dado de Energia Psiônica, rola-o e arremessa uma Lâmina Psíquica para um espaço desocupado que possa ver, a uma distância de até 3 metros vezes o resultado; você então se teletransporta para esse espaço e a lâmina desaparece.',
        },
        {
          level: 13,
          name: 'Véu Psíquico',
          description:
            'Com uma ação de Magia, você recebe a condição Invisível por 1 hora ou até encerrar o efeito (nenhuma ação necessária). A invisibilidade termina imediatamente após você causar dano a uma criatura ou forçar uma criatura a fazer um teste de resistência. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um Dado de Energia Psiônica para usá-la de novo.',
        },
        {
          level: 17,
          name: 'Rasgar a Mente',
          description:
            'Quando usar suas Lâminas Psíquicas para causar dano de Ataque Furtivo a uma criatura, você pode forçá-la a fazer um teste de resistência de Sabedoria (CD 8 + seu modificador de Destreza + seu Bônus de Proficiência). Se falhar, ela fica Atordoada por 1 minuto, repetindo o teste no fim de cada um dos turnos dela e encerrando o efeito com um sucesso. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste três Dados de Energia Psiônica para usá-la de novo.',
        },
      ],
    },
    {
      id: 'thief',
      name: 'Ladrão',
      nameEn: 'Thief',
      summary:
        'Ladinos especializados em furtos, arrombamentos e escaladas, também hábeis no uso improvisado de itens mágicos.',
      features: [
        {
          level: 3,
          name: 'Mãos Rápidas',
          description:
            'Com uma Ação Bônus, você pode fazer uma das seguintes coisas. Prestidigitação: fazer um teste de Destreza (Prestidigitação) para abrir uma fechadura ou desarmar uma armadilha com Ferramentas de Ladrão, ou para furtar um bolso. Usar um Objeto: realizar a ação Usar ou usar um item mágico que exija uma ação de Magia.',
        },
        {
          level: 3,
          name: 'Trabalho no Segundo Andar',
          description:
            'Você treinou para alcançar lugares de difícil acesso. Escalador: você ganha Deslocamento de Escalada igual ao seu Deslocamento. Saltador: você pode determinar a distância dos seus saltos usando Destreza em vez de Força.',
        },
        {
          level: 9,
          name: 'Furtividade Suprema',
          description:
            'Você ganha a seguinte opção de Golpe Astuto. Ataque Furtivo Oculto (custo 1d6): se você tiver a condição Invisível obtida pela ação Esconder, este ataque não encerra essa condição, desde que você termine o turno atrás de Cobertura de Três Quartos ou Cobertura Total.',
        },
        {
          level: 13,
          name: 'Usar Instrumento Mágico',
          description:
            'Você aprendeu a improvisar o uso de itens mágicos. Sintonização: você pode estar em sintonia com até quatro itens mágicos ao mesmo tempo. Cargas: sempre que usar uma propriedade de um item mágico que gaste cargas, role 1d6; com 6, você usa a propriedade sem gastar as cargas. Pergaminhos: você pode usar qualquer Pergaminho de Magia, usando Inteligência como atributo de conjuração; se a magia for um truque ou de 1º círculo, você a conjura de forma confiável; caso contrário, deve passar em um teste de Inteligência (Arcanismo) com CD 10 + o círculo da magia, e se falhar a magia não é conjurada e o pergaminho se desfaz.',
        },
        {
          level: 17,
          name: 'Reflexos de Ladrão',
          description:
            'Você é perito em armar emboscadas e escapar rapidamente do perigo. Durante a primeira rodada de cada combate, você realiza dois turnos: o primeiro na sua Iniciativa normal e o segundo na sua Iniciativa menos 10.',
        },
      ],
    },
  ],
};
