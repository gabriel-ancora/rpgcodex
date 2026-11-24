import type { ClassData } from '../types';

export const CLERIC: ClassData = {
  id: 'cleric',
  name: 'Clérigo',
  nameEn: 'Cleric',
  summary:
    'Intermediário entre o mundo mortal e os planos divinos, que canaliza o poder de uma divindade para curar, proteger e punir.',
  hitDie: 8,
  primaryAbilities: ['wis'],
  savingThrows: ['wis', 'cha'],
  armorTraining: ['Armaduras Leves', 'Armaduras Médias', 'Escudos'],
  weaponProficiencies: ['Armas Simples'],
  toolProficiencies: [],
  skillChoices: {
    count: 2,
    options: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
  },
  features: [
    {
      level: 1,
      name: 'Conjuração',
      description:
        'Você conjura magias por meio da devoção divina, usando Sabedoria como atributo de conjuração e a lista de magias de Clérigo. Você pode usar um Símbolo Sagrado como foco de conjuração. Truques, espaços de magia e magias preparadas seguem a tabela da classe. Sempre que terminar um Descanso Longo, pode mudar sua lista de magias preparadas, e sempre que ganhar um nível de Clérigo pode substituir um truque.',
    },
    {
      level: 1,
      name: 'Ordem Divina',
      description:
        'Você se dedica a uma das funções sagradas a seguir, à sua escolha. Protetor: treinado para o combate, você ganha proficiência com Armas Marciais e treinamento com Armaduras Pesadas. Taumaturgo: você conhece um truque adicional da lista de Clérigo e soma seu modificador de Sabedoria (mínimo +1) aos testes de Inteligência (Arcanismo ou Religião).',
    },
    {
      level: 2,
      name: 'Canalizar Divindade',
      description:
        'Você pode canalizar energia divina diretamente dos Planos Exteriores para produzir efeitos mágicos. Você começa com dois desses efeitos, Centelha Divina e Expulsar Mortos-Vivos, e sua subclasse concede outros. Você pode usar Canalizar Divindade duas vezes (três no nível 6 e quatro no nível 18; ver tabela da classe), recuperando um uso gasto ao terminar um Descanso Curto e todos ao terminar um Descanso Longo. Se um efeito exigir salvaguarda, a CD é a da resistência das suas magias. Centelha Divina: como uma ação de Magia, você aponta seu Símbolo Sagrado para outra criatura que possa ver a até 9 metros e foca energia divina nela. Role 1d8 e some seu modificador de Sabedoria; você restaura essa quantidade de Pontos de Vida à criatura ou a força a fazer uma salvaguarda de Constituição, sofrendo dano Necrótico ou Radiante (à sua escolha) igual ao total se falhar ou metade se for bem-sucedida. O número de d8 aumenta para 2 no nível 7, 3 no nível 13 e 4 no nível 18. Expulsar Mortos-Vivos: como uma ação de Magia, você apresenta seu Símbolo Sagrado e censura criaturas mortas-vivas. Cada Morto-Vivo à sua escolha a até 9 metros de você faz uma salvaguarda de Sabedoria. Se falhar, fica Amedrontado e Incapacitado por 1 minuto e, nesse período, tenta se afastar de você nos turnos dele. O efeito termina antes se a criatura sofrer dano, se você ficar Incapacitado ou se você morrer.',
    },
    {
      level: 3,
      name: 'Subclasse de Clérigo',
      description:
        'Você escolhe uma subclasse de Clérigo (Domínio da Vida, Domínio da Luz, Domínio da Trapaça ou Domínio da Guerra). Ela concede características nos níveis 3, 6 e 17 de Clérigo.',
    },
    {
      level: 4,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique. Esta característica é obtida novamente nos níveis 8, 12 e 16 de Clérigo.',
    },
    {
      level: 5,
      name: 'Abrasar Mortos-Vivos',
      description:
        'Sempre que usar Expulsar Mortos-Vivos, você pode rolar um número de d8 igual ao seu modificador de Sabedoria (mínimo 1d8) e somar os resultados. Cada Morto-Vivo que falhar na salvaguarda contra esse uso sofre dano Radiante igual ao total. Esse dano não encerra o efeito de expulsão.',
    },
    {
      level: 6,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Clérigo.',
    },
    {
      level: 7,
      name: 'Golpes Abençoados',
      description:
        'O poder divino infunde você em batalha. Escolha uma das opções a seguir. Golpe Divino: uma vez em cada um dos seus turnos, quando atingir uma criatura com uma jogada de ataque usando uma arma, você pode fazer o alvo sofrer 1d8 de dano extra Necrótico ou Radiante (à sua escolha). Conjuração Potente: você soma seu modificador de Sabedoria ao dano que causa com qualquer truque de Clérigo.',
    },
    {
      level: 8,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 10,
      name: 'Intervenção Divina',
      description:
        'Você pode pedir que sua divindade intervenha a seu favor. Como uma ação de Magia, escolha qualquer magia de Clérigo de 5º círculo ou inferior que não exija uma Reação para ser conjurada. Como parte da mesma ação, você conjura essa magia sem gastar um espaço de magia nem precisar de componentes Materiais. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.',
    },
    {
      level: 12,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 14,
      name: 'Golpes Abençoados Aprimorados',
      description:
        'A opção escolhida em Golpes Abençoados fica mais poderosa. Golpe Divino: o dano extra passa a ser 2d8. Conjuração Potente: quando conjurar um truque de Clérigo e causar dano a uma criatura com ele, você pode conceder Pontos de Vida Temporários iguais ao dobro do seu modificador de Sabedoria a si mesmo ou a outra criatura a até 18 metros de você.',
    },
    {
      level: 16,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 17,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Clérigo.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento à sua escolha para o qual se qualifique. Recomenda-se a Dádiva do Destino.',
    },
    {
      level: 20,
      name: 'Intervenção Divina Maior',
      description:
        'Quando usar Intervenção Divina, você pode escolher a magia Desejo. Se fizer isso, não pode usar Intervenção Divina novamente até terminar 2d4 Descansos Longos.',
    },
  ],
  tableColumns: [
    {
      label: 'Canalizar Divindade',
      values: ['—', '2', '2', '2', '2', '3', '3', '3', '3', '3', '3', '3', '3', '3', '3', '3', '3', '4', '4', '4'],
    },
  ],
  subclasses: [
    {
      id: 'life-domain',
      name: 'Domínio da Vida',
      nameEn: 'Life Domain',
      summary: 'Concentra-se na energia positiva que sustenta toda a vida, tornando o clérigo um curandeiro excepcional.',
      features: [
        {
          level: 3,
          name: 'Discípulo da Vida',
          description:
            'Quando uma magia que você conjurar com um espaço de magia restaurar Pontos de Vida a uma criatura, ela recupera Pontos de Vida adicionais no turno em que você conjurar a magia, iguais a 2 + o círculo do espaço de magia.',
        },
        {
          level: 3,
          name: 'Magias do Domínio da Vida',
          description:
            'Você sempre tem certas magias preparadas ao atingir determinados níveis de Clérigo. Nível 3: Auxílio, Bênção, Curar Ferimentos e Restauração Menor. Nível 5: Palavra Curativa em Massa e Revivificar. Nível 7: Aura de Vida e Proteção contra a Morte. Nível 9: Curar Ferimentos em Massa e Restauração Maior.',
        },
        {
          level: 3,
          name: 'Preservar a Vida',
          description:
            'Como uma ação de Magia, você apresenta seu Símbolo Sagrado e gasta um uso de Canalizar Divindade para evocar energia curativa capaz de restaurar um número de Pontos de Vida igual a cinco vezes o seu nível de Clérigo. Escolha criaturas Sangrando a até 9 metros de você (que podem incluir você) e divida esses Pontos de Vida entre elas. Esta característica pode restaurar uma criatura até no máximo metade do máximo de Pontos de Vida dela.',
        },
        {
          level: 6,
          name: 'Curandeiro Abençoado',
          description:
            'As magias de cura que você conjura em outros também curam você. Imediatamente após conjurar uma magia com um espaço de magia que restaure Pontos de Vida a uma ou mais criaturas além de você, você recupera Pontos de Vida iguais a 2 + o círculo do espaço de magia.',
        },
        {
          level: 17,
          name: 'Cura Suprema',
          description:
            'Quando você fosse rolar um ou mais dados para restaurar Pontos de Vida com uma magia ou com Canalizar Divindade, não role esses dados; em vez disso, use o maior número possível em cada um. Por exemplo, em vez de restaurar 2d6 Pontos de Vida, você restaura 12.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['aid', 'bless', 'cure-wounds', 'lesser-restoration'] },
        { level: 5, spells: ['mass-healing-word', 'revivify'] },
        { level: 7, spells: ['aura-of-life', 'death-ward'] },
        { level: 9, spells: ['greater-restoration', 'mass-cure-wounds'] },
      ],
    },
    {
      id: 'light-domain',
      name: 'Domínio da Luz',
      nameEn: 'Light Domain',
      summary: 'Enfatiza o poder divino de revelar e banir as trevas, com magias de fogo e luz radiante.',
      features: [
        {
          level: 3,
          name: 'Magias do Domínio da Luz',
          description:
            'Você sempre tem certas magias preparadas ao atingir determinados níveis de Clérigo. Nível 3: Mãos Flamejantes, Fogo das Fadas, Raio Ardente e Ver o Invisível. Nível 5: Luz do Dia e Bola de Fogo. Nível 7: Olho Arcano e Muralha de Fogo. Nível 9: Coluna de Chamas e Vidência.',
        },
        {
          level: 3,
          name: 'Radiância da Alvorada',
          description:
            'Como uma ação de Magia, você apresenta seu Símbolo Sagrado e gasta um uso de Canalizar Divindade para emitir um clarão de luz em uma Emanação de 9 metros originada em você. Qualquer Escuridão mágica, como a criada pela magia Escuridão, na área é dissipada. Além disso, cada criatura à sua escolha na área faz uma salvaguarda de Constituição, sofrendo dano Radiante igual a 2d10 + seu nível de Clérigo se falhar ou metade desse dano se for bem-sucedida.',
        },
        {
          level: 3,
          name: 'Clarão Protetor',
          description:
            'Quando uma criatura que você possa ver a até 9 metros de você fizer uma jogada de ataque, você pode usar sua Reação para impor Desvantagem nessa jogada, ofuscando a criatura com luz antes que ela acerte ou erre. Você pode usar esta característica um número de vezes igual ao seu modificador de Sabedoria (mínimo uma) e recupera todos os usos ao terminar um Descanso Longo.',
        },
        {
          level: 6,
          name: 'Clarão Protetor Aprimorado',
          description:
            'Você recupera todos os usos gastos de Clarão Protetor ao terminar um Descanso Curto ou Longo. Além disso, sempre que usar Clarão Protetor, você pode conceder ao alvo do ataque que provocou a Reação Pontos de Vida Temporários iguais a 2d6 + seu modificador de Sabedoria.',
        },
        {
          level: 17,
          name: 'Coroa de Luz',
          description:
            'Como uma ação de Magia, você faz com que uma aura de luz solar emane de você por 1 minuto ou até dispensá-la (sem ação). Você emite Luz Plena em um raio de 18 metros e Penumbra por mais 9 metros. Seus inimigos na Luz Plena têm Desvantagem em salvaguardas contra sua Radiância da Alvorada e contra qualquer magia que cause dano de Fogo ou Radiante. Você pode usar esta característica um número de vezes igual ao seu modificador de Sabedoria (mínimo uma) e recupera todos os usos ao terminar um Descanso Longo.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['burning-hands', 'faerie-fire', 'scorching-ray', 'see-invisibility'] },
        { level: 5, spells: ['daylight', 'fireball'] },
        { level: 7, spells: ['arcane-eye', 'wall-of-fire'] },
        { level: 9, spells: ['flame-strike', 'scrying'] },
      ],
    },
    {
      id: 'trickery-domain',
      name: 'Domínio da Trapaça',
      nameEn: 'Trickery Domain',
      summary: 'Serve divindades de malícia e engano, usando ilusões e furtividade para desafiar tiranos e a ordem estabelecida.',
      features: [
        {
          level: 3,
          name: 'Bênção do Trapaceiro',
          description:
            'Como uma ação de Magia, você pode escolher a si mesmo ou uma criatura voluntária a até 9 metros de você para ter Vantagem em testes de Destreza (Furtividade). Essa bênção dura até você terminar um Descanso Longo ou usar esta característica novamente.',
        },
        {
          level: 3,
          name: 'Invocar Duplicidade',
          description:
            'Como uma Ação Bônus, você pode gastar um uso de Canalizar Divindade para criar uma ilusão visual perfeita de si mesmo em um espaço desocupado que possa ver a até 9 metros de você. A ilusão é intangível e não ocupa espaço. Ela dura 1 minuto, mas termina antes se você a dispensar (sem ação) ou ficar Incapacitado. A ilusão é animada e imita suas expressões e gestos. Enquanto ela existir, você ganha os benefícios a seguir. Conjurar Magias: você pode conjurar magias como se estivesse no espaço da ilusão, mas deve usar seus próprios sentidos. Distrair: quando você e a ilusão estiverem a até 1,5 metro de uma criatura que possa ver a ilusão, você tem Vantagem em jogadas de ataque contra essa criatura, dada a distração que a ilusão causa. Mover: como uma Ação Bônus, você pode mover a ilusão até 9 metros para um espaço desocupado que possa ver e que esteja a até 36 metros de você.',
        },
        {
          level: 3,
          name: 'Magias do Domínio da Trapaça',
          description:
            'Você sempre tem certas magias preparadas ao atingir determinados níveis de Clérigo. Nível 3: Enfeitiçar Pessoa, Disfarçar-se, Invisibilidade e Passos sem Pegadas. Nível 5: Padrão Hipnótico e Indetectável. Nível 7: Confusão e Porta Dimensional. Nível 9: Dominar Pessoa e Modificar Memória.',
        },
        {
          level: 6,
          name: 'Transposição do Trapaceiro',
          description:
            'Sempre que usar sua Ação Bônus para criar a ilusão de Invocar Duplicidade ou movê-la, você pode se teletransportar, trocando de lugar com a ilusão.',
        },
        {
          level: 17,
          name: 'Duplicidade Aprimorada',
          description:
            'A ilusão de Invocar Duplicidade fica mais poderosa. Distração Compartilhada: quando você e seus aliados fizerem jogadas de ataque contra uma criatura a até 1,5 metro da ilusão, essas jogadas têm Vantagem. Ilusão Curativa: quando a ilusão terminar, você ou uma criatura à sua escolha a até 1,5 metro dela recupera Pontos de Vida iguais ao seu nível de Clérigo.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['charm-person', 'disguise-self', 'invisibility', 'pass-without-trace'] },
        { level: 5, spells: ['hypnotic-pattern', 'nondetection'] },
        { level: 7, spells: ['confusion', 'dimension-door'] },
        { level: 9, spells: ['dominate-person', 'modify-memory'] },
      ],
    },
    {
      id: 'war-domain',
      name: 'Domínio da Guerra',
      nameEn: 'War Domain',
      summary: 'Inspira valor e pune inimigos em nome de divindades da guerra, combinando proeza marcial e magia.',
      features: [
        {
          level: 3,
          name: 'Golpe Guiado',
          description:
            'Quando você ou uma criatura a até 9 metros de você errar uma jogada de ataque, você pode gastar um uso de Canalizar Divindade para conceder +10 a essa jogada, possivelmente fazendo-a acertar. Quando usar esta característica para beneficiar a jogada de outra criatura, você deve usar sua Reação.',
        },
        {
          level: 3,
          name: 'Magias do Domínio da Guerra',
          description:
            'Você sempre tem certas magias preparadas ao atingir determinados níveis de Clérigo. Nível 3: Raio Guia, Arma Mágica, Escudo da Fé e Arma Espiritual. Nível 5: Manto do Cruzado e Espíritos Guardiões. Nível 7: Escudo de Fogo e Liberdade de Movimento. Nível 9: Imobilizar Monstro e Golpe do Vento de Aço.',
        },
        {
          level: 3,
          name: 'Sacerdote da Guerra',
          description:
            'Como Ação Bônus, você pode fazer um ataque com uma arma ou um Ataque Desarmado. Você pode usar esta Ação Bônus um número de vezes igual ao seu modificador de Sabedoria (mínimo uma) e recupera todos os usos ao terminar um Descanso Curto ou Longo.',
        },
        {
          level: 6,
          name: 'Bênção do Deus da Guerra',
          description:
            'Você pode gastar um uso de Canalizar Divindade para conjurar Escudo da Fé ou Arma Espiritual em vez de gastar um espaço de magia. Quando conjurada dessa forma, a magia não exige Concentração; ela dura 1 minuto, mas termina antes se você a conjurar novamente, ficar Incapacitado ou morrer.',
        },
        {
          level: 17,
          name: 'Avatar da Batalha',
          description: 'Você ganha Resistência a dano Contundente, Cortante e Perfurante.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['guiding-bolt', 'magic-weapon', 'shield-of-faith', 'spiritual-weapon'] },
        { level: 5, spells: ['crusaders-mantle', 'spirit-guardians'] },
        { level: 7, spells: ['fire-shield', 'freedom-of-movement'] },
        { level: 9, spells: ['hold-monster', 'steel-wind-strike'] },
      ],
    },
  ],
  optionGroups: [
    {
      id: 'divine-order',
      name: 'Ordem Divina',
      level: 1,
      countByLevel: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      options: [
        {
          id: 'protector',
          name: 'Protetor',
          description:
            'Treinado para o combate, você ganha proficiência com Armas Marciais e treinamento com Armaduras Pesadas.',
        },
        {
          id: 'thaumaturge',
          name: 'Taumaturgo',
          description:
            'Você conhece um truque adicional da lista de magias de Clérigo. Além disso, sua conexão mística com o divino concede um bônus em testes de Inteligência (Arcanismo ou Religião) igual ao seu modificador de Sabedoria (mínimo +1).',
        },
      ],
    },
  ],
};
