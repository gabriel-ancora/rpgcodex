import type { ClassData } from '../types';

export const MONK: ClassData = {
  id: 'monk',
  name: 'Monge',
  nameEn: 'Monk',
  summary:
    'Artista marcial que canaliza a energia interior do Foco para golpear com velocidade sobrenatural, desviar ataques e superar os limites do corpo.',
  hitDie: 8,
  primaryAbilities: ['dex', 'wis'],
  savingThrows: ['str', 'dex'],
  armorTraining: [],
  weaponProficiencies: ['Armas Simples', 'Armas Marciais com a propriedade Leve'],
  toolProficiencies: ['Um tipo de Ferramentas de Artesão ou um Instrumento Musical à sua escolha'],
  skillChoices: {
    count: 2,
    options: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
  },
  features: [
    {
      level: 1,
      name: 'Artes Marciais',
      description:
        'Sua prática de artes marciais lhe dá domínio de estilos de combate que usam Ataques Desarmados e armas de Monge, que são Armas Simples corpo a corpo e Armas Marciais corpo a corpo com a propriedade Leve. Você ganha os benefícios a seguir enquanto estiver desarmado ou empunhando apenas armas de Monge e não estiver usando armadura nem empunhando um Escudo. Golpe Desarmado Bônus: você pode fazer um Ataque Desarmado como Ação Bônus. Dado de Artes Marciais: você pode rolar 1d6 no lugar do dano normal do seu Ataque Desarmado ou arma de Monge; esse dado aumenta para 1d8 no nível 5, 1d10 no nível 11 e 1d12 no nível 17 (ver tabela da classe). Ataques Destros: você pode usar seu modificador de Destreza em vez de Força nas jogadas de ataque e de dano dos seus Ataques Desarmados e armas de Monge. Além disso, ao usar as opções Agarrar ou Empurrar do Ataque Desarmado, pode usar Destreza em vez de Força para determinar a CD da salvaguarda.',
    },
    {
      level: 1,
      name: 'Defesa sem Armadura',
      description:
        'Enquanto não estiver usando armadura nem empunhando um Escudo, sua Classe de Armadura base é 10 + seu modificador de Destreza + seu modificador de Sabedoria.',
    },
    {
      level: 2,
      name: 'Foco do Monge',
      description:
        'Seu foco e treinamento marcial permitem canalizar uma energia extraordinária, representada por Pontos de Foco. Seu nível de Monge determina quantos pontos você tem (ver tabela da classe). Você recupera todos os Pontos de Foco gastos ao terminar um Descanso Curto ou Longo. Se uma característica de Foco exigir salvaguarda, a CD é 8 + seu modificador de Sabedoria + seu Bônus de Proficiência. Você pode gastar os pontos nas opções a seguir. Rajada de Golpes: gaste 1 Ponto de Foco para fazer dois Ataques Desarmados como Ação Bônus. Defesa Paciente: você pode realizar a ação Desengajar como Ação Bônus; ou gaste 1 Ponto de Foco para realizar as ações Desengajar e Esquivar como Ação Bônus. Passo do Vento: você pode realizar a ação Disparada como Ação Bônus; ou gaste 1 Ponto de Foco para realizar as ações Desengajar e Disparada como Ação Bônus, e sua distância de salto é dobrada neste turno.',
    },
    {
      level: 2,
      name: 'Movimento sem Armadura',
      description:
        'Seu Deslocamento aumenta em 3 metros enquanto você não estiver usando armadura nem empunhando um Escudo. Esse bônus aumenta conforme a tabela da classe: 4,5 metros no nível 6, 6 metros no nível 10, 7,5 metros no nível 14 e 9 metros no nível 18.',
    },
    {
      level: 2,
      name: 'Metabolismo Sobrenatural',
      description:
        'Quando rolar Iniciativa, você pode recuperar todos os Pontos de Foco gastos. Ao fazer isso, role seu Dado de Artes Marciais e recupere Pontos de Vida iguais ao resultado + seu nível de Monge. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.',
    },
    {
      level: 3,
      name: 'Desviar Ataques',
      description:
        'Quando uma jogada de ataque atingir você e o dano incluir dano Contundente, Cortante ou Perfurante, você pode usar sua Reação para reduzir o dano total do ataque em 1d10 + seu modificador de Destreza + seu nível de Monge. Se reduzir o dano a 0, pode gastar 1 Ponto de Foco para redirecionar parte da força do ataque. Se o ataque foi corpo a corpo, escolha uma criatura que possa ver a até 1,5 metro de você; se foi à distância, escolha uma criatura que possa ver a até 18 metros de você que não esteja atrás de Cobertura Total. Essa criatura deve ser bem-sucedida em uma salvaguarda de Destreza ou sofre dano igual a duas rolagens do seu Dado de Artes Marciais + seu modificador de Destreza, do mesmo tipo causado pelo ataque.',
    },
    {
      level: 3,
      name: 'Subclasse de Monge',
      description:
        'Você escolhe uma subclasse de Monge (Guerreiro da Misericórdia, Guerreiro da Sombra, Guerreiro dos Elementos ou Guerreiro da Mão Aberta). Ela concede características nos níveis 3, 6, 11 e 17 de Monge.',
    },
    {
      level: 4,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique. Esta característica é obtida novamente nos níveis 8, 12 e 16 de Monge.',
    },
    {
      level: 4,
      name: 'Queda Lenta',
      description:
        'Você pode usar sua Reação ao cair para reduzir o dano de queda que sofreria em uma quantidade igual a cinco vezes o seu nível de Monge.',
    },
    {
      level: 5,
      name: 'Ataque Extra',
      description:
        'Você pode atacar duas vezes, em vez de uma, sempre que realizar a ação de Ataque no seu turno.',
    },
    {
      level: 5,
      name: 'Ataque Atordoante',
      description:
        'Uma vez por turno, quando atingir uma criatura com uma arma de Monge ou um Ataque Desarmado, você pode gastar 1 Ponto de Foco para tentar um golpe atordoante. O alvo faz uma salvaguarda de Constituição. Se falhar, fica Atordoado até o início do seu próximo turno. Se for bem-sucedido, o Deslocamento dele é reduzido à metade até o início do seu próximo turno, e a próxima jogada de ataque feita contra ele antes desse momento tem Vantagem.',
    },
    {
      level: 6,
      name: 'Golpes Fortalecidos',
      description:
        'Sempre que causar dano com seu Ataque Desarmado, você pode causar dano de Energia ou o tipo de dano normal do Ataque Desarmado.',
    },
    {
      level: 6,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Monge.',
    },
    {
      level: 7,
      name: 'Evasão',
      description:
        'Quando for alvo de um efeito que permita uma salvaguarda de Destreza para sofrer apenas metade do dano, você não sofre dano algum se for bem-sucedido e apenas metade se falhar. Você não recebe esse benefício se estiver Incapacitado.',
    },
    {
      level: 8,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 9,
      name: 'Movimento Acrobático',
      description:
        'Enquanto não estiver usando armadura nem empunhando um Escudo, você pode se mover ao longo de superfícies verticais e sobre líquidos durante o seu turno sem cair durante o movimento.',
    },
    {
      level: 10,
      name: 'Foco Elevado',
      description:
        'Rajada de Golpes, Defesa Paciente e Passo do Vento ganham os benefícios a seguir. Rajada de Golpes: você pode gastar 1 Ponto de Foco para fazer três Ataques Desarmados em vez de dois. Defesa Paciente: ao gastar um Ponto de Foco nela, você ganha Pontos de Vida Temporários iguais a duas rolagens do seu Dado de Artes Marciais. Passo do Vento: ao gastar um Ponto de Foco nele, você pode escolher uma criatura voluntária Grande ou menor a até 1,5 metro de você; ela se move com você até o fim do seu turno, e o movimento dela não provoca Ataques de Oportunidade.',
    },
    {
      level: 10,
      name: 'Autorrestauração',
      description:
        'Pela força de vontade, você pode remover uma das condições a seguir de si mesmo no fim de cada um dos seus turnos: Amedrontado, Enfeitiçado ou Envenenado. Além disso, ficar sem comida e bebida não lhe causa Exaustão.',
    },
    {
      level: 11,
      name: 'Característica de Subclasse',
      description: 'Você ganha uma característica da sua subclasse de Monge.',
    },
    {
      level: 12,
      name: 'Aumento no Valor de Atributo',
      description:
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento à sua escolha para o qual se qualifique.',
    },
    {
      level: 13,
      name: 'Desviar Energia',
      description:
        'Você pode usar Desviar Ataques contra ataques que causem qualquer tipo de dano, não apenas Contundente, Cortante ou Perfurante.',
    },
    {
      level: 14,
      name: 'Sobrevivente Disciplinado',
      description:
        'Você ganha proficiência em todas as salvaguardas. Além disso, sempre que falhar em uma salvaguarda, pode gastar 1 Ponto de Foco para jogá-la novamente, e deve usar o novo resultado.',
    },
    {
      level: 15,
      name: 'Foco Perfeito',
      description:
        'Quando rolar Iniciativa e não usar Metabolismo Sobrenatural, você recupera Pontos de Foco gastos até ter 4, caso tenha 3 ou menos.',
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
      description: 'Você ganha uma característica da sua subclasse de Monge.',
    },
    {
      level: 18,
      name: 'Defesa Superior',
      description:
        'No início do seu turno, você pode gastar 3 Pontos de Foco para se fortalecer contra danos por 1 minuto ou até ficar Incapacitado. Durante esse tempo, você tem Resistência a todos os tipos de dano, exceto Energia.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento à sua escolha para o qual se qualifique. Recomenda-se a Dádiva do Espírito Noturno.',
    },
    {
      level: 20,
      name: 'Corpo e Mente',
      description:
        'Você desenvolveu corpo e mente a novos patamares. Seus valores de Destreza e Sabedoria aumentam em 4, até um máximo de 25.',
    },
  ],
  tableColumns: [
    {
      label: 'Artes Marciais',
      values: ['1d6', '1d6', '1d6', '1d6', '1d8', '1d8', '1d8', '1d8', '1d8', '1d8', '1d10', '1d10', '1d10', '1d10', '1d10', '1d10', '1d12', '1d12', '1d12', '1d12'],
    },
    {
      label: 'Pontos de Foco',
      values: ['—', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
    },
    {
      label: 'Movimento sem Armadura',
      values: [
        '—',
        '+3 m',
        '+3 m',
        '+3 m',
        '+3 m',
        '+4,5 m',
        '+4,5 m',
        '+4,5 m',
        '+4,5 m',
        '+6 m',
        '+6 m',
        '+6 m',
        '+6 m',
        '+7,5 m',
        '+7,5 m',
        '+7,5 m',
        '+7,5 m',
        '+9 m',
        '+9 m',
        '+9 m',
      ],
    },
  ],
  subclasses: [
    {
      id: 'warrior-of-mercy',
      name: 'Guerreiro da Misericórdia',
      nameEn: 'Warrior of Mercy',
      summary: 'Monges que manipulam a força vital dos outros, curando aliados e levando dor e morte aos inimigos.',
      features: [
        {
          level: 3,
          name: 'Mão do Dano',
          description:
            'Uma vez por turno, quando atingir uma criatura com um Ataque Desarmado e causar dano, você pode gastar 1 Ponto de Foco para causar dano Necrótico extra igual a uma rolagem do seu Dado de Artes Marciais + seu modificador de Sabedoria.',
        },
        {
          level: 3,
          name: 'Mão da Cura',
          description:
            'Como uma ação de Magia, você pode gastar 1 Ponto de Foco para tocar uma criatura e restaurar uma quantidade de Pontos de Vida igual a uma rolagem do seu Dado de Artes Marciais + seu modificador de Sabedoria. Quando usar Rajada de Golpes, você pode substituir um dos Ataques Desarmados por um uso desta característica sem gastar Ponto de Foco para a cura.',
        },
        {
          level: 3,
          name: 'Instrumentos da Misericórdia',
          description:
            'Você ganha proficiência nas perícias Intuição e Medicina e com o Kit de Herbalismo.',
        },
        {
          level: 6,
          name: 'Toque do Médico',
          description:
            'Mão do Dano e Mão da Cura se aprimoram. Mão do Dano: quando usá-la em uma criatura, você também pode deixá-la Envenenada até o fim do seu próximo turno. Mão da Cura: quando usá-la, você também pode encerrar uma das condições a seguir na criatura curada: Atordoado, Cego, Envenenado, Paralisado ou Surdo.',
        },
        {
          level: 11,
          name: 'Rajada de Cura e Dano',
          description:
            'Quando usar Rajada de Golpes, você pode substituir cada um dos Ataques Desarmados por um uso de Mão da Cura sem gastar Pontos de Foco para a cura. Além disso, quando fizer um Ataque Desarmado com Rajada de Golpes e causar dano, pode usar Mão do Dano com esse ataque sem gastar Ponto de Foco, mas ainda apenas uma vez por turno. Você pode usar esses benefícios sem custo um número total de vezes igual ao seu modificador de Sabedoria (mínimo uma) e recupera todos os usos ao terminar um Descanso Longo.',
        },
        {
          level: 17,
          name: 'Mão da Misericórdia Suprema',
          description:
            'Como uma ação de Magia, você pode tocar o cadáver de uma criatura que tenha morrido nas últimas 24 horas e gastar 5 Pontos de Foco. A criatura volta à vida com Pontos de Vida iguais a 4d10 + seu modificador de Sabedoria, e as condições a seguir são removidas dela: Atordoado, Cego, Envenenado, Paralisado e Surdo. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.',
        },
      ],
    },
    {
      id: 'warrior-of-shadow',
      name: 'Guerreiro da Sombra',
      nameEn: 'Warrior of Shadow',
      summary: 'Monges que usam a energia das sombras para furtividade, subterfúgio e deslocamento pela escuridão.',
      features: [
        {
          level: 3,
          name: 'Artes das Sombras',
          description:
            'Você aprendeu a usar sua energia para manipular sombras. Escuridão: você pode gastar 1 Ponto de Foco para conjurar a magia Escuridão sem componentes. Você consegue ver dentro da área da magia enquanto estiver a até 18 metros dela e, no início de cada um dos seus turnos enquanto ela durar, pode mover a área para um espaço a até 18 metros de você. Visão Sombria: você ganha Visão no Escuro com alcance de 18 metros; se já tiver Visão no Escuro, o alcance aumenta em 18 metros. Ilusões Sombrias: você conhece o truque Ilusão Menor, e Sabedoria é seu atributo de conjuração para ele.',
        },
        {
          level: 6,
          name: 'Passo das Sombras',
          description:
            'Enquanto estiver em Penumbra ou Escuridão, você pode usar uma Ação Bônus para se teletransportar até 18 metros para um espaço desocupado que possa ver e que também esteja em Penumbra ou Escuridão. Você então tem Vantagem no próximo ataque corpo a corpo que fizer antes do fim do turno atual.',
        },
        {
          level: 11,
          name: 'Passo das Sombras Aprimorado',
          description:
            'Você pode gastar 1 Ponto de Foco ao usar Passo das Sombras para remover a exigência de começar e terminar o teletransporte em Penumbra ou Escuridão. Ao gastar esse ponto, você também pode fazer um Ataque Desarmado imediatamente após se teletransportar.',
        },
        {
          level: 17,
          name: 'Manto das Sombras',
          description:
            'Como uma ação de Magia enquanto estiver em Penumbra ou Escuridão, você pode gastar 3 Pontos de Foco para se envolver em sombras por 1 minuto, até ficar Incapacitado ou até terminar seu turno em Luz Plena. Enquanto estiver envolto: Invisibilidade — você tem a condição Invisível; Parcialmente Incorpóreo — você pode atravessar espaços ocupados como se fossem Terreno Difícil, mas sofre 1d10 de dano de Energia se terminar o turno nesse espaço e é empurrado para o espaço desocupado mais próximo; Rajada Sombria — você pode usar Rajada de Golpes sem gastar Pontos de Foco.',
        },
      ],
    },
    {
      id: 'warrior-of-the-elements',
      name: 'Guerreiro dos Elementos',
      nameEn: 'Warrior of the Elements',
      summary: 'Monges que se sintonizam com os elementos, ampliando o alcance dos golpes e moldando forças elementais.',
      features: [
        {
          level: 3,
          name: 'Sintonia Elemental',
          description:
            'No início do seu turno, você pode gastar 1 Ponto de Foco para se imbuir de energia elemental. Isso dura 10 minutos ou até você ficar Incapacitado, e concede os benefícios a seguir. Alcance: ao fazer um Ataque Desarmado, seu alcance é 3 metros maior, pois a energia elemental se estende de você. Golpes Elementais: sempre que atingir com seu Ataque Desarmado, pode fazê-lo causar dano Ácido, Elétrico, de Fogo, de Frio ou Trovejante em vez do tipo normal. Ao fazê-lo, pode também forçar o alvo a fazer uma salvaguarda de Força; se falhar, você pode mover o alvo até 3 metros em sua direção ou para longe de você.',
        },
        {
          level: 3,
          name: 'Manipular Elementos',
          description: 'Você conhece o truque Elementalismo, e Sabedoria é seu atributo de conjuração para ele.',
        },
        {
          level: 6,
          name: 'Explosão Elemental',
          description:
            'Como uma ação de Magia, você pode gastar 2 Pontos de Foco para fazer energia elemental explodir em uma Esfera de 6 metros de raio centrada em um ponto a até 36 metros de você. Escolha um tipo de dano: Ácido, Elétrico, de Fogo, de Frio ou Trovejante. Cada criatura na Esfera faz uma salvaguarda de Destreza, sofrendo dano do tipo escolhido igual a três rolagens do seu Dado de Artes Marciais se falhar ou metade se for bem-sucedida.',
        },
        {
          level: 11,
          name: 'Passada dos Elementos',
          description:
            'Enquanto sua Sintonia Elemental estiver ativa, você tem Deslocamento de Voo e Deslocamento de Natação iguais ao seu Deslocamento.',
        },
        {
          level: 17,
          name: 'Epítome Elemental',
          description:
            'Enquanto sua Sintonia Elemental estiver ativa, você ganha os benefícios a seguir. Resistência a Dano: você ganha Resistência a um dos tipos de dano a seguir, à sua escolha: Ácido, Elétrico, de Fogo, de Frio ou Trovejante; no início de cada um dos seus turnos, pode mudar a escolha. Passada Destrutiva: quando usar Passo do Vento, seu Deslocamento aumenta em 6 metros até o fim do turno; nesse turno, qualquer criatura à sua escolha sofre dano igual a uma rolagem do seu Dado de Artes Marciais quando você entrar em um espaço a até 1,5 metro dela, do tipo escolhido entre Ácido, Elétrico, de Fogo, de Frio ou Trovejante. Uma criatura só pode sofrer esse dano uma vez por turno. Golpes Fortalecidos: uma vez em cada um dos seus turnos, você pode causar dano extra a um alvo igual a uma rolagem do seu Dado de Artes Marciais quando o atingir com um Ataque Desarmado; esse dano extra é do mesmo tipo do Ataque Desarmado.',
        },
      ],
    },
    {
      id: 'warrior-of-the-open-hand',
      name: 'Guerreiro da Mão Aberta',
      nameEn: 'Warrior of the Open Hand',
      summary: 'Mestres do combate desarmado que manipulam o movimento dos oponentes e o próprio corpo com precisão.',
      features: [
        {
          level: 3,
          name: 'Técnica da Mão Aberta',
          description:
            'Sempre que atingir uma criatura com um ataque concedido pela Rajada de Golpes, você pode impor um dos efeitos a seguir. Desorientar: o alvo não pode fazer Ataques de Oportunidade até o início do próximo turno dele. Empurrar: o alvo deve ser bem-sucedido em uma salvaguarda de Força ou é empurrado até 4,5 metros para longe de você. Derrubar: o alvo deve ser bem-sucedido em uma salvaguarda de Destreza ou fica Caído.',
        },
        {
          level: 6,
          name: 'Plenitude Corporal',
          description:
            'Você ganha a capacidade de se curar. Como uma Ação Bônus, role seu Dado de Artes Marciais e recupere Pontos de Vida iguais ao resultado + seu modificador de Sabedoria (mínimo 1 Ponto de Vida recuperado). Você pode usar esta característica um número de vezes igual ao seu modificador de Sabedoria (mínimo uma) e recupera todos os usos ao terminar um Descanso Longo.',
        },
        {
          level: 11,
          name: 'Passo Veloz',
          description:
            'Quando usar uma Ação Bônus que não seja Passo do Vento, você também pode usar Passo do Vento imediatamente depois dessa Ação Bônus.',
        },
        {
          level: 17,
          name: 'Palma Vibrante',
          description:
            'Você aprende a criar vibrações letais no corpo de alguém. Quando atingir uma criatura com um Ataque Desarmado, pode gastar 4 Pontos de Foco para iniciar vibrações imperceptíveis, que duram um número de dias igual ao seu nível de Monge. As vibrações são inofensivas até você usar sua ação para encerrá-las. Alternativamente, quando realizar a ação de Ataque no seu turno, pode abrir mão de um dos ataques para encerrar as vibrações. Para encerrá-las, você e o alvo devem estar no mesmo plano de existência. Quando você as encerra, o alvo faz uma salvaguarda de Constituição, sofrendo 10d12 de dano de Energia se falhar ou metade se for bem-sucedido. Você só pode ter uma criatura sob efeito desta característica por vez, e pode encerrar as vibrações de forma inofensiva (sem ação).',
        },
      ],
    },
  ],
};
