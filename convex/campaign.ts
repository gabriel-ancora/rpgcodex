import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  matchesCampaign,
  normalizeCampaignId,
  getSessionUser,
  assertDmPermission,
} from "./lib/tenancy";

/**
 * Campanhas, Multi-Tenancy, Códigos de Convite & Gestão de Estúdio (Produção)
 */
export const getStatus = query({
  args: { campaignId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    if (!normId) {
      return {
        connected: true,
        entityCount: 0,
        mapCount: 0,
        frontCount: 0,
        questCount: 0,
        combatantCount: 0,
        sheetCount: 0,
      };
    }

    const entities = (await ctx.db.query("entities").collect()).filter((e) =>
      matchesCampaign(e.campaignId, normId)
    );
    const maps = (await ctx.db.query("campaignMaps").collect()).filter((m) =>
      matchesCampaign(m.campaignId, normId)
    );
    const fronts = (await ctx.db.query("threatFronts").collect()).filter((f) =>
      matchesCampaign(f.campaignId, normId)
    );
    const quests = (await ctx.db.query("quests").collect()).filter((q) =>
      matchesCampaign(q.campaignId, normId)
    );
    const combatants = (await ctx.db.query("combatants").collect()).filter(
      (c) => matchesCampaign(c.campaignId, normId)
    );
    const sheets = (await ctx.db.query("characterSheets").collect()).filter(
      (s) => matchesCampaign(s.campaignId, normId)
    );

    return {
      connected: true,
      entityCount: entities.length,
      mapCount: maps.length,
      frontCount: fronts.length,
      questCount: quests.length,
      combatantCount: combatants.length,
      sheetCount: sheets.length,
    };
  },
});

export const list = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.sessionToken);
    if (!user) return [];

    const all = await ctx.db.query("campaigns").collect();

    const visible = all.filter((c) => {
      if (c.dmUserId === user.id) return true;
      if (c.memberUserIds?.includes(user.id)) return true;
      return false;
    });

    return await Promise.all(
      visible.map(async (c) => {
        const playersOnly = (c.memberUserIds || []).filter(
          (uid) => uid !== c.dmUserId
        );
        const resolvedCover = c.coverStorageId
          ? (await ctx.storage.getUrl(c.coverStorageId)) || c.coverUrl || ""
          : c.coverUrl || "";
        return {
          id: c.slugId || c._id,
          title: c.name,
          synopsis: c.synopsis || c.description || "",
          worldContext: c.worldContext || "",
          system: c.system || "D&D 5.5e (2024)",
          tone: c.tone || "Fantasia",
          coverUrl: resolvedCover,
          coverStorageId: c.coverStorageId,
          inviteCode: c.inviteCode || "",
          dmName: c.dmName || "Mestre",
          dmUserId: c.dmUserId || "",
          isDm: c.dmUserId ? c.dmUserId === user.id : user.role === "dm",
          activePlayersCount: playersOnly.length,
          sessionsPlayed: c.sessionsPlayed ?? 0,
          updatedAt: c.updatedAt,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    slugId: v.optional(v.string()),
    title: v.string(),
    synopsis: v.string(),
    worldContext: v.optional(v.string()),
    system: v.string(),
    tone: v.string(),
    coverUrl: v.string(),
    coverStorageId: v.optional(v.id("_storage")),
    inviteCode: v.string(),
    dmName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.sessionToken);
    if (!user) {
      throw new Error("Faça login para criar uma campanha.");
    }

    const now = new Date().toISOString();
    const cleanCode = args.inviteCode.trim().toUpperCase();

    const insertedId = await ctx.db.insert("campaigns", {
      slugId: args.slugId,
      name: args.title.trim(),
      description: args.synopsis,
      synopsis: args.synopsis,
      worldContext: args.worldContext || "",
      system: args.system,
      tone: args.tone,
      coverUrl: args.coverUrl,
      coverStorageId: args.coverStorageId,
      inviteCode: cleanCode,
      dmUserId: user.id,
      dmName: user.name || args.dmName,
      memberUserIds: [user.id],
      sessionsPlayed: 0,
      createdAt: now,
      updatedAt: new Date().toLocaleDateString("pt-BR"),
    });

    const effectiveCampaignId = args.slugId || insertedId;
    if (!args.slugId) {
      await ctx.db.patch(insertedId, { slugId: insertedId });
    }

    // Inicializa Calendário e Recursos zerados isolados para esta nova campanha
    await ctx.db.insert("calendars", {
      campaignId: effectiveCampaignId,
      calendarName: `Calendário — ${args.title.trim()}`,
      epochName: "Era Atual",
      currentYear: 1,
      currentMonthIndex: 0,
      currentDay: 1,
      weekdays: [
        "Solis",
        "Lunaris",
        "Ferrum",
        "Cineris",
        "Vespera",
        "Umbra",
        "Sacrum",
      ],
      months: [
        { id: "m1", name: "Alvorada", days: 30, season: "Primavera" },
        { id: "m2", name: "Solstício", days: 30, season: "Verão" },
        { id: "m3", name: "Colheita", days: 30, season: "Outono" },
        { id: "m4", name: "Inverno", days: 30, season: "Inverno" },
      ],
      moons: [
        {
          id: "moon-1",
          name: "Lua Principal",
          cycleDays: 28,
          offset: 0,
          color: "#e4e4e7",
          lore: "Ciclo lunar padrão do cenário.",
        },
      ],
      availableEras: ["Era Antiga", "Era Atual"],
    });

    await ctx.db.insert("partyResources", {
      campaignId: effectiveCampaignId,
      gold: 0,
      silver: 0,
      copper: 0,
      rations: 0,
      torches: 0,
      healerKits: 0,
      items: [],
      stronghold: {
        name: "Base da Companhia",
        type: "Refúgio",
        locationHandle: "",
        integrity: 100,
        maxIntegrity: 100,
        upkeepPerMonth: "0 PO",
        description: "Configure o nome, descrição e melhorias da base de operações do grupo.",
        upgrades: [],
      },
    });

    return {
      id: effectiveCampaignId,
      inviteCode: cleanCode,
      title: args.title.trim(),
    };
  },
});

export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    campaignId: v.string(),
    title: v.optional(v.string()),
    synopsis: v.optional(v.string()),
    worldContext: v.optional(v.string()),
    system: v.optional(v.string()),
    tone: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    clearCoverImage: v.optional(v.boolean()),
    sessionsPlayed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);

    const bySlug = await ctx.db
      .query("campaigns")
      .withIndex("by_slug", (q) => q.eq("slugId", args.campaignId))
      .first();
    const docId =
      bySlug?._id || ctx.db.normalizeId("campaigns", args.campaignId);
    if (!docId) return;
    const existingCamp = await ctx.db.get(docId);

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toLocaleDateString("pt-BR"),
    };
    if (args.title !== undefined) patch.name = args.title.trim();
    if (args.synopsis !== undefined) {
      patch.synopsis = args.synopsis;
      patch.description = args.synopsis;
    }
    if (args.worldContext !== undefined) patch.worldContext = args.worldContext;
    if (args.system !== undefined) patch.system = args.system;
    if (args.tone !== undefined) patch.tone = args.tone;
    if (args.clearCoverImage) {
      if (existingCamp?.coverStorageId) {
        await ctx.storage.delete(existingCamp.coverStorageId).catch(() => {});
      }
      patch.coverUrl = "";
      patch.coverStorageId = undefined;
    } else {
      if (args.coverStorageId !== undefined) {
        if (
          existingCamp?.coverStorageId &&
          existingCamp.coverStorageId !== args.coverStorageId
        ) {
          await ctx.storage.delete(existingCamp.coverStorageId).catch(() => {});
        }
        patch.coverStorageId = args.coverStorageId;
      }
      if (args.coverUrl !== undefined) patch.coverUrl = args.coverUrl;
    }
    if (args.sessionsPlayed !== undefined)
      patch.sessionsPlayed = Math.max(0, args.sessionsPlayed);

    await ctx.db.patch(docId, patch);
  },
});

export const joinByInviteCode = mutation({
  args: {
    inviteCode: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clean = args.inviteCode.trim().toUpperCase();
    const user = await getSessionUser(ctx, args.sessionToken);
    if (!user) {
      throw new Error("Faça login para ingressar em uma campanha.");
    }

    const found = await ctx.db
      .query("campaigns")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", clean))
      .first();

    if (!found) {
      return { found: false, campaign: null };
    }

    const existingMembers = found.memberUserIds || [];
    const nextMembers = existingMembers.includes(user.id)
      ? existingMembers
      : [...existingMembers, user.id];

    if (!existingMembers.includes(user.id)) {
      await ctx.db.patch(found._id, {
        memberUserIds: nextMembers,
      });
    }

    const playersOnly = nextMembers.filter((uid) => uid !== found.dmUserId);
    const resolvedCover = found.coverStorageId
      ? (await ctx.storage.getUrl(found.coverStorageId)) || found.coverUrl || ""
      : found.coverUrl || "";

    return {
      found: true,
      campaign: {
        id: found.slugId || found._id,
        title: found.name,
        synopsis: found.synopsis || found.description || "",
        worldContext: found.worldContext || "",
        system: found.system || "D&D 5.5e (2024)",
        tone: found.tone || "Fantasia",
        coverUrl: resolvedCover,
        coverStorageId: found.coverStorageId,
        inviteCode: found.inviteCode || clean,
        dmName: found.dmName || "Mestre",
        dmUserId: found.dmUserId || "",
        isDm: found.dmUserId === user.id,
        activePlayersCount: playersOnly.length,
        sessionsPlayed: found.sessionsPlayed ?? 0,
        updatedAt: found.updatedAt,
      },
    };
  },
});

async function clearCampaignDataInternal(
  ctx: MutationCtx,
  targetCampId: string
) {
  const normId = normalizeCampaignId(targetCampId);
  if (!normId) return;

  const entities = (await ctx.db.query("entities").collect()).filter((e) =>
    matchesCampaign(e.campaignId, normId)
  );
  for (const ent of entities) {
    const secrets = await ctx.db
      .query("entitySecrets")
      .withIndex("by_entity", (q) => q.eq("entityId", ent._id))
      .collect();
    for (const s of secrets) await ctx.db.delete(s._id);

    const attrs = await ctx.db
      .query("entityAttributes")
      .withIndex("by_entity", (q) => q.eq("entityId", ent._id))
      .collect();
    for (const a of attrs) await ctx.db.delete(a._id);

    await ctx.db.delete(ent._id);
  }

  const maps = (await ctx.db.query("campaignMaps").collect()).filter((m) =>
    matchesCampaign(m.campaignId, normId)
  );
  for (const m of maps) {
    if (m.storageId) {
      await ctx.storage.delete(m.storageId);
    }
    const pins = await ctx.db
      .query("mapPins")
      .withIndex("by_map", (q) => q.eq("mapId", m._id))
      .collect();
    for (const p of pins) await ctx.db.delete(p._id);
    await ctx.db.delete(m._id);
  }

  const scopedTables = [
    "relationships",
    "graphPositions",
    "manualGraphNodes",
    "calendars",
    "timelineEvents",
    "threatFronts",
    "mysteryScenes",
    "combatants",
    "combatState",
    "diceRolls",
    "scratchpadNotes",
    "quests",
    "journalEntries",
    "personalJournalNotes",
    "partyResources",
    "characterSheets",
  ] as const;

  for (const table of scopedTables) {
    const records = await ctx.db.query(table).collect();
    for (const rec of records) {
      if (
        matchesCampaign((rec as { campaignId?: string }).campaignId, normId)
      ) {
        await ctx.db.delete(rec._id);
      }
    }
  }
}

export const remove = mutation({
  args: {
    campaignId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    await clearCampaignDataInternal(ctx, args.campaignId);

    const bySlug = await ctx.db
      .query("campaigns")
      .withIndex("by_slug", (q) => q.eq("slugId", args.campaignId))
      .first();
    if (bySlug) {
      if (bySlug.coverStorageId) {
        await ctx.storage.delete(bySlug.coverStorageId).catch(() => {});
      }
      await ctx.db.delete(bySlug._id);
      return;
    }

    const docId = ctx.db.normalizeId("campaigns", args.campaignId);
    if (docId) {
      const campDoc = await ctx.db.get(docId);
      if (campDoc?.coverStorageId) {
        await ctx.storage.delete(campDoc.coverStorageId).catch(() => {});
      }
      await ctx.db.delete(docId);
    }
  },
});

export const clearAll = mutation({
  args: {
    campaignId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    await clearCampaignDataInternal(ctx, args.campaignId);
  },
});
