import type { ClassData } from '../types';

const ASI =
  'Você ganha o talento Aumento no Valor de Atributo ou outro talento de sua escolha para o qual se qualifique.';
const SUB = 'Você ganha uma característica da sua subclasse de Mago.';

const savant = (school: string) =>
  `Escolha duas magias de Mago da escola de ${school}, cada uma de 2º círculo ou inferior, e adicione-as ao seu grimório gratuitamente. Além disso, sempre que ganhar acesso a um novo círculo de espaços de magia nesta classe, você pode adicionar uma magia de Mago da escola de ${school} ao seu grimório gratuitamente; ela deve ser de um círculo para o qual você tenha espaços de magia.`;

export const WIZARD: ClassData = {
  id: 'wizard',
  name: 'Mago',
  nameEn: 'Wizard',
  summary:
    'Estudioso da magia arcana que registra suas magias em um grimório e domina o maior repertório de magias entre as classes.',
  hitDie: 6,
  primaryAbilities: ['int'],
  savingThrows: ['int', 'wis'],
  armorTraining: [],
  weaponProficiencies: ['Armas Simples'],
  toolProficiencies: [],
  skillChoices: {
    count: 2,
    options: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'],
  },
  features: [
    {
      level: 1,
      name: 'Conjuração',
      description:
        'Como estudante da magia arcana, você aprendeu a conjurar magias. Inteligência é o seu atributo de conjuração: a CD de resistência das suas magias é 8 + modificador de Inteligência + Bônus de Proficiência, e o modificador de ataque mágico é modificador de Inteligência + Bônus de Proficiência. Grimório: você possui um grimório com seis magias de Mago de 1º círculo à sua escolha. Sempre que ganhar um nível de Mago, adicione duas magias de Mago ao grimório, de círculos para os quais tenha espaços de magia. Você também pode copiar para o grimório magias de Mago encontradas em pergaminhos ou outros grimórios; copiar uma magia leva 2 horas e custa 50 PO por círculo da magia. Magias preparadas: você prepara magias de 1º círculo ou superior a partir do seu grimório, na quantidade indicada na tabela da classe, e conhece os truques indicados na tabela. Ao terminar um Descanso Longo, você pode trocar quantas magias preparadas quiser por outras do seu grimório, e pode trocar um truque por outro truque de Mago. Você usa espaços de magia para conjurar suas magias, recuperando todos os espaços gastos ao terminar um Descanso Longo. Você pode usar um Foco Arcano ou o seu grimório como foco de conjuração para as suas magias de Mago.',
    },
    {
      level: 1,
      name: 'Rituais',
      description:
        'Você pode conjurar qualquer magia como Ritual se ela tiver o marcador Ritual e estiver no seu grimório. Você não precisa ter a magia preparada, mas precisa ler o grimório para conjurá-la dessa forma.',
    },
    {
      level: 1,
      name: 'Recuperação Arcana',
      description:
        'Você pode recuperar parte da sua energia mágica estudando o seu grimório. Ao terminar um Descanso Curto, você pode escolher espaços de magia gastos para recuperar. Os espaços podem ter um círculo combinado igual ou inferior à metade do seu nível de Mago (arredondado para cima), e nenhum deles pode ser de 6º círculo ou superior. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.',
    },
    {
      level: 2,
      name: 'Estudioso',
      description:
        'Enquanto estudava magia, você também se especializou em outra área de conhecimento. Escolha uma das seguintes perícias na qual tenha proficiência: Arcanismo, História, Investigação, Medicina, Natureza ou Religião. Você ganha Especialização na perícia escolhida.',
    },
    {
      level: 3,
      name: 'Subclasse de Mago',
      description:
        'Você ganha uma subclasse de Mago à sua escolha. A subclasse concede características nos níveis 3, 6, 10 e 14 de Mago.',
    },
    { level: 4, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 5,
      name: 'Memorizar Magia',
      description:
        'Sempre que terminar um Descanso Curto, você pode estudar o seu grimório e trocar uma magia de Mago de 1º círculo ou superior que tenha preparada por outra magia de 1º círculo ou superior do grimório.',
    },
    { level: 6, name: 'Característica de Subclasse', description: SUB },
    { level: 8, name: 'Aumento no Valor de Atributo', description: ASI },
    { level: 10, name: 'Característica de Subclasse', description: SUB },
    { level: 12, name: 'Aumento no Valor de Atributo', description: ASI },
    { level: 14, name: 'Característica de Subclasse', description: SUB },
    { level: 16, name: 'Aumento no Valor de Atributo', description: ASI },
    {
      level: 18,
      name: 'Domínio de Magia',
      description:
        'Você alcançou tamanho domínio sobre certas magias que pode conjurá-las à vontade. Escolha uma magia de 1º círculo e uma de 2º círculo do seu grimório que tenham tempo de conjuração de uma ação. Você sempre tem essas magias preparadas e pode conjurá-las no seu círculo mais baixo sem gastar um espaço de magia. Para conjurá-las em um círculo superior, você deve gastar um espaço de magia. Sempre que terminar um Descanso Longo, você pode estudar o grimório e trocar uma dessas magias por outra elegível do mesmo círculo.',
    },
    {
      level: 19,
      name: 'Dádiva Épica',
      description:
        'Você ganha um talento de Dádiva Épica ou outro talento de sua escolha para o qual se qualifique.',
    },
    {
      level: 20,
      name: 'Magias Assinatura',
      description:
        'Escolha duas magias de 3º círculo do seu grimório como suas magias assinatura. Você sempre tem essas magias preparadas e pode conjurar cada uma delas uma vez no 3º círculo sem gastar um espaço de magia, recuperando esses usos ao terminar um Descanso Curto ou Longo. Para conjurá-las em um círculo superior, você deve gastar um espaço de magia.',
    },
  ],
  tableColumns: [],
  subclasses: [
    {
      id: 'abjurer',
      name: 'Abjurador',
      nameEn: 'Abjurer',
      summary:
        'Magos especializados em magias de proteção, que bloqueiam, banem e anulam efeitos mágicos e protegem seus aliados.',
      features: [
        {
          level: 3,
          name: 'Sábio da Abjuração',
          description: savant('Abjuração'),
        },
        {
          level: 3,
          name: 'Proteção Arcana',
          description:
            'Você pode tecer magia ao seu redor para se proteger. Quando conjurar uma magia de Abjuração usando um espaço de magia, você pode, simultaneamente, usar parte dessa magia para criar uma proteção mágica em si mesmo, que dura até você terminar um Descanso Longo. A proteção tem um máximo de Pontos de Vida igual ao dobro do seu nível de Mago mais o seu modificador de Inteligência. Sempre que você sofrer dano, a proteção sofre o dano em seu lugar; se o dano reduzir a proteção a 0 Pontos de Vida, você sofre o dano restante. Enquanto tiver 0 Pontos de Vida, a proteção não absorve dano, mas sua magia permanece. Sempre que conjurar uma magia de Abjuração usando um espaço de magia, a proteção recupera Pontos de Vida iguais ao dobro do círculo do espaço. Alternativamente, com uma Ação Bônus, você pode gastar um espaço de magia para que a proteção recupere Pontos de Vida iguais ao dobro do círculo do espaço gasto. Depois de criar a proteção, você não pode criá-la novamente até terminar um Descanso Longo.',
        },
        {
          level: 6,
          name: 'Proteção Projetada',
          description:
            'Quando uma criatura que você possa ver a até 9 metros de você sofrer dano, você pode usar sua Reação para fazer com que a sua Proteção Arcana absorva esse dano. Se esse dano reduzir a proteção a 0 Pontos de Vida, a criatura protegida sofre o dano restante. Se a criatura tiver qualquer Resistência ou Vulnerabilidade, aplique-as ao dano restante.',
        },
        {
          level: 10,
          name: 'Quebra-Feitiços',
          description:
            'Você sempre tem as magias Contramágica e Dissipar Magia preparadas. Além disso, você pode conjurar Dissipar Magia com uma Ação Bônus e somar seu Bônus de Proficiência ao teste de atributo dessa magia. Quando conjurar qualquer uma dessas magias usando um espaço de magia, o espaço não é gasto se a magia não conseguir impedir ou encerrar uma magia.',
        },
        {
          level: 14,
          name: 'Resistência a Magia',
          description:
            'Você tem Vantagem em testes de resistência contra magias e Resistência ao dano de magias.',
        },
      ],
      alwaysPrepared: [{ level: 10, spells: ['counterspell', 'dispel-magic'] }],
    },
    {
      id: 'diviner',
      name: 'Adivinhador',
      nameEn: 'Diviner',
      summary:
        'Magos que estudam a adivinhação para desvendar o passado, o presente e o futuro, alterando o destino com seus presságios.',
      features: [
        {
          level: 3,
          name: 'Sábio da Adivinhação',
          description: savant('Adivinhação'),
        },
        {
          level: 3,
          name: 'Presságio',
          description:
            'Vislumbres do futuro começam a surgir na sua mente. Sempre que terminar um Descanso Longo, role dois d20 e anote os resultados. Você pode substituir qualquer Teste de D20 feito por você ou por uma criatura que possa ver por um desses resultados de presságio. Você deve escolher fazer isso antes da rolagem e só pode substituir uma rolagem dessa forma por turno. Cada resultado de presságio só pode ser usado uma vez. Ao terminar um Descanso Longo, você perde os resultados não usados.',
        },
        {
          level: 6,
          name: 'Adivinhação Especializada',
          description:
            'Conjurar magias de adivinhação é tão fácil para você que gasta apenas uma fração do seu esforço. Quando conjurar uma magia de Adivinhação usando um espaço de magia de 2º círculo ou superior, você recupera um espaço de magia gasto. O espaço recuperado deve ser de um círculo inferior ao do espaço gasto e não pode ser superior ao 5º círculo.',
        },
        {
          level: 10,
          name: 'O Terceiro Olho',
          description:
            'Você pode aumentar seus poderes de percepção. Com uma Ação Bônus, escolha um dos benefícios a seguir, que dura até você começar um Descanso Curto ou Longo. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Curto ou Longo. Visão no Escuro: você ganha Visão no Escuro com alcance de 36 metros. Compreensão Maior: você pode ler qualquer idioma. Ver o Invisível: você pode conjurar Ver o Invisível sem gastar um espaço de magia.',
        },
        {
          level: 14,
          name: 'Presságio Maior',
          description:
            'As visões nos seus sonhos se intensificam e revelam mais do que está por vir. Ao usar a característica Presságio, você rola três d20 em vez de dois.',
        },
      ],
    },
    {
      id: 'evoker',
      name: 'Evocador',
      nameEn: 'Evoker',
      summary:
        'Magos que dominam a criação de efeitos elementais poderosos, como frio intenso, chamas, trovões e relâmpagos, moldando-os para poupar aliados.',
      features: [
        {
          level: 3,
          name: 'Sábio da Evocação',
          description: savant('Evocação'),
        },
        {
          level: 3,
          name: 'Truque Potente',
          description:
            'Seus truques que causam dano afetam até as criaturas que evitam o pior do efeito. Quando você conjurar um truque contra uma criatura e errar a jogada de ataque, ou o alvo passar no teste de resistência contra o truque, o alvo sofre metade do dano do truque (se houver), mas não sofre nenhum efeito adicional dele.',
        },
        {
          level: 6,
          name: 'Esculpir Magias',
          description:
            'Você pode criar bolsões de relativa segurança dentro dos efeitos das suas magias de evocação. Quando conjurar uma magia de Evocação que afete outras criaturas que você possa ver, escolha uma quantidade delas igual a 1 + o círculo da magia. As criaturas escolhidas passam automaticamente nos testes de resistência contra a magia e não sofrem dano se normalmente sofreriam metade do dano com um sucesso.',
        },
        {
          level: 10,
          name: 'Evocação Potencializada',
          description:
            'Sempre que conjurar uma magia de Mago da escola de Evocação, você pode somar seu modificador de Inteligência a uma jogada de dano dessa magia.',
        },
        {
          level: 14,
          name: 'Sobrecarga',
          description:
            'Você pode aumentar o poder das suas magias. Quando conjurar uma magia de Mago usando um espaço de magia de 1º a 5º círculo que cause dano, você pode causar o dano máximo com essa magia no turno em que a conjurar. Na primeira vez que fizer isso, não sofre efeitos adversos. Se usar esta característica novamente antes de terminar um Descanso Longo, você sofre 2d12 de dano Necrótico por círculo do espaço de magia imediatamente após conjurá-la. Esse dano aumenta em 1d12 por círculo a cada uso adicional antes de terminar um Descanso Longo, e ignora Resistência e Imunidade.',
        },
      ],
    },
    {
      id: 'illusionist',
      name: 'Ilusionista',
      nameEn: 'Illusionist',
      summary:
        'Magos especializados em magias que enganam os sentidos e a mente, capazes de dar substância às próprias ilusões.',
      features: [
        {
          level: 3,
          name: 'Sábio da Ilusão',
          description: savant('Ilusão'),
        },
        {
          level: 3,
          name: 'Ilusões Aprimoradas',
          description:
            'Você pode conjurar magias de Ilusão sem fornecer componentes Verbais, e se uma magia de Ilusão que conjurar tiver alcance de 3 metros ou mais, esse alcance aumenta em 18 metros. Você também conhece o truque Ilusão Menor; se já o conhecer, aprende outro truque de Mago à sua escolha. O truque não conta no seu número de truques conhecidos. Você pode criar tanto um som quanto uma imagem com uma única conjuração de Ilusão Menor, e pode conjurá-lo com uma Ação Bônus.',
        },
        {
          level: 6,
          name: 'Criaturas Fantasmagóricas',
          description:
            'Você sempre tem as magias Invocar Fera e Invocar Feérico preparadas. Sempre que conjurar qualquer uma delas, você pode mudar a escola da magia para Ilusão, o que faz a criatura invocada parecer espectral. Você pode conjurar a versão de Ilusão de cada uma dessas magias uma vez sem gastar um espaço de magia, mas conjurá-las dessa forma reduz à metade os Pontos de Vida da criatura invocada. Você recupera a capacidade de conjurar cada uma dessa forma ao terminar um Descanso Longo.',
        },
        {
          level: 10,
          name: 'Eu Ilusório',
          description:
            'Quando uma criatura atingir você com uma jogada de ataque, você pode usar sua Reação para interpor uma duplicata ilusória entre você e o atacante; o ataque erra automaticamente e a ilusão se dissipa. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Curto ou Longo, a menos que gaste um espaço de magia de 2º círculo ou superior para restaurar o uso.',
        },
        {
          level: 14,
          name: 'Realidade Ilusória',
          description:
            'Você aprendeu a tecer magia de sombras nas suas ilusões para dar a elas uma semirrealidade. Quando conjurar uma magia de Ilusão usando um espaço de magia, você pode escolher um objeto inanimado e não mágico que faça parte da ilusão e torná-lo real. Você pode fazer isso no turno em que conjura a magia ou em um turno posterior, enquanto a magia durar, usando uma Ação Bônus. O objeto permanece real por 1 minuto, durante o qual não pode causar dano nem conceder condições a ninguém. Por exemplo, você pode criar uma ponte ilusória sobre um abismo e torná-la real para que seus aliados possam atravessá-la.',
        },
      ],
      alwaysPrepared: [{ level: 6, spells: ['summon-beast', 'summon-fey'] }],
    },
  ],
};
