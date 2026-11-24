import type { ClassData } from '../types';

export const DRUID: ClassData = {
  id: 'druid',
  name: 'Druida',
  nameEn: 'Druid',
  summary:
    'Sacerdote da Antiga Fé que invoca as forças da natureza, conjura magias primais e assume formas de animais.',
  hitDie: 8,
  primaryAbilities: ['wis'],
  savingThrows: ['int', 'wis'],
  armorTraining: ['Armaduras Leves', 'Escudos'],
  weaponProficiencies: ['Armas Simples'],
  toolProficiencies: ['Kit de Herbalismo'],
  skillChoices: {
    count: 2,
    options: ['arcana', 'animal-handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
  },
  features: [
    {
      level: 1,
      name: 'Conjuração',
      description:
        'Você conjura magias por meio da essência da natureza, usando Sabedoria como atributo de conjuração e a lista de magias de Druida. Você pode usar um Foco Druídico como foco de conjuração. Truques, espaços de magia e magias preparadas seguem a tabela da classe. Sempre que terminar um Descanso Longo, pode mudar sua lista de magias preparadas, e sempre que ganhar um nível de Druida pode substituir um truque.',
    },
    {
      level: 1,
      name: 'Druídico',
      description:
        'Você conhece o Druídico, a língua secreta dos druidas. Enquanto o conhecer, você sempre tem a magia Falar com Animais preparada. Você pode usar o Druídico para deixar mensagens ocultas: você e outros que conhecem o idioma a identificam automaticamente; outros a percebem com um teste bem-sucedido de Inteligência (Investigação) CD 15, mas só conseguem decifrá-la por meio de magia.',
    },
    {
      level: 1,
      name: 'Ordem Primal',
      description:
        'Você se dedica a uma das funções sagradas a seguir, à sua escolha. Mágico: você conhece um truque adicional da lista de Druida e soma seu modificador de Sabedoria (mínimo +1) aos testes de Inteligência (Arcanismo ou Natureza). Guardião: treinado para a batalha, você ganha proficiência com Armas Marciais e treinamento com Armaduras Médias.',
    },
    {
      level: 2,
      name: 'Forma Selvagem',
      description:
        'Como Ação Bônus, você assume a forma de uma Fera que tenha aprendido. Você pode usar esta característica duas vezes (três no nível 6 e quatro no nível 17; ver tabela da classe), recuperando um uso gasto ao terminar um Descanso Curto e todos ao terminar um Descanso Longo. Formas Conhecidas: você conhece quatro formas de Fera com Nível de Desafio até 1/4 e sem Deslocamento de Voo; no nível 4 conhece seis formas com ND até 1/2; no nível 8 conhece oito formas com ND até 1, que podem ter Deslocamento de Voo. Ao terminar um Descanso Longo, pode trocar uma forma conhecida por outra elegível. Duração: você permanece na forma por um número de horas igual a metade do seu nível de Druida, ou até usar Forma Selvagem novamente, ficar Incapacitado, morrer ou sair da forma como Ação Bônus. Regras da forma: suas estatísticas são substituídas pelas da Fera, mas você mantém seu tipo de criatura, Pontos de Vida, Dados de Pontos de Vida, valores de Inteligência, Sabedoria e Carisma, características de classe, idiomas e talentos, além de suas proficiências em perícias e salvaguardas (usando seu Bônus de Proficiência se for maior que o da Fera). Ao assumir a forma, você ganha Pontos de Vida Temporários iguais ao seu nível de Druida. Você não pode conjurar magias, mas mudar de forma não interrompe sua Concentração nem impede ações que façam parte de uma magia já conjurada. Você não pode falar, exceto se a Fera puder. Você escolhe se seu equipamento cai no chão, se funde à nova forma ou é vestido por ela, se couber.',
    },
    {
      level: 2,
      name: 'Companheiro Selvagem',
      description:
        'Você pode invocar um espírito da natureza na forma de um animal para ajudá-lo. Como uma ação de Magia, você pode gastar um espaço de magia ou um uso de Forma Selvagem para conjurar a magia Encontrar Familiar sem componentes Materiais. O familiar criado dessa forma é Feérico e desaparece quando você termina um Descanso Longo.',
    },
    {
      level: 3,
      name: 'Subclasse de Druida',
      description:
        'Você escolhe uma subclasse de Druida (Círculo da Terra, Círculo da Lua, Círculo do Mar ou Círculo das Estrelas). Ela concede características nos níveis 3, 6, 10 e 14 de Druida.',
    },
    {
      level: 4,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique. Esta característica é obtida novamente nos níveis 8, 12 e 16 de Druida.',
    },
    {
      level: 5,
      name: 'Ressurgimento Selvagem',
      description:
        'Uma vez por turno, se não tiver usos de Forma Selvagem restantes, você pode gastar um espaço de magia (sem ação) para recuperar um uso. Além disso, você pode gastar um uso de Forma Selvagem (sem ação) para ganhar um espaço de magia de 1º círculo; depois de fazer isso, não pode fazê-lo novamente até terminar um Descanso Longo.',
    },
    {
      level: 6,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Druida.',
    },
    {
      level: 7,
      name: 'Fúria Elemental',
      description:
        'O poder dos elementos flui por você. Escolha uma das opções a seguir. Conjuração Potente: você soma seu modificador de Sabedoria ao dano que causa com qualquer truque de Druida. Golpe Primal: uma vez em cada um dos seus turnos, quando atingir uma criatura com uma jogada de ataque usando uma arma ou um ataque de uma forma de Fera da Forma Selvagem, você pode fazer o alvo sofrer 1d8 de dano extra Elétrico, de Fogo, de Frio ou Trovejante (à sua escolha).',
    },
    {
      level: 8,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 10,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Druida.',
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
      description: 'Você ganha uma característica da sua subclasse de Druida.',
    },
    {
      level: 15,
      name: 'Fúria Elemental Aprimorada',
      description:
        'A opção escolhida em Fúria Elemental fica mais poderosa. Conjuração Potente: quando conjurar um truque de Druida com alcance de 3 metros ou mais, o alcance aumenta em 90 metros. Golpe Primal: o dano extra passa a ser 2d8.',
    },
    {
      level: 16,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 18,
      name: 'Magias Bestiais',
      description:
        'Enquanto estiver usando Forma Selvagem, você pode conjurar magias na forma de Fera, exceto magias que tenham um componente Material com custo especificado ou que seja consumido pela magia.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento à sua escolha para o qual se qualifique. Recomenda-se a Dádiva da Viagem Dimensional.',
    },
    {
      level: 20,
      name: 'Arquidruida',
      description:
        'A vitalidade da natureza floresce constantemente em você. Forma Selvagem Perene: sempre que rolar Iniciativa e não tiver usos de Forma Selvagem restantes, você recupera um uso. Mágico da Natureza: você pode converter usos de Forma Selvagem em um único espaço de magia (sem ação). Escolha um número de usos não gastos e converta-os em um espaço de magia, com cada uso contribuindo com 2 círculos; por exemplo, dois usos produzem um espaço de 4º círculo. Depois de usar este benefício, não pode fazê-lo novamente até terminar um Descanso Longo. Longevidade: a magia primal faz você envelhecer mais devagar; para cada 10 anos que passam, seu corpo envelhece apenas 1 ano.',
    },
  ],
  tableColumns: [
    {
      label: 'Forma Selvagem',
      values: ['—', '2', '2', '2', '2', '3', '3', '3', '3', '3', '3', '3', '3', '3', '3', '3', '4', '4', '4', '4'],
    },
  ],
  subclasses: [
    {
      id: 'circle-of-the-land',
      name: 'Círculo da Terra',
      nameEn: 'Circle of the Land',
      summary: 'Místicos que guardam o saber antigo e cujas magias refletem a terra onde foram iniciados.',
      features: [
        {
          level: 3,
          name: 'Magias do Círculo',
          description:
            'Sempre que terminar um Descanso Longo, escolha um tipo de terra: árida, polar, temperada ou tropical. Você sempre tem preparadas as magias associadas a essa terra para o seu nível de Druida ou inferior. Árida — nível 3: Borrão, Mãos Flamejantes e Raio de Fogo; nível 5: Bola de Fogo; nível 7: Praga; nível 9: Muralha de Pedra. Polar — nível 3: Névoa Obscurecente, Imobilizar Pessoa e Raio de Gelo; nível 5: Tempestade de Granizo; nível 7: Tempestade de Gelo; nível 9: Cone de Frio. Temperada — nível 3: Passo Nebuloso, Toque Chocante e Sono; nível 5: Relâmpago; nível 7: Liberdade de Movimento; nível 9: Caminhar em Árvores. Tropical — nível 3: Respingo Ácido, Raio do Enjoo e Teia; nível 5: Névoa Fétida; nível 7: Metamorfose; nível 9: Praga de Insetos.',
        },
        {
          level: 3,
          name: 'Auxílio da Terra',
          description:
            'Como uma ação de Magia, você pode gastar um uso de Forma Selvagem e escolher um ponto a até 18 metros de você. Flores revigorantes e espinhos drenantes aparecem por um instante em uma Esfera de 3 metros de raio centrada nesse ponto. Cada criatura à sua escolha na Esfera faz uma salvaguarda de Constituição contra a CD de resistência das suas magias, sofrendo 2d6 de dano Necrótico se falhar ou metade se for bem-sucedida. Uma criatura à sua escolha na mesma área recupera 2d6 Pontos de Vida. O dano e a cura aumentam em 1d6 quando você atinge os níveis 10 (3d6) e 14 (4d6) de Druida.',
        },
        {
          level: 6,
          name: 'Recuperação Natural',
          description:
            'Você pode conjurar uma das magias de 1º círculo ou superior que tenha preparadas por Magias do Círculo sem gastar um espaço de magia; depois de fazer isso, não pode fazê-lo novamente até terminar um Descanso Longo. Além disso, ao terminar um Descanso Curto, você pode escolher espaços de magia gastos para recuperar. Os espaços podem ter um círculo combinado igual ou inferior à metade do seu nível de Druida (arredondado para cima), e nenhum deles pode ser de 6º círculo ou superior. Depois de recuperar espaços dessa forma, não pode fazê-lo novamente até terminar um Descanso Longo.',
        },
        {
          level: 10,
          name: 'Proteção da Natureza',
          description:
            'Você tem Imunidade à condição Envenenado e Resistência a um tipo de dano associado à sua escolha atual de terra nas Magias do Círculo: árida, Fogo; polar, Frio; temperada, Elétrico; tropical, Veneno.',
        },
        {
          level: 14,
          name: 'Santuário da Natureza',
          description:
            'Como uma ação de Magia, você pode gastar um uso de Forma Selvagem e fazer árvores e vinhas espectrais surgirem em um Cubo de 4,5 metros no chão a até 36 metros de você. Elas duram 1 minuto, ou até você ficar Incapacitado ou morrer. Você e seus aliados têm Meia Cobertura enquanto estiverem na área, e seus aliados ganham a Resistência atual da sua Proteção da Natureza enquanto estiverem nela. Como uma Ação Bônus, você pode mover o Cubo até 18 metros para um ponto no chão a até 36 metros de você.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['misty-step', 'shocking-grasp', 'sleep'] },
        { level: 5, spells: ['lightning-bolt'] },
        { level: 7, spells: ['freedom-of-movement'] },
        { level: 9, spells: ['tree-stride'] },
      ],
    },
    {
      id: 'circle-of-the-moon',
      name: 'Círculo da Lua',
      nameEn: 'Circle of the Moon',
      summary: 'Guardiões ferozes da natureza que dominam a Forma Selvagem e se fortalecem com o poder lunar.',
      features: [
        {
          level: 3,
          name: 'Formas do Círculo',
          description:
            'Você pode canalizar a magia lunar ao usar Forma Selvagem, ganhando os benefícios a seguir. Nível de Desafio: o ND máximo da forma é igual ao seu nível de Druida dividido por 3 (arredondado para baixo). Classe de Armadura: até sair da forma, sua CA é igual a 13 + seu modificador de Sabedoria, se esse total for maior que a CA da Fera. Pontos de Vida Temporários: você ganha um número de Pontos de Vida Temporários igual a três vezes o seu nível de Druida ao assumir a forma.',
        },
        {
          level: 3,
          name: 'Magias do Círculo da Lua',
          description:
            'Você sempre tem certas magias preparadas ao atingir determinados níveis de Druida. Nível 3: Curar Ferimentos, Raio Lunar e Lampejo Estelar. Nível 5: Conjurar Animais. Nível 7: Fonte de Luar. Nível 9: Curar Ferimentos em Massa. Você pode conjurar as magias desta característica enquanto estiver em Forma Selvagem.',
        },
        {
          level: 6,
          name: 'Formas do Círculo Aprimoradas',
          description:
            'Enquanto estiver em Forma Selvagem, você ganha os benefícios a seguir. Radiância Lunar: cada um dos seus ataques na forma de Fera pode causar seu tipo normal de dano ou dano Radiante, à sua escolha. Robustez Ampliada: você pode somar seu modificador de Sabedoria às suas salvaguardas de Constituição.',
        },
        {
          level: 10,
          name: 'Passo do Luar',
          description:
            'Como uma Ação Bônus, você se teletransporta até 9 metros para um espaço desocupado que possa ver e tem Vantagem na próxima jogada de ataque que fizer antes do fim deste turno. Você pode usar esta característica um número de vezes igual ao seu modificador de Sabedoria (mínimo uma) e recupera todos os usos ao terminar um Descanso Longo. Também pode recuperar usos gastando um espaço de magia de 2º círculo ou superior para cada uso (sem ação).',
        },
        {
          level: 14,
          name: 'Forma Lunar',
          description:
            'O poder da lua permeia você. Radiância Lunar Aprimorada: uma vez em cada um dos seus turnos, você pode causar 2d10 de dano Radiante extra a um alvo que atingir com o ataque de uma forma da Forma Selvagem. Luar Compartilhado: sempre que usar Passo do Luar, pode também teletransportar uma criatura voluntária. Ela deve estar a até 3 metros de você e é teletransportada para um espaço desocupado que você possa ver a até 3 metros do seu destino.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['cure-wounds', 'moonbeam', 'starry-wisp'] },
        { level: 5, spells: ['conjure-animals'] },
        { level: 7, spells: ['fount-of-moonlight'] },
        { level: 9, spells: ['mass-cure-wounds'] },
      ],
    },
    {
      id: 'circle-of-the-sea',
      name: 'Círculo do Mar',
      nameEn: 'Circle of the Sea',
      summary: 'Druidas que extraem poder dos oceanos e das tempestades, empurrando e congelando inimigos com a fúria das marés.',
      features: [
        {
          level: 3,
          name: 'Magias do Círculo do Mar',
          description:
            'Você sempre tem certas magias preparadas ao atingir determinados níveis de Druida. Nível 3: Névoa Obscurecente, Lufada de Vento, Raio de Gelo, Despedaçar e Onda Trovejante. Nível 5: Relâmpago e Respirar na Água. Nível 7: Controlar a Água e Tempestade de Gelo. Nível 9: Conjurar Elemental e Imobilizar Monstro.',
        },
        {
          level: 3,
          name: 'Ira do Mar',
          description:
            'Como uma Ação Bônus, você pode gastar um uso de Forma Selvagem para manifestar uma Emanação de 1,5 metro de borrifos oceânicos ao seu redor por 10 minutos. Ela termina antes se você a dispensar (sem ação), manifestá-la novamente ou ficar Incapacitado. Quando a manifestar, e como Ação Bônus em turnos subsequentes, você pode escolher outra criatura que possa ver na Emanação. O alvo faz uma salvaguarda de Constituição contra a CD de resistência das suas magias; se falhar, sofre dano de Frio igual a um número de d6 igual ao seu modificador de Sabedoria (mínimo 1d6) e, se for Grande ou menor, é empurrado até 4,5 metros para longe de você.',
        },
        {
          level: 6,
          name: 'Afinidade Aquática',
          description:
            'O tamanho da Emanação criada por Ira do Mar aumenta para 3 metros. Além disso, você ganha Deslocamento de Natação igual ao seu Deslocamento.',
        },
        {
          level: 10,
          name: 'Nascido da Tempestade',
          description:
            'Enquanto sua Ira do Mar estiver ativa, você ganha os benefícios a seguir. Voo: você ganha Deslocamento de Voo igual ao seu Deslocamento. Resistência: você tem Resistência a dano Elétrico, de Frio e Trovejante.',
        },
        {
          level: 14,
          name: 'Dádiva Oceânica',
          description:
            'Em vez de manifestar a Emanação de Ira do Mar ao seu redor, você pode manifestá-la ao redor de uma criatura voluntária a até 18 metros de você. Essa criatura ganha todos os benefícios da Emanação e usa a CD de resistência das suas magias e o seu modificador de Sabedoria para ela. Além disso, você pode manifestar a Emanação ao redor de si mesmo e da criatura ao mesmo tempo se gastar dois usos de Forma Selvagem em vez de um.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['fog-cloud', 'gust-of-wind', 'ray-of-frost', 'shatter', 'thunderwave'] },
        { level: 5, spells: ['lightning-bolt', 'water-breathing'] },
        { level: 7, spells: ['control-water', 'ice-storm'] },
        { level: 9, spells: ['conjure-elemental', 'hold-monster'] },
      ],
    },
    {
      id: 'circle-of-the-stars',
      name: 'Círculo das Estrelas',
      nameEn: 'Circle of the Stars',
      summary: 'Druidas que estudam as constelações e extraem poder da luz das estrelas para curar, atacar e prever o destino.',
      features: [
        {
          level: 3,
          name: 'Mapa Estelar',
          description:
            'Você criou um mapa das estrelas, um objeto Minúsculo que pode usar como foco de conjuração para suas magias de Druida. Você decide sua forma (pergaminho, tábua de pedra com constelações gravadas etc.). Enquanto segurar o mapa, você tem as magias Orientação e Raio Guia preparadas e pode conjurar Raio Guia sem gastar um espaço de magia um número de vezes igual ao seu modificador de Sabedoria (mínimo uma), recuperando todos os usos ao terminar um Descanso Longo. Se perder o mapa, pode realizar uma cerimônia de 1 hora durante um Descanso Curto ou Longo para criar outro, destruindo o anterior.',
        },
        {
          level: 3,
          name: 'Forma Estrelada',
          description:
            'Como uma Ação Bônus, você pode gastar um uso de Forma Selvagem para assumir uma forma estrelada em vez de se transformar em Fera. Nessa forma, você mantém suas estatísticas, mas seu corpo fica luminoso e suas articulações brilham como estrelas, emitindo Luz Plena em um raio de 3 metros e Penumbra por mais 3 metros. A forma dura 10 minutos e termina antes se você a dispensar (Ação Bônus), ficar Incapacitado ou usar esta característica novamente. Ao assumir a forma, escolha uma constelação. Arqueiro: ao ativar a forma, e como Ação Bônus em turnos subsequentes enquanto ela durar, você pode fazer um ataque mágico à distância contra uma criatura a até 18 metros, causando dano Radiante igual a 1d8 + seu modificador de Sabedoria se acertar. Cálice: sempre que conjurar uma magia usando um espaço de magia que restaure Pontos de Vida a uma criatura, você ou outra criatura a até 9 metros de você recupera Pontos de Vida iguais a 1d8 + seu modificador de Sabedoria. Dragão: ao fazer um teste de Inteligência ou Sabedoria ou uma salvaguarda de Constituição para manter Concentração, você pode tratar um resultado de 9 ou menos no d20 como 10.',
        },
        {
          level: 6,
          name: 'Presságio Cósmico',
          description:
            'Sempre que terminar um Descanso Longo, você pode consultar seu Mapa Estelar e rolar um dado. Até terminar o próximo Descanso Longo, você ganha acesso a uma Reação especial baseada no resultado. Bem-aventurança (par): sempre que uma criatura que você possa ver a até 9 metros de você estiver prestes a fazer um Teste de D20, você pode usar sua Reação para rolar 1d6 e somar o resultado ao total. Infortúnio (ímpar): sempre que uma criatura que você possa ver a até 9 metros de você estiver prestes a fazer um Teste de D20, você pode usar sua Reação para rolar 1d6 e subtrair o resultado do total. Você pode usar esta Reação um número de vezes igual ao seu modificador de Sabedoria (mínimo uma) e recupera todos os usos ao terminar um Descanso Longo.',
        },
        {
          level: 10,
          name: 'Constelações Cintilantes',
          description:
            'As constelações da sua Forma Estrelada se aprimoram. O 1d8 do Arqueiro e do Cálice passa a ser 2d8, e enquanto o Dragão estiver ativo você tem Deslocamento de Voo de 6 metros e pode pairar. Além disso, no início de cada um dos seus turnos enquanto estiver na Forma Estrelada, você pode mudar a constelação.',
        },
        {
          level: 14,
          name: 'Repleto de Estrelas',
          description:
            'Enquanto estiver na Forma Estrelada, você se torna parcialmente incorpóreo, ganhando Resistência a dano Contundente, Cortante e Perfurante.',
        },
      ],
      alwaysPrepared: [{ level: 3, spells: ['guidance', 'guiding-bolt'] }],
    },
  ],
  optionGroups: [
    {
      id: 'primal-order',
      name: 'Ordem Primal',
      level: 1,
      countByLevel: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      options: [
        {
          id: 'magician',
          name: 'Mágico',
          description:
            'Você conhece um truque adicional da lista de magias de Druida. Além disso, sua conexão mística com a natureza concede um bônus em testes de Inteligência (Arcanismo ou Natureza) igual ao seu modificador de Sabedoria (mínimo +1).',
        },
        {
          id: 'warden',
          name: 'Guardião',
          description:
            'Treinado para a batalha, você ganha proficiência com Armas Marciais e treinamento com Armaduras Médias.',
        },
      ],
    },
  ],
};
