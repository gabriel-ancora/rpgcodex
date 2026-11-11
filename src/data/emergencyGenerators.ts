import { Entity, GeneratedEmergencyItem, ThreatFront } from '../types/campaign';

export interface ProceduralContext {
  entities?: Entity[];
  fronts?: ThreatFront[];
  locationHandle?: string;
  customHint?: string;
  worldContext?: string;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const PT_STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob', 'sobre', 'entre',
  'que', 'se', 'e', 'ou', 'mas', 'como', 'quando', 'onde', 'quem', 'qual', 'foi', 'era',
  'ha', 'muito', 'tempo', 'atras', 'hoje', 'apos', 'ali', 'aqui', 'mais', 'menos',
  'grande', 'pequeno', 'fizeram', 'reuniram', 'proteger', 'centro', 'este', 'esta', 'isso',
]);

/**
 * Gera sempre um @handle / #handle enxuto em PascalCase (máximo 20 caracteres),
 * ignorando preposições e nunca despejando frases inteiras.
 */
export function makeCompactHandle(rawText: string, fallbackPrefix = 'Registro'): string {
  const words = (rawText || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !PT_STOPWORDS.has(w.toLowerCase()));

  if (words.length === 0) {
    return `${fallbackPrefix}${Date.now().toString().slice(-4)}`;
  }

  let built = '';
  for (const w of words.slice(0, 3)) {
    const pascal = w.charAt(0).toUpperCase() + w.slice(1, 10).toLowerCase();
    if ((built + pascal).length > 20 && built.length >= 4) break;
    built += pascal;
  }

  return built.slice(0, 20) || `${fallbackPrefix}${Date.now().toString().slice(-4)}`;
}

/**
 * Verifica se o direcionamento do usuário é apenas um nome curto explícito
 * (ex: "Capitão Vane") ou uma frase/instrução (ex: "veterano da Batalha do Vau").
 */
function isShortExplicitName(hint?: string): boolean {
  if (!hint) return false;
  const trimmed = hint.trim();
  if (trimmed.length < 3 || trimmed.length > 28) return false;
  if (/[,:;!?.“”"'\n]/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length > 3) return false;
  // Se começar com artigo indefinido ou verbo/diretriz comum, é instrução e não nome próprio
  const lowerFirst = words[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (['um', 'uma', 'quero', 'gere', 'crie', 'faca', 'sobre', 'ligado', 'antigo', 'velho', 'ha'].includes(lowerFirst)) {
    return false;
  }
  return true;
}

/**
 * Extrai âncoras narrativas reais (nomes próprios, eventos entre aspas, reinos, vilas)
 * da Janela de Contexto da Wiki e do direcionamento opcional.
 */
function extractLoreAnchors(worldContext?: string, customHint?: string): {
  quotedEvents: string[];
  properPlaces: string[];
  themeSnippet: string;
} {
  const combined = `${customHint || ''}\n${worldContext || ''}`.trim();
  if (!combined) {
    return { quotedEvents: [], properPlaces: [], themeSnippet: '' };
  }

  const quotedEvents: string[] = [];
  const quoteRegex = /[“"«]([^”"»]{3,42})[”"»]/g;
  let qMatch: RegExpExecArray | null;
  while ((qMatch = quoteRegex.exec(combined)) !== null) {
    const clean = qMatch[1].trim();
    if (clean && !quotedEvents.includes(clean)) quotedEvents.push(clean);
  }

  const properPlaces: string[] = [];
  const placeRegex =
    /\b(?:reino|vila|cidade|império|imperio|vale|forte|cidadela|ordem|batalha|ponte|torre|monte)\s+(?:de|do|da|dos|das)\s+([A-ZÀ-Ý][\wÀ-ÿ]+(?:\s+(?:de|do|da|[A-ZÀ-Ý][\wÀ-ÿ]+)){0,2})/gi;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = placeRegex.exec(combined)) !== null) {
    const clean = pMatch[1].trim();
    if (clean && !properPlaces.includes(clean)) properPlaces.push(clean);
  }

  // Primeira sentença curta como referência temática (limitada a 140 caracteres)
  const firstSentence = combined
    .replace(/^#+\s.*$/gm, '')
    .split(/[\n.!?]+/)
    .map((s) => s.trim())
    .find((s) => s.length > 15);

  const themeSnippet = firstSentence
    ? firstSentence.length > 140
      ? `${firstSentence.slice(0, 137)}...`
      : firstSentence
    : '';

  return { quotedEvents, properPlaces, themeSnippet };
}

const NPC_FIRST_NAMES = [
  'Aldric', 'Berenice', 'Caelum', 'Drusilla', 'Eamon', 'Faustus', 'Gideon', 'Helena',
  'Ignis', 'Jorah', 'Katarina', 'Lucian', 'Morwen', 'Nero', 'Orlov', 'Rowena',
  'Severin', 'Thalia', 'Ulric', 'Valeria', 'Wulfric', 'Ysolde', 'Zarek',
];

const NPC_SURNAMES = [
  'Cinza-Negra', 'Valenwood', 'Vesper', 'Sanguefrio', 'Coveiro',
  'Korr', 'Dusk', 'Lágrima-de-Ferro', 'Montclair', 'Ravencrest', 'Thorne',
];

const NPC_ROLES = [
  'Guardião Juramentado', 'Cronista Militar', 'Boticário Ambulante', 'Ex-Inquisidor Deserdado',
  'Mercador de Relíquias', 'Caçador de Recompensas', 'Escriba da Corte',
  'Veterano de Fronteira', 'Cartógrafo de Ruínas', 'Oráculo Errante',
];

const NPC_APPEARANCES = [
  'Usa óculos de lentes âmbar rachadas e um sobretudo manchado de cera escura.',
  'Cicatriz antiga no pescoço; dedos longos marcados por fuligem e tinta ferruginosa.',
  'Voz rouca e pausada; carrega um medalhão de bronze gasto preso ao cinto.',
  'Manto pesado de lã cinzenta com antigas insígnias de campanha costuradas no forro.',
  'Postura impecável, anéis de prata nos polegares e olhar atento a cada entrada do salão.',
  'Olheiras profundas, mãos enfaixadas em linho e uma lâmina curta presa à bota.',
];

const NPC_TICS = [
  'Gira compulsivamente uma moeda antiga entre os nós dos dedos.',
  'Olha por cima do ombro esquerdo antes de responder perguntas diretas.',
  'Tamborila os dedos no balcão em ritmo de antiga marcha militar.',
  'Abaixa o tom de voz sempre que menciona juramentos antigos ou autoridades locais.',
  'Anota fragmentos da conversa em um pequeno caderno de couro gasto.',
];

const TAVERN_PREFIXES = [
  'O Cálice', 'A Lanterna', 'O Javali', 'O Marco', 'O Sino', 'A Âncora', 'A Forja', 'O Escudo',
];

const TAVERN_SUFFIXES = [
  'de Obsidiana', 'Enferrujado', 'das Cinzas', 'da Vigília', 'Dourado', 'da Encruzilhada', 'dos Sete', 'Silencioso',
];

const TAVERN_ATMOSPHERES = [
  'Vigas antigas escurecidas pela lareira, escudos amassados pendurados nas paredes de pedra e murmúrio constante de viajantes.',
  'Silêncio atento quebrado apenas pelo estalar da lenha e pela chuva batendo nos vitrais estreitos.',
  'Salão movimentado no coração do assentamento, reunindo escoltas de caravana, veteranos e cronistas.',
  'Iluminado por arandelas de cobre; mapas da região e estandartes desbotados cobrem o balcão principal.',
];

const TAVERN_SPECIALTIES = [
  'Vinho quente especiado com canela e pimenta-do-reino — 4 PC.',
  'Assado lento de caça com pão de centeio escuro — 6 PC.',
  'Hidromel envelhecido em barril de carvalho tostado — 1 PP.',
  'Caldo forte de raízes e tutano servido em tigela de barro — 5 PC.',
];

function resolveRefs(ctx?: ProceduralContext) {
  const entities = ctx?.entities || [];
  const fronts = ctx?.fronts || [];
  const anchors = extractLoreAnchors(ctx?.worldContext, ctx?.customHint);

  const factions = entities.filter((e) => e.category === 'faction');
  const npcs = entities.filter((e) => e.category === 'npc');
  const locations = entities.filter((e) => e.category === 'location');

  const placeAnchor = anchors.properPlaces[0];
  const eventAnchor = anchors.quotedEvents[0];

  const factionRef =
    factions.length > 0
      ? `${pick(factions).mentionPrefix}${pick(factions).handle}`
      : eventAnchor
      ? `os herdeiros do pacto da "${eventAnchor}"`
      : 'uma irmandade antiga local';

  const npcRef =
    npcs.length > 0
      ? `${pick(npcs).mentionPrefix}${pick(npcs).handle}`
      : 'um ancião respeitado da região';

  const locRef =
    ctx?.locationHandle?.trim() ||
    (locations.length > 0
      ? `${pick(locations).mentionPrefix}${pick(locations).handle}`
      : placeAnchor
      ? `as terras de ${placeAnchor}`
      : 'o centro do assentamento');

  const activeFronts = fronts.filter((f) => f.status === 'active');
  const frontObj = activeFronts.length > 0 ? pick(activeFronts) : fronts[0];
  const frontRef = frontObj
    ? `"${frontObj.name}"`
    : eventAnchor
    ? `os ecos da "${eventAnchor}"`
    : 'uma ameaça crescente nas fronteiras';

  return { factionRef, npcRef, locRef, frontRef, anchors };
}

export function generateEmergencyNPC(ctx?: ProceduralContext): GeneratedEmergencyItem {
  const { factionRef, npcRef, locRef, frontRef, anchors } = resolveRefs(ctx);
  const firstName = pick(NPC_FIRST_NAMES);
  const surname = anchors.properPlaces[0]
    ? `de ${anchors.properPlaces[0].split(/\s+/)[0]}`
    : pick(NPC_SURNAMES);

  const title = isShortExplicitName(ctx?.customHint)
    ? ctx!.customHint!.trim()
    : `${firstName} ${surname}`;

  const role =
    ctx?.customHint && !isShortExplicitName(ctx.customHint) && ctx.customHint.trim().length <= 55
      ? ctx.customHint.trim()
      : pick(NPC_ROLES);

  const cleanHandle = makeCompactHandle(title, 'Npc');

  const loreConnection = anchors.quotedEvents[0]
    ? `Afirma descender de testemunhas da "${anchors.quotedEvents[0]}" e preserva registros sobre o juramento firmado em ${locRef}.`
    : anchors.themeSnippet
    ? `Conhece detalhes orais sobre a história local (${anchors.themeSnippet}) e observa quem investiga o passado de ${locRef}.`
    : `${pick(NPC_TICS)} Costuma negociar informações discretas nas proximidades de ${locRef}.`;

  const secrets = [
    `Guarda uma prova material ligada a ${factionRef} e teme que agentes de ${npcRef} descubram sua localização em ${locRef}.`,
    `Sabe onde foi ocultada uma relíquia juramentada relacionada a ${frontRef}, mas exige proteção antes de revelar o caminho.`,
    `Atua secretamente em nome de ${factionRef} para testar a lealdade de aventureiros recém-chegados a ${locRef}.`,
  ];

  return {
    id: `gen-npc-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    type: 'npc',
    title,
    subtitle: role,
    rawHandle: cleanHandle,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    aiGenerated: false,
    details: [
      { label: 'Aparência & Presença', value: `${pick(NPC_APPEARANCES)} ${pick(NPC_TICS)}` },
      { label: 'Vínculo com o Cenário', value: loreConnection },
      {
        label: 'Referência D&D 5.5e',
        value: `PV ${24 + Math.floor(Math.random() * 34)} | CA ${12 + Math.floor(Math.random() * 5)} | Percepção Passiva ${12 + Math.floor(Math.random() * 5)}`,
      },
      { label: 'Segredo do Mestre', value: pick(secrets), isSecret: true },
    ],
  };
}

export function generateEmergencyTavern(ctx?: ProceduralContext): GeneratedEmergencyItem {
  const { factionRef, npcRef, locRef, anchors } = resolveRefs(ctx);

  const contextualSuffix = anchors.quotedEvents[0]
    ? `do ${anchors.quotedEvents[0].split(/\s+/).slice(-1)[0]}`
    : anchors.properPlaces[0]
    ? `de ${anchors.properPlaces[0]}`
    : pick(TAVERN_SUFFIXES);

  const name = isShortExplicitName(ctx?.customHint)
    ? ctx!.customHint!.trim()
    : `${pick(TAVERN_PREFIXES)} ${contextualSuffix}`;

  const cleanHandle = makeCompactHandle(name, 'Local');
  const keeper = `${pick(NPC_FIRST_NAMES)} ${pick(NPC_SURNAMES)}`;

  const historicalDetail = anchors.quotedEvents[0]
    ? `Ergue-se próximo ao marco histórico lembrado desde a "${anchors.quotedEvents[0]}", atraindo peregrinos e veteranos.`
    : anchors.properPlaces[0]
    ? `Ponto tradicional de parada para viajantes que cruzam as estradas de ${anchors.properPlaces[0]}.`
    : pick(TAVERN_SPECIALTIES);

  const secrets = [
    `Sob o alçapão da adega há inscrições antigas vigiadas por ${factionRef}, conectadas à fundação de ${locRef}.`,
    `O anfitrião oculta no sótão um emissário ferido que escapou de homens ligados a ${npcRef}.`,
    `Uma câmara selada nos fundos guarda armas e documentos deixados por antigos protetores de ${locRef}.`,
  ];

  return {
    id: `gen-tav-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    type: 'tavern',
    title: name,
    subtitle: ' Marco Local & Ponto de Encontro'.trim(),
    rawHandle: cleanHandle,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    aiGenerated: false,
    details: [
      { label: 'Atmosfera', value: pick(TAVERN_ATMOSPHERES) },
      { label: 'Tradição & Destaque', value: historicalDetail },
      { label: 'Responsável no Local', value: `${keeper} — ${pick(NPC_TICS)}` },
      { label: 'Segredo nos Fundos', value: pick(secrets), isSecret: true },
    ],
  };
}

export function generateEmergencyRumor(ctx?: ProceduralContext): GeneratedEmergencyItem {
  const { factionRef, npcRef, locRef, frontRef, anchors } = resolveRefs(ctx);
  const eventNote = anchors.quotedEvents[0]
    ? `desde os tempos da "${anchors.quotedEvents[0]}"`
    : 'há várias gerações';

  const templates = [
    {
      title: 'Selo Antigo Violado na Madrugada',
      rumor: `Moradores próximos a ${locRef} juram ter visto luzes de tochas junto ao marco selado ${eventNote}, pouco antes da chegada de enviados de ${npcRef}.`,
      veracity: 'Verdadeiro (Parcial)',
      secret: `A abertura foi conduzida por ${factionRef}, o que pode acelerar diretamente ${frontRef}.`,
    },
    {
      title: 'Recompensa por Insígnias Juramentadas',
      rumor: `Colecionadores ligados a ${factionRef} pagam ouro dobrado por qualquer relíquia militar encontrada nos arredores de ${locRef}.`,
      veracity: 'Verdadeiro',
      secret: `As insígnias funcionam como chaves para um depósito ancestral oculto ${eventNote}.`,
    },
    {
      title: 'Desaparecimento na Estrada Velha',
      rumor: `Uma patrulha que investigava ruínas ligadas a ${locRef} não retornou no prazo, e ${npcRef} proibiu comentários públicos.`,
      veracity: 'Verdadeiro (Urgente)',
      secret: `Os batedores descobriram sinais avançados de ${frontRef} e estão sitiados aguardando resgate.`,
    },
  ];

  const item = pick(templates);
  const finalTitle = isShortExplicitName(ctx?.customHint)
    ? `Rumor: ${ctx!.customHint!.trim()}`
    : item.title;

  return {
    id: `gen-rumor-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    type: 'rumor',
    title: finalTitle,
    subtitle: `Veracidade: ${item.veracity}`,
    rawHandle: makeCompactHandle(finalTitle, 'Rumor'),
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    aiGenerated: false,
    details: [
      { label: 'O que se comenta na mesa', value: item.rumor },
      { label: 'Nível de Veracidade', value: item.veracity },
      { label: 'Verdade Oculta (Mestre)', value: item.secret, isSecret: true },
    ],
  };
}

export function generateEmergencyLoot(ctx?: ProceduralContext): GeneratedEmergencyItem {
  const { factionRef, npcRef, locRef, frontRef, anchors } = resolveRefs(ctx);
  const originSuffix = anchors.properPlaces[0]
    ? ` de ${anchors.properPlaces[0]}`
    : anchors.quotedEvents[0]
    ? ` do Vau`
    : '';

  const relics = [
    {
      name: `Sinete Juramentado${originSuffix}`,
      coins: `${25 + Math.floor(Math.random() * 45)} PO, ${30 + Math.floor(Math.random() * 60)} PP`,
      mundane: 'Estojo de couro gravado e pergaminho lacrado com cera antiga',
      effect: `Concede Vantagem em testes de Persuasão ou História ao tratar com membros de ${factionRef} ou guardiões de ${locRef}.`,
      secret: `O brasão interno destranca uma câmara antiga em ${locRef}, atraindo a atenção imediata de ${frontRef}.`,
    },
    {
      name: `Lanterna de Vigília Prateada${originSuffix}`,
      coins: `${18 + Math.floor(Math.random() * 35)} PO, 2 gemas lapidadas (25 PO cada)`,
      mundane: 'Chave de ferro numerada e bússola de latão funcional',
      effect: 'Sua chama fria não se apaga sob vento ou água e revela runas ou marcas secretas a até 9 metros.',
      secret: `Pertencia originalmente ao acervo vigiado por ${npcRef}; portá-la abertamente desperta perguntas difíceis.`,
    },
    {
      name: `Lâmina Curta dos Sete Juramentos (+1)`,
      coins: `${35 + Math.floor(Math.random() * 50)} PO, ${50 + Math.floor(Math.random() * 70)} PC`,
      mundane: 'Pedra de amolar cerimonial e fita de linho bordada',
      effect: 'Arma mágica +1 (Maestria: Ágil/Vexar em D&D 5.5e); 1x por Descanso Curto concede +1d6 de dano radiante ou energético.',
      secret: `O pomo oco guarda um mapa parcial cobiçado por agentes de ${factionRef}.`,
    },
  ];

  const relic = pick(relics);
  const title = isShortExplicitName(ctx?.customHint)
    ? ctx!.customHint!.trim()
    : relic.name;

  return {
    id: `gen-loot-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    type: 'loot',
    title,
    subtitle: 'Espólio & Relíquia Contextual',
    rawHandle: makeCompactHandle(title, 'Reliquia'),
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    aiGenerated: false,
    details: [
      { label: 'Moedas & Valores', value: relic.coins },
      { label: 'Objetos Encontrados', value: relic.mundane },
      { label: 'Propriedade Mecânica (5.5e)', value: relic.effect },
      { label: 'Complicação / Segredo', value: relic.secret, isSecret: true },
    ],
  };
}
