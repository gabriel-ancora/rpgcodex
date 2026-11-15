import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  findCampaignByAnyId,
  getSessionUser,
  normalizeCampaignId,
  requireSessionUser,
} from "./lib/tenancy";

const spellValidator = v.object({
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
});

const equipmentValidator = v.object({
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
});

const slotValidator = v.object({
  used: v.number(),
  max: v.number(),
});

const spellSlotsValidator = v.object({
  level1: slotValidator,
  level2: slotValidator,
  level3: slotValidator,
  level4: v.optional(slotValidator),
  level5: v.optional(slotValidator),
  level6: v.optional(slotValidator),
  level7: v.optional(slotValidator),
  level8: v.optional(slotValidator),
  level9: v.optional(slotValidator),
  pactSlots: v.optional(
    v.object({
      level: v.number(),
      used: v.number(),
      max: v.number(),
    })
  ),
});

const classFeatureValidator = v.object({
  level: v.number(),
  name: v.string(),
  source: v.string(),
  description: v.string(),
});

const classResourceValidator = v.object({
  label: v.string(),
  value: v.string(),
});

export const list = query({
  args: {
    sessionToken: v.optional(v.string()),
    campaignId: v.optional(v.string()),
    playerId: v.optional(v.string()),
    includeAllPlayerSheets: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = args.sessionToken
      ? await getSessionUser(ctx, args.sessionToken)
      : null;
    if (args.sessionToken && !user) return [];

    const targetPlayerId = user?.id || args.playerId;
    const normCampId = normalizeCampaignId(args.campaignId);
    const byId = new Map<string, any>();

    if (args.includeAllPlayerSheets && targetPlayerId) {
      const ownSheets = await ctx.db
        .query("characterSheets")
        .withIndex("by_player", (q) => q.eq("playerId", targetPlayerId))
        .collect();
      for (const s of ownSheets) {
        byId.set(s._id, s);
      }
    }

    if (normCampId) {
      if (user) {
        const camp = await findCampaignByAnyId(ctx, normCampId);
        const isMember =
          camp &&
          (camp.dmUserId === user.id ||
            Boolean(camp.memberUserIds?.includes(user.id)));
        if (isMember) {
          const campSheets = await ctx.db
            .query("characterSheets")
            .withIndex("by_campaign", (q) => q.eq("campaignId", normCampId))
            .collect();
          for (const s of campSheets) {
            byId.set(s._id, s);
          }
        }
      } else {
        const campSheets = await ctx.db
          .query("characterSheets")
          .withIndex("by_campaign", (q) => q.eq("campaignId", normCampId))
          .collect();
        for (const s of campSheets) {
          byId.set(s._id, s);
        }
      }
    }

    return Array.from(byId.values()).map((s) => ({
      ...s,
      id: s._id,
    }));
  },
});

export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
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
    expertiseSkills: v.optional(v.array(v.string())),
    originFeat: v.optional(v.string()),
    savingThrows: v.optional(v.array(v.string())),
    weaponMasteries: v.optional(v.array(v.string())),
    size: v.optional(v.string()),
    initiativeBonus: v.optional(v.number()),
    heroicInspiration: v.optional(v.boolean()),
    deathSaves: v.optional(
      v.object({
        successes: v.number(),
        failures: v.number(),
      })
    ),
    senses: v.optional(v.array(v.string())),
    resistances: v.optional(v.array(v.string())),
    languages: v.optional(v.array(v.string())),
    spellcastingAbility: v.optional(
      v.union(v.literal("int"), v.literal("wis"), v.literal("cha"))
    ),
    personality: v.optional(
      v.object({
        traits: v.optional(v.string()),
        ideals: v.optional(v.string()),
        bonds: v.optional(v.string()),
        flaws: v.optional(v.string()),
        appearance: v.optional(v.string()),
      })
    ),
    classFeatures: v.optional(v.array(classFeatureValidator)),
    classResources: v.optional(v.array(classResourceValidator)),
    spellSlots: spellSlotsValidator,
    spells: v.array(spellValidator),
    equipment: v.array(equipmentValidator),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireSessionUser(ctx, args.sessionToken);
    const normCampId = normalizeCampaignId(args.campaignId);
    if (normCampId) {
      const camp = await findCampaignByAnyId(ctx, normCampId);
      const isMember =
        camp &&
        (camp.dmUserId === user.id ||
          Boolean(camp.memberUserIds?.includes(user.id)));
      if (!isMember) {
        throw new Error(
          "Sem permissão para vincular ficha a uma campanha da qual você não participa."
        );
      }
    }

    const { sessionToken: _, ...data } = args;
    const sheetId = await ctx.db.insert("characterSheets", {
      ...data,
      playerId: user.id,
      playerName: user.name || args.playerName,
      campaignId: normCampId,
      updatedAt: new Date().toISOString(),
    });
    return sheetId;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.string(),
    campaignId: v.optional(v.string()),
    campaignTitle: v.optional(v.string()),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    race: v.optional(v.string()),
    racialTraits: v.optional(v.array(v.string())),
    className: v.optional(v.string()),
    subclass: v.optional(v.string()),
    level: v.optional(v.number()),
    background: v.optional(v.string()),
    alignment: v.optional(v.string()),
    hp: v.optional(v.number()),
    maxHp: v.optional(v.number()),
    tempHp: v.optional(v.number()),
    armorClass: v.optional(v.number()),
    speed: v.optional(v.string()),
    hitDice: v.optional(v.string()),
    hitDiceUsed: v.optional(v.number()),
    proficiencyBonus: v.optional(v.number()),
    passivePerception: v.optional(v.number()),
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
    stats: v.optional(
      v.object({
        str: v.number(),
        dex: v.number(),
        con: v.number(),
        int: v.number(),
        wis: v.number(),
        cha: v.number(),
      })
    ),
    proficiencies: v.optional(v.array(v.string())),
    expertiseSkills: v.optional(v.array(v.string())),
    originFeat: v.optional(v.string()),
    savingThrows: v.optional(v.array(v.string())),
    weaponMasteries: v.optional(v.array(v.string())),
    size: v.optional(v.string()),
    initiativeBonus: v.optional(v.number()),
    heroicInspiration: v.optional(v.boolean()),
    deathSaves: v.optional(
      v.object({
        successes: v.number(),
        failures: v.number(),
      })
    ),
    senses: v.optional(v.array(v.string())),
    resistances: v.optional(v.array(v.string())),
    languages: v.optional(v.array(v.string())),
    spellcastingAbility: v.optional(
      v.union(v.literal("int"), v.literal("wis"), v.literal("cha"))
    ),
    personality: v.optional(
      v.object({
        traits: v.optional(v.string()),
        ideals: v.optional(v.string()),
        bonds: v.optional(v.string()),
        flaws: v.optional(v.string()),
        appearance: v.optional(v.string()),
      })
    ),
    classFeatures: v.optional(v.array(classFeatureValidator)),
    classResources: v.optional(v.array(classResourceValidator)),
    spellSlots: v.optional(spellSlotsValidator),
    spells: v.optional(v.array(spellValidator)),
    equipment: v.optional(v.array(equipmentValidator)),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireSessionUser(ctx, args.sessionToken);
    const sheetId = ctx.db.normalizeId("characterSheets", args.id);
    if (!sheetId) {
      throw new Error("Ficha ainda não sincronizada na nuvem.");
    }
    const existing = await ctx.db.get(sheetId);
    if (!existing) return;

    const isOwner = existing.playerId === user.id;
    let isCampaignDm = false;
    if (existing.campaignId && user.role === "dm") {
      const camp = await findCampaignByAnyId(ctx, existing.campaignId);
      isCampaignDm = camp?.dmUserId === user.id;
    }
    if (!isOwner && !isCampaignDm) {
      throw new Error("Sem permissão para alterar esta ficha.");
    }

    if (args.campaignId && args.campaignId !== existing.campaignId) {
      const targetCamp = await findCampaignByAnyId(ctx, args.campaignId);
      const canLink =
        targetCamp &&
        (targetCamp.dmUserId === user.id ||
          Boolean(targetCamp.memberUserIds?.includes(user.id)));
      if (!canLink) {
        throw new Error(
          "Você precisa ingressar na campanha antes de vincular esta ficha."
        );
      }
    }

    const { id: _, sessionToken: __, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(sheetId, {
      ...cleanUpdates,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireSessionUser(ctx, args.sessionToken);
    const sheetId = ctx.db.normalizeId("characterSheets", args.id);
    if (!sheetId) return;
    const existing = await ctx.db.get(sheetId);
    if (!existing) return;

    const isOwner = existing.playerId === user.id;
    let isCampaignDm = false;
    if (existing.campaignId && user.role === "dm") {
      const camp = await findCampaignByAnyId(ctx, existing.campaignId);
      isCampaignDm = camp?.dmUserId === user.id;
    }
    if (!isOwner && !isCampaignDm) {
      throw new Error("Sem permissão para excluir esta ficha.");
    }

    await ctx.db.delete(sheetId);
  },
});
