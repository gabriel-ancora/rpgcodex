import type { ClassData } from '../types';

const ASI =
  'Você ganha o talento Aumento no Valor de Atributo ou outro talento de sua escolha para o qual se qualifique.';
const SUB = 'Você ganha uma característica da sua subclasse de Feiticeiro.';

export const SORCERER: ClassData = {
  id: 'sorcerer',
  name: 'Feiticeiro',
  nameEn: 'Sorcerer',
  summary:
    'Conjurador cuja magia é inata, vinda de uma linhagem, de um dom ou de uma exposição a forças sobrenaturais, e que molda suas magias com Metamagia.',
  hitDie: 6,
  primaryAbilities: ['cha'],
  savingThrows: ['con', 'cha'],
  armorTraining: [],
  weaponProficiencies: ['Armas Simples'],
  toolProficiencies: [],
  skillChoices: {
    count: 2,
    options: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
  },
  features: [
    {
      level: 1,
      name: 'Conjuração',
      description:
        'Você extrai magia do seu ser interior para conjurar magias. Carisma é o seu atributo de conjuração: a CD de resistência das suas magias é 8 + modificador de Carisma + Bônus de Proficiência, e o modificador de ataque mágico é modificador de Carisma + Bônus de Proficiência. Você conhece truques e prepara magias da lista de Feiticeiro nas quantidades indicadas na tabela da classe, e usa espaços de magia para conjurá-las, recuperando todos os espaços gastos ao terminar um Descanso Longo. Sempre que ganhar um nível de Feiticeiro, você pode trocar um truque por outro e uma magia preparada por outra da lista de Feiticeiro. Você pode usar um Foco Arcano como foco de conjuração para as suas magias de Feiticeiro.',
    },
    {
      level: 1,
      name: 'Feitiçaria Inata',
      description:
        'Um evento do seu passado deixou uma marca indelével em você, infundindo-o com magia latente. Com uma Ação Bônus, você pode liberar essa magia por 1 minuto. Durante esse tempo, a CD de resistência das suas magias de Feiticeiro aumenta em 1 e você tem Vantagem nas jogadas de ataque das magias de Feiticeiro que conjurar. Você pode usar esta característica duas vezes e recupera todos os usos ao terminar um Descanso Longo.',
    },
    {
      level: 2,
      name: 'Fonte de Magia',
      description:
        'Você pode acessar a fonte de magia dentro de si, representada por Pontos de Feitiçaria, que permitem criar diversos efeitos mágicos. Você tem uma quantidade de Pontos de Feitiçaria igual ao seu nível de Feiticeiro (ver coluna Pontos de Feitiçaria) e recupera todos os pontos gastos ao terminar um Descanso Longo. Convertendo Espaços em Pontos: você pode gastar um espaço de magia para ganhar uma quantidade de Pontos de Feitiçaria igual ao círculo do espaço (nenhuma ação necessária). Criando Espaços de Magia: com uma Ação Bônus, você pode transformar Pontos de Feitiçaria em um espaço de magia, sem ultrapassar o círculo máximo de 5; o custo é 2 pontos para um espaço de 1º círculo (nível mínimo de Feiticeiro 2), 3 pontos para 2º círculo (nível 3), 5 pontos para 3º círculo (nível 5), 6 pontos para 4º círculo (nível 7) e 7 pontos para 5º círculo (nível 9). Espaços criados dessa forma desaparecem quando você termina um Descanso Longo.',
    },
    {
      level: 2,
      name: 'Metamagia',
      description:
        'Você pode alterar suas magias para adequá-las às suas necessidades. Você ganha duas opções de Metamagia à sua escolha, que usam Pontos de Feitiçaria. Você ganha mais duas opções no nível 10 e mais duas no nível 17 de Feiticeiro. Sempre que ganhar um nível de Feiticeiro, você pode trocar uma opção de Metamagia conhecida por outra. Você só pode usar uma opção de Metamagia em uma magia ao conjurá-la, a menos que a opção diga o contrário.',
    },
    {
      level: 3,
      name: 'Subclasse de Feiticeiro',
      description:
        'Você ganha uma subclasse de Feiticeiro à sua escolha. A subclasse concede características nos níveis 3, 6, 14 e 18 de Feiticeiro.',
    },
    { level: 4, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 5,
      name: 'Restauração Feiticeira',
      description:
        'Ao terminar um Descanso Curto, você pode recuperar Pontos de Feitiçaria gastos, até um total igual à metade do seu nível de Feiticeiro (arredondado para baixo). Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.',
    },
    { level: 6, name: 'Característica de Subclasse', description: SUB },
    {
      level: 7,
      name: 'Feitiçaria Incorporada',
      description:
        'Se não tiver usos restantes de Feitiçaria Inata, você pode usá-la gastando 2 Pontos de Feitiçaria ao realizar a Ação Bônus para ativá-la. Além disso, enquanto sua Feitiçaria Inata estiver ativa, você pode usar até duas opções de Metamagia em cada magia que conjurar.',
    },
    { level: 8, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 10,
      name: 'Metamagia',
      description: 'Você ganha mais duas opções de Metamagia à sua escolha.',
    },
    { level: 12, name: 'Aumento no Valor de Atributo', description: ASI },
    { level: 14, name: 'Característica de Subclasse', description: SUB },
    { level: 16, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 17,
      name: 'Metamagia',
      description: 'Você ganha mais duas opções de Metamagia à sua escolha.',
    },
    { level: 18, name: 'Característica de Subclasse', description: SUB },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento de sua escolha para o qual se qualifique.',
    },
    {
      level: 20,
      name: 'Apoteose Arcana',
      description:
        'Enquanto sua Feitiçaria Inata estiver ativa, você pode usar uma opção de Metamagia em cada um dos seus turnos sem gastar Pontos de Feitiçaria nela.',
    },
  ],
  tableColumns: [
    {
      label: 'Pontos de Feitiçaria',
      values: ['—', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
    },
  ],
  subclasses: [
    {
      id: 'aberrant-sorcery',
      name: 'Feitiçaria Aberrante',
      nameEn: 'Aberrant Sorcery',
      summary:
        'Feiticeiros cujo poder psiônico vem de uma influência alienígena, como a exposição ao Reino Distante ou a uma aberração.',
      features: [
        {
          level: 3,
          name: 'Magias Psiônicas',
          description:
            'Ao atingir os níveis de Feiticeiro indicados, você passa a ter sempre preparadas: nível 3, Braços de Hadar, Acalmar Emoções, Detectar Pensamentos, Sussurros Dissonantes e Fragmento Mental; nível 5, Fome de Hadar e Enviar Mensagem; nível 7, Tentáculos Negros de Evard e Invocar Aberração; nível 9, Vínculo Telepático de Rary e Telecinese.',
        },
        {
          level: 3,
          name: 'Fala Telepática',
          description:
            'Você pode formar uma conexão telepática entre a sua mente e a de outra criatura. Com uma Ação Bônus, escolha uma criatura que você possa ver a até 9 metros. Você e ela podem falar telepaticamente um com o outro enquanto estiverem a uma distância, em quilômetros, de até 1,5 vezes o seu modificador de Carisma (mínimo de 1,5 quilômetro). Para se entenderem, ambos precisam usar mentalmente um idioma que o outro conheça. A conexão dura um número de minutos igual ao seu nível de Feiticeiro e termina antes se você usar esta característica para se conectar a outra criatura.',
        },
        {
          level: 6,
          name: 'Feitiçaria Psiônica',
          description:
            'Quando conjurar qualquer magia de 1º círculo ou superior das suas Magias Psiônicas, você pode conjurá-la gastando um espaço de magia como de costume ou gastando uma quantidade de Pontos de Feitiçaria igual ao círculo da magia. Se conjurá-la usando Pontos de Feitiçaria, ela não exige componentes Verbais nem Somáticos, e não exige componentes Materiais a menos que sejam consumidos pela magia ou tenham um custo especificado.',
        },
        {
          level: 6,
          name: 'Defesas Psíquicas',
          description:
            'Você tem Resistência a dano Psíquico e Vantagem em testes de resistência para evitar ou encerrar as condições Amedrontado ou Enfeitiçado.',
        },
        {
          level: 14,
          name: 'Revelação na Carne',
          description:
            'Você pode liberar a verdade aberrante escondida em si. Com uma Ação Bônus, gaste 1 ou mais Pontos de Feitiçaria para alterar magicamente o seu corpo por 10 minutos. Para cada ponto gasto, escolha um dos benefícios a seguir. Adaptação Aquática: você ganha Deslocamento de Natação igual ao dobro do seu Deslocamento e pode respirar debaixo da água; guelras surgem no seu pescoço. Voo Reluzente: você ganha Deslocamento de Voo igual ao seu Deslocamento e pode pairar; sua pele brilha com um muco ou cintilação sobrenatural. Ver o Invisível: você pode ver qualquer criatura Invisível a até 18 metros de você que não esteja atrás de Cobertura Total; seus olhos ficam negros ou viram tentáculos sensoriais. Movimento Vermiforme: seu corpo, junto com o que você estiver vestindo ou carregando, torna-se viscoso e flexível; você pode passar por espaços de até 2,5 centímetros de largura e pode gastar 1,5 metro de movimento para escapar de amarras não mágicas ou da condição Agarrado.',
        },
        {
          level: 18,
          name: 'Implosão Distorcida',
          description:
            'Com uma ação de Magia, você se teletransporta para um espaço desocupado que possa ver a até 36 metros. Imediatamente após o teletransporte, cada criatura a até 9 metros do espaço que você deixou deve fazer um teste de resistência de Força contra a sua CD de magia. Se falhar, sofre 3d10 de dano de Energia e é puxada em linha reta em direção ao espaço que você deixou, terminando em um espaço desocupado o mais próximo possível dele. Se passar, sofre metade do dano e não é puxada. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste 5 Pontos de Feitiçaria para usá-la de novo.',
        },
      ],
      alwaysPrepared: [
        {
          level: 3,
          spells: ['arms-of-hadar', 'calm-emotions', 'detect-thoughts', 'dissonant-whispers', 'mind-sliver'],
        },
        { level: 5, spells: ['hunger-of-hadar', 'sending'] },
        { level: 7, spells: ['evards-black-tentacles', 'summon-aberration'] },
        { level: 9, spells: ['rarys-telepathic-bond', 'telekinesis'] },
      ],
    },
    {
      id: 'clockwork-sorcery',
      name: 'Feitiçaria Mecânica',
      nameEn: 'Clockwork Sorcery',
      summary:
        'Feiticeiros cuja magia vem das forças cósmicas da ordem, como o plano de Mechanus, e que usam essa ordem para equilibrar o caos.',
      features: [
        {
          level: 3,
          name: 'Magias Mecânicas',
          description:
            'Ao atingir os níveis de Feiticeiro indicados, você passa a ter sempre preparadas: nível 3, Auxílio, Alarme, Restauração Menor e Proteção contra o Bem e o Mal; nível 5, Dissipar Magia e Proteção contra Energia; nível 7, Liberdade de Movimento e Invocar Constructo; nível 9, Restauração Maior e Muralha de Energia. Além disso, escolha ou role uma manifestação da ordem que se revela quando você conjura uma magia de Feiticeiro: engrenagens espectrais pairam atrás de você; os ponteiros de um relógio aparecem nos seus olhos; sua pele brilha com um tom metálico; equações e figuras geométricas flutuam sobre o seu corpo; seu foco de conjuração assume momentaneamente a forma de um mecanismo de relógio; ou o som de engrenagens girando ou de um relógio tiquetaqueando pode ser ouvido por você e pelas criaturas afetadas pela magia.',
        },
        {
          level: 3,
          name: 'Restaurar Equilíbrio',
          description:
            'Sua conexão com a ordem permite equilibrar momentos caóticos. Quando uma criatura que você possa ver a até 18 metros estiver prestes a rolar um d20 com Vantagem ou Desvantagem, você pode usar sua Reação para impedir que a jogada seja afetada por Vantagem e Desvantagem. Você pode usar esta característica um número de vezes igual ao seu modificador de Carisma (mínimo de uma) e recupera todos os usos ao terminar um Descanso Longo.',
        },
        {
          level: 6,
          name: 'Bastião da Lei',
          description:
            'Com uma ação de Magia, você pode gastar de 1 a 5 Pontos de Feitiçaria para criar uma proteção mágica ao redor de você ou de outra criatura que possa ver a até 9 metros. A proteção é representada por uma quantidade de d8 igual aos pontos gastos. Quando a criatura protegida sofrer dano, ela pode gastar quantos desses dados quiser, rolá-los e reduzir o dano sofrido pelo total rolado. A proteção dura até você terminar um Descanso Longo ou usar esta característica novamente.',
        },
        {
          level: 14,
          name: 'Transe de Ordem',
          description:
            'Com uma Ação Bônus, você entra em um estado de alinhamento com a ordem por 1 minuto. Durante esse tempo, jogadas de ataque contra você não podem se beneficiar de Vantagem e, sempre que você fizer um Teste de D20, pode tratar um resultado de 9 ou menos no d20 como um 10. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste 5 Pontos de Feitiçaria para usá-la de novo.',
        },
        {
          level: 18,
          name: 'Cavalgada Mecânica',
          description:
            'Com uma ação de Magia, você invoca momentaneamente espíritos da ordem para expurgar a desordem em um Cubo de 9 metros originado em você. Os espíritos produzem os seguintes efeitos dentro do Cubo. Cura: os espíritos restauram até 100 Pontos de Vida, divididos como você escolher entre qualquer quantidade de criaturas de sua escolha no Cubo. Reparo: quaisquer objetos danificados inteiramente dentro do Cubo são reparados instantaneamente. Dissipação: toda magia de 6º círculo ou inferior termina sobre criaturas e objetos de sua escolha no Cubo. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste 7 Pontos de Feitiçaria para usá-la de novo.',
        },
      ],
      alwaysPrepared: [
        {
          level: 3,
          spells: ['aid', 'alarm', 'lesser-restoration', 'protection-from-evil-and-good'],
        },
        { level: 5, spells: ['dispel-magic', 'protection-from-energy'] },
        { level: 7, spells: ['freedom-of-movement', 'summon-construct'] },
        { level: 9, spells: ['greater-restoration', 'wall-of-force'] },
      ],
    },
    {
      id: 'draconic-sorcery',
      name: 'Feitiçaria Dracônica',
      nameEn: 'Draconic Sorcery',
      summary:
        'Feiticeiros cuja magia vem da influência de dragões, seja por linhagem, pacto ou exposição à magia dracônica.',
      features: [
        {
          level: 3,
          name: 'Resiliência Dracônica',
          description:
            'A magia no seu corpo manifesta traços físicos do seu dom dracônico. Seu máximo de Pontos de Vida aumenta em 3, e aumenta em 1 sempre que você ganhar outro nível de Feiticeiro. Partes do seu corpo são cobertas por escamas semelhantes às de um dragão. Enquanto não estiver usando armadura, sua Classe de Armadura base é 10 + seu modificador de Destreza + seu modificador de Carisma.',
        },
        {
          level: 3,
          name: 'Magias Dracônicas',
          description:
            'Ao atingir os níveis de Feiticeiro indicados, você passa a ter sempre preparadas: nível 3, Alterar-se, Orbe Cromático, Comando e Sopro do Dragão; nível 5, Medo e Voo; nível 7, Olho Arcano e Enfeitiçar Monstro; nível 9, Lenda e Saber e Invocar Dragão.',
        },
        {
          level: 6,
          name: 'Afinidade Elemental',
          description:
            'Sua magia dracônica tem afinidade com um tipo de dano associado aos dragões. Escolha um destes tipos: Ácido, Elétrico, Frio, Fogo ou Venenoso. Você tem Resistência a esse tipo de dano e, sempre que conjurar uma magia que cause dano desse tipo, pode somar seu modificador de Carisma a uma jogada de dano dessa magia.',
        },
        {
          level: 14,
          name: 'Asas de Dragão',
          description:
            'Com uma Ação Bônus, você faz surgir asas dracônicas nas suas costas. As asas duram 1 hora ou até você dispensá-las (nenhuma ação necessária). Enquanto durarem, você tem Deslocamento de Voo de 18 metros. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste 3 Pontos de Feitiçaria para usá-la de novo.',
        },
        {
          level: 18,
          name: 'Companheiro Dracônico',
          description:
            'Você pode conjurar Invocar Dragão sem componente Material. Também pode conjurá-la uma vez sem gastar um espaço de magia, recuperando esse uso ao terminar um Descanso Longo. Sempre que começar a conjurar essa magia, você pode modificá-la para que não exija Concentração; nesse caso, a duração passa a ser de 1 minuto para essa conjuração.',
        },
      ],
      alwaysPrepared: [
        { level: 3, spells: ['alter-self', 'chromatic-orb', 'command', 'dragons-breath'] },
        { level: 5, spells: ['fear', 'fly'] },
        { level: 7, spells: ['arcane-eye', 'charm-monster'] },
        { level: 9, spells: ['legend-lore', 'summon-dragon'] },
      ],
    },
    {
      id: 'wild-magic-sorcery',
      name: 'Feitiçaria Selvagem',
      nameEn: 'Wild Magic Sorcery',
      summary:
        'Feiticeiros cuja magia nasce das forças do caos, produzindo surtos imprevisíveis que podem ser tanto benéficos quanto perigosos.',
      features: [
        {
          level: 3,
          name: 'Surto de Magia Selvagem',
          description:
            'Sua conjuração pode liberar surtos de magia descontrolada. Uma vez por turno, imediatamente após conjurar uma magia de Feiticeiro usando um espaço de magia, você pode rolar 1d20. Se o resultado for 20, role na tabela de Surto de Magia Selvagem para criar um efeito aleatório. Se esse efeito for uma magia, ela é caótica demais para ser afetada por Metamagia.',
        },
        {
          level: 3,
          name: 'Marés do Caos',
          description:
            'Você pode manipular o caos para obter Vantagem em um Teste de D20 antes de rolá-lo. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo. Se conjurar uma magia de Feiticeiro usando um espaço de magia antes de terminar um Descanso Longo, você rola automaticamente na tabela de Surto de Magia Selvagem e recupera o uso desta característica.',
        },
        {
          level: 6,
          name: 'Dobrar a Sorte',
          description:
            'Você pode torcer o destino com a sua magia selvagem. Imediatamente após outra criatura que você possa ver rolar o d20 de um Teste de D20, você pode usar sua Reação e gastar 1 Ponto de Feitiçaria para rolar 1d4 e somar ou subtrair o resultado do d20 (à sua escolha).',
        },
        {
          level: 14,
          name: 'Caos Controlado',
          description:
            'Você ganha certo controle sobre os surtos da sua magia selvagem. Sempre que rolar na tabela de Surto de Magia Selvagem, você pode rolar duas vezes e usar qualquer um dos resultados.',
        },
        {
          level: 18,
          name: 'Surto Domado',
          description:
            'Imediatamente após conjurar uma magia de Feiticeiro usando um espaço de magia, você pode criar um efeito à sua escolha da tabela de Surto de Magia Selvagem em vez de rolar nela. Você pode escolher qualquer efeito da tabela, exceto o da última linha, e se o efeito envolver uma rolagem, você deve fazê-la. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.',
        },
      ],
    },
  ],
  optionGroups: [
    {
      id: 'metamagic',
      name: 'Metamagia',
      level: 2,
      countByLevel: [0, 2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6],
      options: [
        {
          id: 'careful-spell',
          name: 'Magia Cuidadosa',
          description:
            'Custo: 1 Ponto de Feitiçaria. Quando conjurar uma magia que force outras criaturas a fazer um teste de resistência, você pode proteger algumas delas da força total da magia. Escolha um número dessas criaturas igual ao seu modificador de Carisma (mínimo de uma). Elas são automaticamente bem-sucedidas no teste e não sofrem dano se normalmente sofreriam metade do dano com um sucesso.',
        },
        {
          id: 'distant-spell',
          name: 'Magia Distante',
          description:
            'Custo: 1 Ponto de Feitiçaria. Quando conjurar uma magia com alcance de pelo menos 1,5 metro, você pode dobrar esse alcance. Alternativamente, quando conjurar uma magia com alcance de Toque, o alcance passa a ser de 9 metros.',
        },
        {
          id: 'empowered-spell',
          name: 'Magia Potencializada',
          description:
            'Custo: 1 Ponto de Feitiçaria. Ao rolar o dano de uma magia, você pode rolar novamente uma quantidade de dados de dano até o seu modificador de Carisma (mínimo de um), devendo usar os novos resultados. Você pode usar esta opção mesmo que já tenha usado outra opção de Metamagia na mesma magia.',
        },
        {
          id: 'extended-spell',
          name: 'Magia Estendida',
          description:
            'Custo: 1 Ponto de Feitiçaria. Quando conjurar uma magia com duração de 1 minuto ou mais, você pode dobrar essa duração, até um máximo de 24 horas. Se a magia afetada exigir Concentração, você tem Vantagem em qualquer teste de resistência feito para manter essa Concentração.',
        },
        {
          id: 'heightened-spell',
          name: 'Magia Elevada',
          description:
            'Custo: 2 Pontos de Feitiçaria. Quando conjurar uma magia que force uma criatura a fazer um teste de resistência, você pode dar a um alvo da magia Desvantagem nos testes de resistência contra ela.',
        },
        {
          id: 'quickened-spell',
          name: 'Magia Acelerada',
          description:
            'Custo: 2 Pontos de Feitiçaria. Quando conjurar uma magia com tempo de conjuração de uma ação, você pode mudar o tempo de conjuração para uma Ação Bônus. Você não pode usar esta opção se já tiver conjurado uma magia de 1º círculo ou superior no turno atual, nem pode conjurar uma magia de 1º círculo ou superior neste turno depois de usá-la.',
        },
        {
          id: 'seeking-spell',
          name: 'Magia Buscadora',
          description:
            'Custo: 1 Ponto de Feitiçaria. Se errar uma jogada de ataque de magia, você pode rolar o d20 novamente, devendo usar o novo resultado. Você pode usar esta opção mesmo que já tenha usado outra opção de Metamagia na mesma magia.',
        },
        {
          id: 'subtle-spell',
          name: 'Magia Sutil',
          description:
            'Custo: 1 Ponto de Feitiçaria. Ao conjurar uma magia, você pode conjurá-la sem nenhum componente Verbal, Somático ou Material, exceto componentes Materiais consumidos pela magia ou que tenham um custo especificado.',
        },
        {
          id: 'transmuted-spell',
          name: 'Magia Transmutada',
          description:
            'Custo: 1 Ponto de Feitiçaria. Quando conjurar uma magia que cause um tipo de dano entre Ácido, Elétrico, Frio, Fogo, Trovejante ou Venenoso, você pode trocar esse tipo de dano por outro da mesma lista.',
        },
        {
          id: 'twinned-spell',
          name: 'Magia Gêmea',
          description:
            'Custo: 1 Ponto de Feitiçaria. Quando conjurar uma magia, como Enfeitiçar Pessoa, que possa ter como alvo uma criatura adicional quando conjurada em um círculo superior, você pode aumentar o círculo efetivo da magia em 1.',
        },
      ],
    },
  ],
};
