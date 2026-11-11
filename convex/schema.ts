import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * OBSIDIAN CODEX — CONVEX PRODUCTION DATABASE SCHEMA
 * Multi-tenancy por campaignId, Autenticação Nativa, File Storage,
 * Fichas D&D 5e Sincronizadas, Combate/Dados em Tempo Real e Névoa de Guerra.
 */
export default defineSchema({
  // 0. Autenticação & Sessões Seguras
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    role: v.union(v.literal("dm"), v.literal("player")),
    avatarUrl: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_email", ["email"]),

  userSessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    createdAt: v.string(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // 1. Campanhas & Multi-Tenancy
  campaigns: defineTable({
    slugId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    synopsis: v.optional(v.string()),
    worldContext: v.optional(v.string()),
    system: v.optional(v.string()),
    tone: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    inviteCode: v.optional(v.string()),
    dmUserId: v.optional(v.string()),
    dmName: v.optional(v.string()),
    memberUserIds: v.optional(v.array(v.string())),
    sessionsPlayed: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_slug", ["slugId"])
    .index("by_invite_code", ["inviteCode"])
    .index("by_dm", ["dmUserId"]),

  // 2. Entidades da Wiki Viva (@ e #)
  entities: defineTable({
    campaignId: v.optional(v.string()),
    handle: v.string(),
    mentionPrefix: v.union(v.literal("@"), v.literal("#")),
    name: v.string(),
    subtitle: v.string(),
    category: v.union(
      v.literal("npc"),
      v.literal("faction"),
      v.literal("location"),
      v.literal("item"),
      v.literal("monster"),
      v.literal("lore")
    ),
    tags: v.array(v.string()),
    summary: v.string(),
    publicContent: v.string(),
    pinnedInSession: v.boolean(),
    isPublicToPlayers: v.boolean(),
    imageUrl: v.optional(v.string()),
    updatedAt: v.string(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_handle", ["handle"])
    .index("by_category", ["category"]),

  // 3. Segredos do Mestre (Névoa de Guerra)
  entitySecrets: defineTable({
    entityId: v.string(),
    title: v.string(),
    content: v.string(),
    isRevealed: v.boolean(),
    revealedAt: v.optional(v.string()),
  }).index("by_entity", ["entityId"]),

  // 4. Atributos Customizáveis
  entityAttributes: defineTable({
    entityId: v.string(),
    label: v.string(),
    value: v.union(v.string(), v.number()),
    max: v.optional(v.number()),
    category: v.optional(
      v.union(v.literal("stat"), v.literal("resource"), v.literal("meta"))
    ),
  }).index("by_entity", ["entityId"]),

  // 5. Arestas do Grafo de Relacionamentos
  relationships: defineTable({
    campaignId: v.optional(v.string()),
    sourceId: v.string(),
    targetId: v.string(),
    label: v.string(),
    type: v.union(
      v.literal("hostile"),
      v.literal("allied"),
      v.literal("secret"),
      v.literal("neutral"),
      v.literal("patron"),
      v.literal("blood")
    ),
    notes: v.optional(v.string()),
    isSecret: v.boolean(),
    isRevealed: v.optional(v.boolean()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_source", ["sourceId"])
    .index("by_target", ["targetId"]),

  // Posições no Canvas do Grafo
  graphPositions: defineTable({
    campaignId: v.optional(v.string()),
    entityId: v.string(),
    x: v.number(),
    y: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_entity", ["entityId"]),

  // Nós Manuais do Grafo de Relacionamentos
  manualGraphNodes: defineTable({
    campaignId: v.string(),
    label: v.string(),
    subtitle: v.optional(v.string()),
    category: v.union(
      v.literal("npc"),
      v.literal("faction"),
      v.literal("location"),
      v.literal("player"),
      v.literal("item"),
      v.literal("monster"),
      v.literal("lore"),
      v.literal("note")
    ),
    entityId: v.optional(v.string()),
    x: v.number(),
    y: v.number(),
  }).index("by_campaign", ["campaignId"]),

  // 6. Mapas Interativos, File Storage & Camadas Vetoriais
  campaignMaps: defineTable({
    campaignId: v.optional(v.string()),
    name: v.string(),
    subtitle: v.string(),
    regionType: v.union(
      v.literal("regional"),
      v.literal("tactical"),
      v.literal("city")
    ),
    presetSvgType: v.optional(v.string()),
    customImageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    shapes: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("road"),
            v.literal("river"),
            v.literal("polygon"),
            v.literal("circle"),
            v.literal("rect"),
            v.literal("text"),
            v.literal("fog")
          ),
          label: v.string(),
          color: v.string(),
          strokeWidth: v.number(),
          dashed: v.optional(v.boolean()),
          opacity: v.optional(v.number()),
          fontSize: v.optional(v.number()),
          entityId: v.optional(v.string()),
          linkedEntityIds: v.optional(v.array(v.string())),
          points: v.array(v.object({ x: v.number(), y: v.number() })),
          radius: v.optional(v.number()),
          width: v.optional(v.number()),
          height: v.optional(v.number()),
          isSecret: v.optional(v.boolean()),
          isRevealed: v.optional(v.boolean()),
        })
      )
    ),
  }).index("by_campaign", ["campaignId"]),

  mapPins: defineTable({
    mapId: v.string(),
    x: v.number(),
    y: v.number(),
    label: v.string(),
    subtitle: v.string(),
    entityId: v.optional(v.string()),
    linkedEntityIds: v.optional(v.array(v.string())),
    linkedMapId: v.optional(v.string()),
    layer: v.union(
      v.literal("locations"),
      v.literal("dangers"),
      v.literal("secrets"),
      v.literal("quests")
    ),
    iconType: v.union(
      v.literal("castle"),
      v.literal("city"),
      v.literal("village"),
      v.literal("tavern"),
      v.literal("dungeon"),
      v.literal("skull"),
      v.literal("ruins"),
      v.literal("camp"),
      v.literal("secret"),
      v.literal("quest"),
      v.literal("shrine"),
      v.literal("port"),
      v.literal("portal"),
      v.literal("shop"),
      v.literal("party")
    ),
    description: v.string(),
    monsters: v.array(v.string()),
    treasures: v.array(v.string()),
    secretNote: v.optional(v.string()),
    isSecret: v.boolean(),
    isRevealed: v.boolean(),
  }).index("by_map", ["mapId"]),

  // 7. Calendário & Linha do Tempo
  calendars: defineTable({
    campaignId: v.optional(v.string()),
    calendarName: v.string(),
    epochName: v.string(),
    currentYear: v.number(),
    currentMonthIndex: v.number(),
    currentDay: v.number(),
    weekdays: v.array(v.string()),
    months: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        days: v.number(),
        season: v.string(),
      })
    ),
    moons: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        cycleDays: v.number(),
        offset: v.number(),
        color: v.string(),
        lore: v.string(),
      })
    ),
    availableEras: v.optional(v.array(v.string())),
  }).index("by_campaign", ["campaignId"]),

  timelineEvents: defineTable({
    campaignId: v.optional(v.string()),
    title: v.string(),
    year: v.number(),
    monthIndex: v.number(),
    day: v.number(),
    epoch: v.string(),
    category: v.union(
      v.literal("historical"),
      v.literal("session"),
      v.literal("cataclysm"),
      v.literal("intrigue")
    ),
    visualTag: v.optional(v.string()),
    linkedWikiHandles: v.optional(v.array(v.string())),
    sortOrder: v.optional(v.number()),
    sessionNumber: v.optional(v.number()),
    description: v.string(),
    isSecret: v.boolean(),
    isRevealed: v.boolean(),
  }).index("by_campaign", ["campaignId"]),

  // 8. Frentes de Ameaça & Relógios de Progresso (Clocks)
  threatFronts: defineTable({
    campaignId: v.optional(v.string()),
    name: v.string(),
    subtitle: v.string(),
    associatedEntityHandle: v.string(),
    description: v.string(),
    clockSegments: v.union(
      v.literal(4),
      v.literal(6),
      v.literal(8),
      v.literal(12)
    ),
    clockFilled: v.number(),
    impendingDoom: v.string(),
    ignoreConsequence: v.string(),
    grimPortents: v.array(
      v.object({
        id: v.string(),
        step: v.number(),
        text: v.string(),
        triggered: v.boolean(),
      })
    ),
    status: v.union(
      v.literal("active"),
      v.literal("triggered"),
      v.literal("resolved")
    ),
    isSecret: v.boolean(),
  }).index("by_campaign", ["campaignId"]),

  // 9. Fluxograma de Cenas Não-Lineares & Pistas
  mysteryScenes: defineTable({
    campaignId: v.optional(v.string()),
    title: v.string(),
    subtitle: v.string(),
    locationHandle: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("visited"),
      v.literal("unlocked"),
      v.literal("locked")
    ),
    x: v.number(),
    y: v.number(),
    description: v.string(),
    clues: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        targetSceneId: v.string(),
        discovered: v.boolean(),
        type: v.union(
          v.literal("social"),
          v.literal("investigation"),
          v.literal("occult"),
          v.literal("physical")
        ),
      })
    ),
  }).index("by_campaign", ["campaignId"]),

  // 10. Modo Sessão: Combate, Estado de Turno, Rolagens de Dados & Scratchpad
  combatants: defineTable({
    campaignId: v.optional(v.string()),
    name: v.string(),
    type: v.union(v.literal("pc"), v.literal("npc"), v.literal("monster")),
    initiative: v.number(),
    hp: v.number(),
    maxHp: v.number(),
    armorClass: v.number(),
    conditions: v.array(v.string()),
    notes: v.string(),
    entityId: v.optional(v.string()),
  }).index("by_campaign", ["campaignId"]),

  combatState: defineTable({
    campaignId: v.string(),
    activeCombatTurnIndex: v.number(),
    combatRound: v.number(),
    updatedAt: v.string(),
  }).index("by_campaign", ["campaignId"]),

  diceRolls: defineTable({
    campaignId: v.string(),
    rollerName: v.optional(v.string()),
    formula: v.string(),
    rolls: v.array(v.number()),
    modifier: v.number(),
    total: v.number(),
    label: v.string(),
    timestamp: v.string(),
    isCrit: v.optional(v.boolean()),
    isFumble: v.optional(v.boolean()),
  }).index("by_campaign", ["campaignId"]),

  scratchpadNotes: defineTable({
    campaignId: v.optional(v.string()),
    text: v.string(),
    timestamp: v.string(),
    convertedEntityHandle: v.optional(v.string()),
  }).index("by_campaign", ["campaignId"]),

  // 11. Mural de Missões (Quest Log)
  quests: defineTable({
    campaignId: v.optional(v.string()),
    title: v.string(),
    subtitle: v.string(),
    giverHandle: v.string(),
    locationHandle: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed")
    ),
    isPublic: v.boolean(),
    description: v.string(),
    gmSecretNote: v.optional(v.string()),
    reward: v.string(),
    objectives: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        completed: v.boolean(),
        isSecret: v.optional(v.boolean()),
      })
    ),
  }).index("by_campaign", ["campaignId"]),

  // 12. Diários Coletivo e Pessoal & Recursos do Grupo
  journalEntries: defineTable({
    campaignId: v.optional(v.string()),
    sessionNumber: v.number(),
    title: v.string(),
    inGameDate: v.string(),
    author: v.string(),
    content: v.string(),
    isPublic: v.boolean(),
  }).index("by_campaign", ["campaignId"]),

  personalJournalNotes: defineTable({
    campaignId: v.string(),
    playerId: v.string(),
    playerName: v.string(),
    characterName: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.union(
      v.literal("theory"),
      v.literal("secret"),
      v.literal("backstory"),
      v.literal("goal")
    ),
    sharedWithDm: v.boolean(),
    updatedAt: v.string(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_player", ["playerId"]),

  partyResources: defineTable({
    campaignId: v.optional(v.string()),
    gold: v.number(),
    silver: v.number(),
    copper: v.number(),
    rations: v.number(),
    torches: v.number(),
    healerKits: v.number(),
    items: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        quantity: v.number(),
        holder: v.string(),
        category: v.union(
          v.literal("weapon"),
          v.literal("relic"),
          v.literal("consumable"),
          v.literal("document"),
          v.literal("treasure")
        ),
        notes: v.string(),
      })
    ),
    stronghold: v.object({
      name: v.string(),
      type: v.string(),
      locationHandle: v.string(),
      integrity: v.number(),
      maxIntegrity: v.number(),
      upkeepPerMonth: v.string(),
      description: v.string(),
      upgrades: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          cost: v.string(),
          benefit: v.string(),
          installed: v.boolean(),
        })
      ),
    }),
  }).index("by_campaign", ["campaignId"]),

  // 13. Fichas de Personagem D&D 5e Sincronizadas em Tempo Real
  characterSheets: defineTable({
    campaignId: v.string(),
    playerId: v.string(),
    playerName: v.string(),
    campaignTitle: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    race: v.string(),
    racialTraits: v.array(v.string()),
    className: v.string(),
    subclass: v.optional(v.string()),
    level: v.number(),
    background: v.string(),
    alignment: v.string(),
    hp: v.number(),
    maxHp: v.number(),
    tempHp: v.number(),
    armorClass: v.number(),
    speed: v.string(),
    hitDice: v.string(),
    hitDiceUsed: v.number(),
    proficiencyBonus: v.number(),
    passivePerception: v.number(),
    statGenerationMethod: v.optional(
      v.union(v.literal("standard"), v.literal("roll4d6"), v.literal("random"))
    ),
    baseStats: v.optional(
      v.object({
        str: v.number(),
        dex: v.number(),
        con: v.number(),
        int: v.number(),
        wis: v.number(),
        cha: v.number(),
      })
    ),
    stats: v.object({
      str: v.number(),
      dex: v.number(),
      con: v.number(),
      int: v.number(),
      wis: v.number(),
      cha: v.number(),
    }),
    proficiencies: v.array(v.string()),
    originFeat: v.optional(v.string()),
    savingThrows: v.optional(v.array(v.string())),
    weaponMasteries: v.optional(v.array(v.string())),
    classFeatures: v.optional(
      v.array(
        v.object({
          level: v.number(),
          name: v.string(),
          source: v.string(),
          description: v.string(),
        })
      )
    ),
    classResources: v.optional(
      v.array(
        v.object({
          label: v.string(),
          value: v.string(),
        })
      )
    ),
    spellSlots: v.object({
      level1: v.object({ used: v.number(), max: v.number() }),
      level2: v.object({ used: v.number(), max: v.number() }),
      level3: v.object({ used: v.number(), max: v.number() }),
      level4: v.optional(v.object({ used: v.number(), max: v.number() })),
      level5: v.optional(v.object({ used: v.number(), max: v.number() })),
      level6: v.optional(v.object({ used: v.number(), max: v.number() })),
      level7: v.optional(v.object({ used: v.number(), max: v.number() })),
      level8: v.optional(v.object({ used: v.number(), max: v.number() })),
      level9: v.optional(v.object({ used: v.number(), max: v.number() })),
      pactSlots: v.optional(
        v.object({ level: v.number(), used: v.number(), max: v.number() })
      ),
    }),
    spells: v.array(
      v.object({
        id: v.string(),
        index: v.string(),
        name: v.string(),
        level: v.number(),
        school: v.string(),
        castingTime: v.string(),
        range: v.string(),
        components: v.string(),
        duration: v.string(),
        description: v.string(),
        prepared: v.optional(v.boolean()),
      })
    ),
    equipment: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        category: v.string(),
        damage: v.optional(v.string()),
        armorClass: v.optional(v.string()),
        mastery: v.optional(v.string()),
        weight: v.optional(v.string()),
        quantity: v.number(),
        equipped: v.boolean(),
        notes: v.optional(v.string()),
      })
    ),
    notes: v.string(),
    updatedAt: v.string(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_player", ["playerId"]),
});
