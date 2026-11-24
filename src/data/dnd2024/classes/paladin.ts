import type { ClassData } from '../types';

const ASI =
  'Você ganha o talento Aumento no Valor de Atributo ou outro talento de sua escolha para o qual se qualifique.';
const SUB = 'Você ganha uma característica da sua subclasse de Paladino.';

export const PALADIN: ClassData = {
  id: 'paladin',
  name: 'Paladino',
  nameEn: 'Paladin',
  summary:
    'Guerreiro devoto unido por um juramento sagrado, que combina proteção em combate, cura pelo toque e magia divina canalizada através de golpes radiantes.',
  hitDie: 10,
  primaryAbilities: ['str', 'cha'],
  savingThrows: ['wis', 'cha'],
  armorTraining: ['Armaduras Leves', 'Armaduras Médias', 'Armaduras Pesadas', 'Escudos'],
  weaponProficiencies: ['Armas Simples', 'Armas Marciais'],
  toolProficiencies: [],
  skillChoices: {
    count: 2,
    options: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
  },
  features: [
    {
      level: 1,
      name: 'Imposição de Mãos',
      description:
        'Você possui uma reserva de poder curativo que se renova quando termina um Descanso Longo. A reserva contém Pontos de Vida iguais a 5 vezes o seu nível de Paladino. Com uma Ação Bônus, você toca uma criatura (que pode ser você mesmo) e retira Pontos de Vida da reserva para restaurar essa mesma quantidade à criatura, até o máximo restante na reserva. Alternativamente, você pode gastar 5 Pontos de Vida da reserva para remover a condição Envenenado da criatura tocada; essa opção não restaura Pontos de Vida.',
    },
    {
      level: 1,
      name: 'Conjuração',
      description:
        'Você aprendeu a conjurar magias por meio de oração e meditação. Carisma é o seu atributo de conjuração: a CD de resistência das suas magias é 8 + modificador de Carisma + Bônus de Proficiência, e o modificador de ataque mágico é modificador de Carisma + Bônus de Proficiência. Você prepara magias da lista de Paladino, na quantidade indicada na tabela da classe, e usa espaços de magia para conjurá-las, recuperando todos os espaços gastos ao terminar um Descanso Longo. Ao terminar um Descanso Longo, você pode trocar uma magia preparada por outra da lista de Paladino. Você pode usar um Símbolo Sagrado como foco de conjuração para as suas magias de Paladino.',
    },
    {
      level: 1,
      name: 'Maestria em Armas',
      description:
        'Seu treinamento permite usar as propriedades de maestria de dois tipos de armas Simples ou Marciais Corpo a Corpo de sua escolha com as quais você tenha proficiência. Sempre que terminar um Descanso Longo, você pode trocar um desses tipos de arma por outro elegível.',
    },
    {
      level: 2,
      name: 'Estilo de Luta',
      description:
        'Você ganha um talento de Estilo de Luta à sua escolha. Em vez de escolher um desses talentos, você pode optar por Guerreiro Abençoado: você aprende dois truques de Clérigo à sua escolha, que contam como magias de Paladino e usam Carisma como atributo de conjuração. Sempre que ganhar um nível de Paladino, você pode trocar um desses truques por outro truque de Clérigo.',
    },
    {
      level: 2,
      name: 'Destruição do Paladino',
      description:
        'Você sempre tem a magia Destruição Divina preparada. Além disso, você pode conjurá-la sem gastar um espaço de magia, mas só pode fazer isso uma vez; recupera esse uso quando termina um Descanso Longo.',
    },
    {
      level: 3,
      name: 'Canalizar Divindade',
      description:
        'Você pode canalizar energia divina diretamente dos Planos Exteriores para alimentar efeitos mágicos. Você pode usar esta característica duas vezes; recupera um uso gasto ao terminar um Descanso Curto e todos os usos ao terminar um Descanso Longo. O número de usos aumenta para três no nível 11 de Paladino (ver coluna Canalizar Divindade). Se um efeito exigir um teste de resistência, a CD é a CD de resistência das suas magias. Você começa com a opção Sentido Divino: com uma Ação Bônus, por 10 minutos ou até ficar Incapacitado, você sabe a localização de qualquer Celestial, Corruptor ou Morto-Vivo a até 18 metros de você e o tipo da criatura, e também detecta a presença de qualquer local ou objeto que tenha sido consagrado ou profanado, como pela magia Consagrar, dentro dessa mesma distância. Sua subclasse pode conceder opções adicionais.',
    },
    {
      level: 3,
      name: 'Subclasse de Paladino',
      description:
        'Você ganha uma subclasse de Paladino à sua escolha (um Juramento Sagrado). A subclasse concede características nos níveis 3, 7, 15 e 20 de Paladino.',
    },
    { level: 4, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 5,
      name: 'Ataque Extra',
      description:
        'Você pode atacar duas vezes, em vez de uma, sempre que realizar a ação Atacar no seu turno.',
    },
    {
      level: 5,
      name: 'Fiel Corcel',
      description:
        'Você pode invocar a ajuda de uma montaria sobrenatural. Você sempre tem a magia Encontrar Montaria preparada e pode conjurá-la uma vez sem gastar um espaço de magia; recupera esse uso quando termina um Descanso Longo.',
    },
    {
      level: 6,
      name: 'Aura de Proteção',
      description:
        'Você irradia uma aura invisível de proteção em uma Emanação de 3 metros a partir de você. A aura fica inativa enquanto você estiver Incapacitado. Você e seus aliados dentro da aura recebem um bônus em testes de resistência igual ao seu modificador de Carisma (bônus mínimo de +1). Se outro Paladino também estiver presente, uma criatura só pode se beneficiar de uma Aura de Proteção por vez e escolhe qual aura a afeta.',
    },
    { level: 7, name: 'Característica de Subclasse', description: SUB },
    { level: 8, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 9,
      name: 'Abjurar Inimigos',
      description:
        'Com uma ação de Magia, você gasta um uso de Canalizar Divindade para sobrecarregar inimigos com reverência. Escolha um número de criaturas que você possa ver a até 18 metros igual ao seu modificador de Carisma (mínimo de uma). Cada alvo faz um teste de resistência de Sabedoria. Se falhar, fica Amedrontado por 1 minuto ou até sofrer dano. Enquanto estiver Amedrontado dessa forma, o alvo só pode fazer uma das seguintes coisas no seu turno: mover-se, realizar uma ação ou realizar uma Ação Bônus.',
    },
    {
      level: 10,
      name: 'Aura de Coragem',
      description:
        'Você e seus aliados têm Imunidade à condição Amedrontado enquanto estiverem dentro da sua Aura de Proteção. Se um aliado Amedrontado entrar na aura, essa condição não tem efeito sobre ele enquanto ele estiver lá.',
    },
    {
      level: 11,
      name: 'Golpes Radiantes',
      description:
        'Seus golpes carregam poder sobrenatural. Quando você atinge um alvo com uma jogada de ataque usando uma arma Corpo a Corpo ou um Ataque Desarmado, o alvo sofre 1d8 de dano Radiante adicional.',
    },
    { level: 12, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 14,
      name: 'Toque Restaurador',
      description:
        'Quando você usa Imposição de Mãos em uma criatura, também pode remover dela uma ou mais das seguintes condições: Amedrontado, Atordoado, Cego, Enfeitiçado, Paralisado ou Surdo. Para cada condição removida, você gasta 5 Pontos de Vida da reserva de Imposição de Mãos; esses pontos não restauram Pontos de Vida.',
    },
    { level: 15, name: 'Característica de Subclasse', description: SUB },
    { level: 16, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 18,
      name: 'Expansão de Aura',
      description: 'Sua Aura de Proteção passa a ser uma Emanação de 9 metros.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento de sua escolha para o qual se qualifique.',
    },
    { level: 20, name: 'Característica de Subclasse', description: SUB },
  ],
  tableColumns: [
    {
      label: 'Canalizar Divindade',
      values: ['—', '—', '2', '2', '2', '2', '2', '2', '2', '2', '3', '3', '3', '3', '3', '3', '3', '3', '3', '3'],
    },
  ],
  subclasses: [
    {
      id: 'oath-of-devotion',
      name: 'Juramento de Devoção',
      nameEn: 'Oath of Devotion',
      summary:
        'Paladinos que seguem os ideais de honestidade, coragem, compaixão, honra e dever, inspirados na imagem do cavaleiro justo.',
      features: [
        {
          level: 3,
          name: 'Magias do Juramento de Devoção',
          description:
            'A magia do seu juramento garante que você sempre tenha certas magias preparadas. Ao atingir os níveis de Paladino indicados, você passa a ter sempre preparadas: nível 3, Proteção contra o Bem e o Mal e Escudo da Fé; nível 5, Auxílio e Zona da Verdade; nível 9, Sinal de Esperança e Dissipar Magia; nível 13, Liberdade de Movimento e Guardião da Fé; nível 17, Comunhão e Coluna de Chamas.',
        },
        {
          level: 3,
          name: 'Arma Sagrada',
          description:
            'Quando você realiza a ação Atacar, pode gastar um uso de Canalizar Divindade para imbuir uma arma Corpo a Corpo que esteja empunhando com energia positiva. Por 10 minutos, ou até usar esta característica novamente, você soma seu modificador de Carisma às jogadas de ataque feitas com essa arma (bônus mínimo de +1), e cada vez que atingir com ela pode fazer com que cause dano Radiante ou o tipo de dano normal da arma. A arma também emite Luz Plena em um raio de 6 metros e Penumbra por mais 6 metros. Você pode encerrar o efeito antecipadamente (nenhuma ação necessária). O efeito também termina se você não estiver mais carregando a arma.',
        },
        {
          level: 7,
          name: 'Aura de Devoção',
          description:
            'Você e seus aliados têm Imunidade à condição Enfeitiçado enquanto estiverem dentro da sua Aura de Proteção. Se um aliado Enfeitiçado entrar na aura, essa condição não tem efeito sobre ele enquanto ele estiver lá.',
        },
        {
          level: 15,
          name: 'Destruição Protetora',
          description:
            'Sempre que você conjura Destruição Divina, você e as criaturas de sua escolha dentro da sua Aura de Proteção recebem Meia Cobertura até o início do seu próximo turno.',
        },
        {
          level: 20,
          name: 'Halo Sagrado',
          description:
            'Com uma Ação Bônus, você imbui sua Aura de Proteção de poder sagrado por 10 minutos ou até encerrá-la (nenhuma ação necessária). Enquanto o efeito durar: você tem Vantagem em todos os testes de resistência forçados por Corruptores ou Mortos-Vivos; sempre que um inimigo começar o turno dentro da aura, ele sofre dano Radiante igual ao seu modificador de Carisma mais o seu Bônus de Proficiência; e a aura emite Luz Plena, que é considerada luz solar. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um espaço de magia de 5º círculo para restaurar o uso.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['protection-from-evil-and-good', 'shield-of-faith'] },
        { level: 5, spells: ['aid', 'zone-of-truth'] },
        { level: 9, spells: ['beacon-of-hope', 'dispel-magic'] },
        { level: 13, spells: ['freedom-of-movement', 'guardian-of-faith'] },
        { level: 17, spells: ['commune', 'flame-strike'] },
      ],
    },
    {
      id: 'oath-of-glory',
      name: 'Juramento de Glória',
      nameEn: 'Oath of Glory',
      summary:
        'Paladinos que acreditam estar destinados a grandes feitos e buscam a glória por meio de atos heroicos, excelência física e inspiração dos aliados.',
      features: [
        {
          level: 3,
          name: 'Magias do Juramento de Glória',
          description:
            'Ao atingir os níveis de Paladino indicados, você passa a ter sempre preparadas: nível 3, Raio Guia e Heroísmo; nível 5, Aprimorar Atributo e Arma Mágica; nível 9, Velocidade e Proteção contra Energia; nível 13, Compulsão e Liberdade de Movimento; nível 17, Lenda e Saber e Presença Régia de Yolande.',
        },
        {
          level: 3,
          name: 'Atleta Inigualável',
          description:
            'Com uma Ação Bônus, você gasta um uso de Canalizar Divindade para aprimorar seu atletismo. Por 1 hora, você tem Vantagem em testes de Força (Atletismo) e Destreza (Acrobacia), e a distância dos seus Saltos em Distância e em Altura aumenta em 3 metros (esse aumento extra ainda custa movimento normalmente).',
        },
        {
          level: 3,
          name: 'Golpe Inspirador',
          description:
            'Imediatamente após conjurar Destruição Divina, você pode gastar um uso de Canalizar Divindade e distribuir Pontos de Vida Temporários entre criaturas de sua escolha a até 9 metros de você, o que pode incluir você mesmo. O total de Pontos de Vida Temporários é 2d8 + seu nível de Paladino, dividido como você quiser.',
        },
        {
          level: 7,
          name: 'Aura de Vivacidade',
          description:
            'Seu Deslocamento aumenta em 3 metros. Além disso, sempre que um aliado entrar na sua Aura de Proteção pela primeira vez em um turno ou começar o turno nela, o Deslocamento desse aliado aumenta em 3 metros até o fim do próximo turno dele.',
        },
        {
          level: 15,
          name: 'Defesa Gloriosa',
          description:
            'Quando você ou outra criatura que você possa ver a até 3 metros de você é atingido por uma jogada de ataque, você pode usar sua Reação para conceder ao alvo um bônus na CA contra esse ataque igual ao seu modificador de Carisma (mínimo de +1), potencialmente fazendo o ataque errar. Se o ataque errar, você pode fazer um ataque com arma contra o atacante como parte dessa mesma Reação, se ele estiver ao alcance da arma. Você pode usar esta característica um número de vezes igual ao seu modificador de Carisma (mínimo de uma) e recupera todos os usos ao terminar um Descanso Longo.',
        },
        {
          level: 20,
          name: 'Lenda Viva',
          description:
            'Com uma Ação Bônus, você se reveste do poder da lenda por 10 minutos. Durante esse tempo: você tem Vantagem em todos os testes de Carisma; uma vez em cada um dos seus turnos, quando errar um ataque com arma ou Ataque Desarmado, você pode fazer com que esse ataque acerte; e, se falhar em um teste de resistência, pode usar sua Reação para rolar novamente, devendo usar o novo resultado. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um espaço de magia de 5º círculo para restaurar o uso.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['guiding-bolt', 'heroism'] },
        { level: 5, spells: ['enhance-ability', 'magic-weapon'] },
        { level: 9, spells: ['haste', 'protection-from-energy'] },
        { level: 13, spells: ['compulsion', 'freedom-of-movement'] },
        { level: 17, spells: ['legend-lore', 'yolandes-regal-presence'] },
      ],
    },
    {
      id: 'oath-of-the-ancients',
      name: 'Juramento dos Anciões',
      nameEn: 'Oath of the Ancients',
      summary:
        'Paladinos que juram preservar a luz, a vida e a beleza do mundo contra as trevas, ligados às forças antigas da natureza e das fadas.',
      features: [
        {
          level: 3,
          name: 'Magias do Juramento dos Anciões',
          description:
            'Ao atingir os níveis de Paladino indicados, você passa a ter sempre preparadas: nível 3, Golpe Constritor e Falar com Animais; nível 5, Passo Nebuloso e Raio Lunar; nível 9, Ampliar Plantas e Proteção contra Energia; nível 13, Tempestade de Gelo e Pele de Pedra; nível 17, Comunhão com a Natureza e Caminhar em Árvores.',
        },
        {
          level: 3,
          name: 'Ira da Natureza',
          description:
            'Com uma ação de Magia, você gasta um uso de Canalizar Divindade para conjurar vinhas espectrais ao seu redor. Cada criatura de sua escolha que você possa ver a até 4,5 metros de você deve ser bem-sucedida em um teste de resistência de Força ou ficará Contida por 1 minuto. Uma criatura Contida repete o teste no fim de cada um dos turnos dela, encerrando o efeito sobre si com um sucesso.',
        },
        {
          level: 7,
          name: 'Aura de Resguardo',
          description:
            'Magia antiga protege você e seus aliados. Você e seus aliados têm Resistência a dano Necrótico, Psíquico e Radiante enquanto estiverem dentro da sua Aura de Proteção.',
        },
        {
          level: 15,
          name: 'Sentinela Imortal',
          description:
            'Quando você é reduzido a 0 Pontos de Vida e não é morto imediatamente, pode, em vez disso, ficar com 1 Ponto de Vida e então recuperar Pontos de Vida iguais a três vezes o seu nível de Paladino. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo. Além disso, você não pode ser envelhecido magicamente e deixa de apresentar sinais de envelhecimento.',
        },
        {
          level: 20,
          name: 'Campeão Ancestral',
          description:
            'Com uma Ação Bônus, você assume a forma de uma força ancestral da natureza por 1 minuto. Durante esse tempo: no início de cada um dos seus turnos, você recupera 10 Pontos de Vida; sempre que conjurar uma magia de Paladino com tempo de conjuração de uma ação, pode conjurá-la com uma Ação Bônus; e inimigos dentro da sua aura têm Desvantagem em testes de resistência contra suas magias e opções de Canalizar Divindade. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um espaço de magia de 5º círculo para restaurar o uso.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['ensnaring-strike', 'speak-with-animals'] },
        { level: 5, spells: ['misty-step', 'moonbeam'] },
        { level: 9, spells: ['plant-growth', 'protection-from-energy'] },
        { level: 13, spells: ['ice-storm', 'stoneskin'] },
        { level: 17, spells: ['commune-with-nature', 'tree-stride'] },
      ],
    },
    {
      id: 'oath-of-vengeance',
      name: 'Juramento de Vingança',
      nameEn: 'Oath of Vengeance',
      summary:
        'Paladinos dedicados a punir quem comete pecados graves, dispostos a sacrificar a própria pureza para levar a justiça aos malfeitores.',
      features: [
        {
          level: 3,
          name: 'Magias do Juramento de Vingança',
          description:
            'Ao atingir os níveis de Paladino indicados, você passa a ter sempre preparadas: nível 3, Perdição e Marca do Caçador; nível 5, Imobilizar Pessoa e Passo Nebuloso; nível 9, Velocidade e Proteção contra Energia; nível 13, Banimento e Porta Dimensional; nível 17, Imobilizar Monstro e Vidência.',
        },
        {
          level: 3,
          name: 'Voto de Inimizade',
          description:
            'Quando você realiza a ação Atacar, pode gastar um uso de Canalizar Divindade para proferir um voto de inimizade contra uma criatura que você possa ver a até 9 metros. Você tem Vantagem em jogadas de ataque contra essa criatura por 1 minuto ou até usar esta característica novamente. Se a criatura cair a 0 Pontos de Vida antes de o voto terminar, você pode transferir o voto para outra criatura a até 9 metros de você (nenhuma ação necessária).',
        },
        {
          level: 7,
          name: 'Vingador Implacável',
          description:
            'Quando você atinge uma criatura com um Ataque de Oportunidade, pode reduzir o Deslocamento dela a 0 até o fim do turno atual. Você pode então se mover até metade do seu Deslocamento como parte da mesma Reação; esse movimento não provoca Ataques de Oportunidade.',
        },
        {
          level: 15,
          name: 'Alma da Vingança',
          description:
            'Imediatamente após uma criatura sob efeito do seu Voto de Inimizade acertar ou errar uma jogada de ataque, você pode usar sua Reação para fazer um ataque corpo a corpo contra ela, se ela estiver ao seu alcance.',
        },
        {
          level: 20,
          name: 'Anjo Vingador',
          description:
            'Com uma Ação Bônus, você assume a forma de um anjo vingador por 10 minutos ou até encerrá-la (nenhuma ação necessária). Durante esse tempo: asas espectrais surgem em suas costas, concedendo Deslocamento de Voo de 18 metros e a capacidade de pairar; e sempre que um inimigo começar o turno dentro da sua Aura de Proteção, ele deve ser bem-sucedido em um teste de resistência de Sabedoria ou ficará Amedrontado por 1 minuto ou até sofrer dano. Jogadas de ataque contra uma criatura Amedrontada dessa forma têm Vantagem. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um espaço de magia de 5º círculo para restaurar o uso.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['bane', 'hunters-mark'] },
        { level: 5, spells: ['hold-person', 'misty-step'] },
        { level: 9, spells: ['haste', 'protection-from-energy'] },
        { level: 13, spells: ['banishment', 'dimension-door'] },
        { level: 17, spells: ['hold-monster', 'scrying'] },
      ],
    },
  ],
};
