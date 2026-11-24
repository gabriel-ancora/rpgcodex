import type { ClassData } from '../types';

export const BARBARIAN: ClassData = {
  id: 'barbarian',
  name: 'Bárbaro',
  nameEn: 'Barbarian',
  summary:
    'Guerreiro feroz movido por uma fúria primitiva, que suporta castigos enormes e transforma a própria raiva em força bruta no combate corpo a corpo.',
  hitDie: 12,
  primaryAbilities: ['str'],
  savingThrows: ['str', 'con'],
  armorTraining: ['Armaduras Leves', 'Armaduras Médias', 'Escudos'],
  weaponProficiencies: ['Armas Simples', 'Armas Marciais'],
  toolProficiencies: [],
  skillChoices: {
    count: 2,
    options: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
  },
  features: [
    {
      level: 1,
      name: 'Fúria',
      description:
        'Como Ação Bônus, você pode entrar em Fúria se não estiver usando Armadura Pesada. Enquanto estiver em Fúria: você tem Resistência a dano Contundente, Cortante e Perfurante; quando faz um ataque usando Força (com uma arma ou um Ataque Desarmado) e causa dano, soma o seu Dano de Fúria (ver tabela da classe) ao dano; tem Vantagem em testes de Força e em salvaguardas de Força; e não pode conjurar magias nem manter Concentração. A Fúria dura até o fim do seu próximo turno e termina antes se você vestir Armadura Pesada ou ficar Incapacitado. Você pode prolongá-la por mais uma rodada fazendo uma jogada de ataque contra um inimigo, forçando um inimigo a fazer uma salvaguarda ou usando uma Ação Bônus para estendê-la; ela pode ser mantida assim por até 10 minutos. O número de usos é indicado na coluna Fúrias da tabela. Você recupera um uso gasto ao terminar um Descanso Curto e todos os usos ao terminar um Descanso Longo.',
    },
    {
      level: 1,
      name: 'Defesa sem Armadura',
      description:
        'Enquanto não estiver usando nenhuma armadura, sua Classe de Armadura base é 10 + seu modificador de Destreza + seu modificador de Constituição. Você pode usar um Escudo e ainda receber esse benefício.',
    },
    {
      level: 1,
      name: 'Maestria em Armas',
      description:
        'Seu treinamento permite usar a propriedade de maestria de dois tipos de armas corpo a corpo Simples ou Marciais à sua escolha. Sempre que terminar um Descanso Longo, você pode trocar um desses tipos por outro. O número de tipos de armas aumenta conforme a coluna Maestria em Armas da tabela (3 no nível 4 e 4 no nível 10).',
    },
    {
      level: 2,
      name: 'Sentido de Perigo',
      description:
        'Você tem Vantagem em salvaguardas de Destreza, a menos que esteja com a condição Incapacitado.',
    },
    {
      level: 2,
      name: 'Ataque Descuidado',
      description:
        'Ao fazer sua primeira jogada de ataque no seu turno, você pode decidir atacar de forma descuidada. Isso lhe dá Vantagem em jogadas de ataque usando Força até o início do seu próximo turno, mas jogadas de ataque contra você também têm Vantagem durante esse período.',
    },
    {
      level: 3,
      name: 'Subclasse de Bárbaro',
      description:
        'Você escolhe uma subclasse de Bárbaro (Caminho do Berserker, Caminho do Coração Selvagem, Caminho da Árvore do Mundo ou Caminho do Fanático). Ela concede características nos níveis 3, 6, 10 e 14 de Bárbaro.',
    },
    {
      level: 3,
      name: 'Conhecimento Primitivo',
      description:
        'Você ganha proficiência em mais uma perícia à sua escolha da lista de perícias do Bárbaro. Além disso, enquanto sua Fúria estiver ativa, você pode fazer testes de Acrobacia, Furtividade, Intimidação, Percepção e Sobrevivência como se fossem testes de Força, canalizando sua força primitiva.',
    },
    {
      level: 4,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique. Esta característica é obtida novamente nos níveis 8, 12 e 16 de Bárbaro.',
    },
    {
      level: 5,
      name: 'Ataque Extra',
      description:
        'Você pode atacar duas vezes, em vez de uma, sempre que realizar a ação de Ataque no seu turno.',
    },
    {
      level: 5,
      name: 'Movimento Rápido',
      description:
        'Seu Deslocamento aumenta em 3 metros enquanto você não estiver usando Armadura Pesada.',
    },
    {
      level: 6,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Bárbaro.',
    },
    {
      level: 7,
      name: 'Instinto Feral',
      description: 'Seus instintos estão tão afiados que você tem Vantagem em jogadas de Iniciativa.',
    },
    {
      level: 7,
      name: 'Bote Instintivo',
      description:
        'Como parte da Ação Bônus usada para entrar em Fúria, você pode se mover até metade do seu Deslocamento.',
    },
    {
      level: 8,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 9,
      name: 'Golpe Brutal',
      description:
        'Se usar Ataque Descuidado, você pode abrir mão da Vantagem em uma jogada de ataque baseada em Força à sua escolha no seu turno. Essa jogada não pode ter Desvantagem. Se ela acertar, o alvo sofre 1d10 de dano extra do mesmo tipo da arma ou do Ataque Desarmado, e você aplica um efeito de Golpe Brutal à sua escolha. Golpe Contundente: o alvo é empurrado até 4,5 metros para longe de você em linha reta, e você pode se mover até metade do seu Deslocamento em direção a ele sem provocar Ataques de Oportunidade. Golpe Incapacitante: o Deslocamento do alvo é reduzido em 4,5 metros até o início do seu próximo turno; um alvo só pode ser afetado por um Golpe Incapacitante por vez, o mais recente.',
    },
    {
      level: 10,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Bárbaro.',
    },
    {
      level: 11,
      name: 'Fúria Implacável',
      description:
        'Se você cair a 0 Pontos de Vida enquanto estiver em Fúria e não morrer imediatamente, pode fazer uma salvaguarda de Constituição CD 10. Se passar, seus Pontos de Vida passam a ser iguais ao dobro do seu nível de Bárbaro. Cada vez que usar esta característica após a primeira, a CD aumenta em 5. A CD volta a 10 quando você termina um Descanso Curto ou Longo.',
    },
    {
      level: 12,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 13,
      name: 'Golpe Brutal Aprimorado',
      description:
        'Você aprimora seu Golpe Brutal e ganha duas novas opções de efeito. Golpe Atordoante: o alvo tem Desvantagem na próxima salvaguarda que fizer e não pode fazer Ataques de Oportunidade até o início do seu próximo turno. Golpe Fendente: antes do início do seu próximo turno, a próxima jogada de ataque feita por outra criatura contra o alvo recebe bônus de +5. Uma jogada de ataque só pode receber um bônus de Golpe Fendente.',
    },
    {
      level: 14,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Bárbaro.',
    },
    {
      level: 15,
      name: 'Fúria Persistente',
      description:
        'Quando você rolar Iniciativa, pode recuperar todos os usos de Fúria gastos; depois de fazer isso, não pode fazê-lo novamente até terminar um Descanso Longo. Além disso, sua Fúria agora dura 10 minutos sem que você precise fazer nada para prolongá-la a cada rodada. Ela termina antes apenas se você ficar Inconsciente (não apenas Incapacitado) ou vestir Armadura Pesada.',
    },
    {
      level: 16,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 17,
      name: 'Golpe Brutal Aprimorado',
      description:
        'O dano extra do seu Golpe Brutal aumenta para 2d10. Além disso, sempre que usar o Golpe Brutal, você pode aplicar dois efeitos de Golpe Brutal diferentes.',
    },
    {
      level: 18,
      name: 'Poder Indomável',
      description:
        'Se o total de um teste de Força ou de uma salvaguarda de Força que você fizer for menor que o seu valor de Força, você pode usar esse valor no lugar do total.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento à sua escolha para o qual se qualifique. Recomenda-se a Dádiva da Investida Irresistível.',
    },
    {
      level: 20,
      name: 'Campeão Primitivo',
      description:
        'Você incorpora o poder primitivo. Seus valores de Força e Constituição aumentam em 4, até um máximo de 25.',
    },
  ],
  tableColumns: [
    {
      label: 'Fúrias',
      values: ['2', '2', '3', '3', '3', '4', '4', '4', '4', '4', '4', '5', '5', '5', '5', '5', '6', '6', '6', '6'],
    },
    {
      label: 'Dano de Fúria',
      values: ['+2', '+2', '+2', '+2', '+2', '+2', '+2', '+2', '+3', '+3', '+3', '+3', '+3', '+3', '+3', '+4', '+4', '+4', '+4', '+4'],
    },
    {
      label: 'Maestria em Armas',
      values: ['2', '2', '2', '3', '3', '3', '3', '3', '3', '4', '4', '4', '4', '4', '4', '4', '4', '4', '4', '4'],
    },
  ],
  subclasses: [
    {
      id: 'path-of-the-berserker',
      name: 'Caminho do Berserker',
      nameEn: 'Path of the Berserker',
      summary: 'Canaliza a Fúria em violência desenfreada, trocando cautela por dano e resistência mental.',
      features: [
        {
          level: 3,
          name: 'Frenesi',
          description:
            'Se usar Ataque Descuidado enquanto sua Fúria estiver ativa, você causa dano extra ao primeiro alvo que atingir no seu turno com um ataque baseado em Força. Para determinar o dano extra, role um número de d6 igual ao seu Dano de Fúria e some-os. O dano é do mesmo tipo da arma ou do Ataque Desarmado usado.',
        },
        {
          level: 6,
          name: 'Fúria Irracional',
          description:
            'Você tem Imunidade às condições Amedrontado e Enfeitiçado enquanto sua Fúria estiver ativa. Se estiver Amedrontado ou Enfeitiçado quando entrar em Fúria, essa condição termina em você.',
        },
        {
          level: 10,
          name: 'Retaliação',
          description:
            'Quando sofrer dano de uma criatura a até 1,5 metro de você, pode usar sua Reação para fazer um ataque corpo a corpo contra essa criatura, usando uma arma ou um Ataque Desarmado.',
        },
        {
          level: 14,
          name: 'Presença Intimidante',
          description:
            'Como Ação Bônus, você pode incutir terror nos outros. Cada criatura à sua escolha em uma Emanação de 9 metros originada em você faz uma salvaguarda de Sabedoria (CD 8 + seu modificador de Força + seu Bônus de Proficiência). Se falhar, fica Amedrontada por 1 minuto; ela repete a salvaguarda no fim de cada um dos turnos dela, encerrando o efeito em si em caso de sucesso. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um uso de Fúria (sem ação) para restaurá-la.',
        },
      ],
    },
    {
      id: 'path-of-the-wild-heart',
      name: 'Caminho do Coração Selvagem',
      nameEn: 'Path of the Wild Heart',
      summary: 'Vê-se como parente dos animais e assume aspectos de feras durante a Fúria.',
      features: [
        {
          level: 3,
          name: 'Falar com Animais',
          description:
            'Você pode conjurar as magias Sentido Bestial e Falar com Animais, mas apenas como Rituais. Sabedoria é seu atributo de conjuração para elas.',
        },
        {
          level: 3,
          name: 'Fúria da Natureza',
          description:
            'Sua Fúria se conecta à força primitiva dos animais. Sempre que entrar em Fúria, escolha uma das opções a seguir, que dura enquanto a Fúria estiver ativa. Urso: você tem Resistência a todos os tipos de dano, exceto Energia, Necrótico, Psíquico e Radiante. Águia: ao entrar em Fúria, você pode realizar as ações Disparada e Desengajar como parte dessa Ação Bônus; enquanto a Fúria estiver ativa, pode realizar ambas as ações como uma Ação Bônus. Lobo: seus aliados têm Vantagem em jogadas de ataque contra qualquer inimigo seu que esteja a até 1,5 metro de você.',
        },
        {
          level: 6,
          name: 'Aspecto da Natureza',
          description:
            'Você ganha uma das opções a seguir à sua escolha e pode trocá-la sempre que terminar um Descanso Longo. Coruja: você ganha Visão no Escuro com alcance de 18 metros; se já tiver Visão no Escuro, o alcance aumenta em 18 metros. Pantera: você ganha Deslocamento de Escalada igual ao seu Deslocamento. Salmão: você ganha Deslocamento de Natação igual ao seu Deslocamento.',
        },
        {
          level: 10,
          name: 'Falante da Natureza',
          description:
            'Você pode conjurar a magia Comunhão com a Natureza, mas apenas como Ritual. Sabedoria é seu atributo de conjuração para ela.',
        },
        {
          level: 14,
          name: 'Poder da Natureza',
          description:
            'Sempre que entrar em Fúria, você ganha uma das opções a seguir, que dura enquanto a Fúria estiver ativa. Falcão: enquanto não estiver usando armadura, você tem Deslocamento de Voo igual ao seu Deslocamento. Leão: inimigos a até 1,5 metro de você têm Desvantagem em jogadas de ataque contra alvos que não sejam você ou outro Bárbaro com esta opção ativa. Carneiro: quando atingir uma criatura Grande ou menor com um ataque corpo a corpo, você pode deixá-la com a condição Caído.',
        },
      ],
    },
    {
      id: 'path-of-the-world-tree',
      name: 'Caminho da Árvore do Mundo',
      nameEn: 'Path of the World Tree',
      summary: 'Conecta-se à árvore cósmica Yggdrasil, que concede vitalidade e permite viajar entre posições pelo campo de batalha.',
      features: [
        {
          level: 3,
          name: 'Vitalidade da Árvore',
          description:
            'Sua Fúria se alimenta da força vital da Árvore do Mundo. Surto de Vitalidade: ao entrar em Fúria, você ganha Pontos de Vida Temporários iguais ao seu nível de Bárbaro. Força Vivificante: no início de cada um dos seus turnos enquanto a Fúria estiver ativa, você pode escolher outra criatura a até 3 metros de você para ganhar Pontos de Vida Temporários; role um número de d6 igual ao seu Dano de Fúria e some-os. Se algum desses Pontos de Vida Temporários restar quando a Fúria terminar, eles desaparecem.',
        },
        {
          level: 6,
          name: 'Galhos da Árvore',
          description:
            'Sempre que uma criatura que você possa ver começar o turno dela a até 9 metros de você enquanto sua Fúria estiver ativa, você pode usar sua Reação para invocar galhos espectrais ao redor dela. O alvo deve ser bem-sucedido em uma salvaguarda de Força (CD 8 + seu modificador de Força + seu Bônus de Proficiência) ou é teletransportado para um espaço desocupado que você possa ver a até 1,5 metro de você ou para o espaço desocupado mais próximo que você possa ver. Depois que o alvo for teletransportado, você pode reduzir o Deslocamento dele a 0 até o fim do turno atual.',
        },
        {
          level: 10,
          name: 'Raízes Golpeantes',
          description:
            'Durante o seu turno, seu alcance é 3 metros maior com qualquer arma corpo a corpo que tenha a propriedade Pesada ou Versátil, à medida que gavinhas da Árvore do Mundo se estendem de você. Quando atingir com uma arma desse tipo no seu turno, você pode ativar a propriedade de maestria Empurrar ou Derrubar, além de outra propriedade de maestria que esteja usando com essa arma.',
        },
        {
          level: 14,
          name: 'Viajar pela Árvore',
          description:
            'Ao entrar em Fúria, e como Ação Bônus enquanto ela estiver ativa, você pode se teletransportar até 18 metros para um espaço desocupado que possa ver. Além disso, uma vez por Fúria, você pode aumentar o alcance desse teletransporte para 45 metros e levar consigo até seis criaturas voluntárias a até 3 metros de você; cada uma é teletransportada para um espaço desocupado à sua escolha a até 3 metros do seu destino.',
        },
      ],
    },
    {
      id: 'path-of-the-zealot',
      name: 'Caminho do Fanático',
      nameEn: 'Path of the Zealot',
      summary: 'Uma Fúria abastecida por um deus ou panteão, que causa dano divino e torna o bárbaro difícil de matar.',
      features: [
        {
          level: 3,
          name: 'Fúria Divina',
          description:
            'Em cada um dos seus turnos enquanto a Fúria estiver ativa, a primeira criatura que você atingir com uma arma ou um Ataque Desarmado sofre dano extra igual a 1d6 + metade do seu nível de Bárbaro (arredondado para baixo). O dano extra é Necrótico ou Radiante, à sua escolha a cada vez.',
        },
        {
          level: 3,
          name: 'Guerreiro dos Deuses',
          description:
            'Um reservatório de energia divina lhe concede quatro d12 para curar a si mesmo. Como Ação Bônus, você pode gastar dados do reservatório, rolá-los e recuperar Pontos de Vida iguais ao total. Você recupera todos os dados gastos ao terminar um Descanso Longo. O número máximo de dados no reservatório aumenta para 5 no nível 6, 6 no nível 12 e 7 no nível 17 de Bárbaro.',
        },
        {
          level: 6,
          name: 'Foco Fanático',
          description:
            'Uma vez por Fúria ativa, se falhar em uma salvaguarda, você pode jogá-la novamente com um bônus igual ao seu Dano de Fúria, e deve usar o novo resultado.',
        },
        {
          level: 10,
          name: 'Presença Fanática',
          description:
            'Como Ação Bônus, você solta um grito de guerra inspirado por energia divina. Até dez outras criaturas à sua escolha a até 18 metros de você ganham Vantagem em jogadas de ataque e salvaguardas até o início do seu próximo turno. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um uso de Fúria (sem ação) para restaurá-la.',
        },
        {
          level: 14,
          name: 'Fúria dos Deuses',
          description:
            'Ao entrar em Fúria, você pode assumir a forma de um guerreiro divino. Essa forma dura 1 minuto ou até você cair a 0 Pontos de Vida. Depois de usá-la, não pode fazê-lo novamente até terminar um Descanso Longo. Enquanto estiver nessa forma: Voo — você tem Deslocamento de Voo igual ao seu Deslocamento e pode pairar; Resistência — você tem Resistência a dano Necrótico, Psíquico e Radiante; Revivificação — quando uma criatura a até 9 metros de você fosse cair a 0 Pontos de Vida, você pode usar sua Reação e gastar um uso de Fúria para, em vez disso, fazer os Pontos de Vida do alvo passarem a ser iguais ao seu nível de Bárbaro.',
        },
      ],
    },
  ],
};
