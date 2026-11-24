import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  requireUser,
  requireDm,
  requireMember,
  memberOrNull,
  canonicalCampaignId,
  campaignKeys,
  collectByCampaign,
  assertUploadOwnedBy,
  CampaignScopedTable,
  SessionUser,
} from "./lib/tenancy";
import { ensureCampaignDefaults } from "./lib/defaults";

/**
 * Campanhas, participação (campaignMembers), códigos de convite e exclusão em lotes.
 */

const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PURGE_BATCH = 100;

function randomFromAlphabet(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    // 248 = 8 * 31: rejeita bytes >= 248 para evitar viés de módulo.
    let b = bytes[i];
    while (b >= 248) {
      const extra = new Uint8Array(1);
      crypto.getRandomValues(extra);
      b = extra[0];
    }
    out += INVITE_ALPHABET[b % INVITE_ALPHABET.length];
  }
  return out;
}

async function generateUniqueInviteCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const raw = randomFromAlphabet(8);
    const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    const clash = await ctx.db
      .query("campaigns")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();
    if (!clash) return code;
  }
  throw new Error("Não foi possível gerar um código de convite. Tente novamente.");
}

async function generateUniqueSlug(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const slug = `camp-${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
    const clash = await ctx.db
      .query("campaigns")
      .withIndex("by_slug", (q) => q.eq("slugId", slug))
      .first();
    if (!clash) return slug;
  }
  throw new Error("Não foi possível criar a campanha. Tente novamente.");
}

function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

async function playerIdsOf(ctx: QueryCtx, camp: Doc<"campaigns">): Promise<Set<string>> {
  const ids = new Set<string>(camp.memberUserIds || []);
  const rows = await ctx.db
    .query("campaignMembers")
    .withIndex("by_campaign", (q) => q.eq("campaignDocId", camp._id))
    .collect();
  for (const r of rows) ids.add(r.userId);
  if (camp.dmUserId) ids.delete(camp.dmUserId);
  return ids;
}

async function toSummary(ctx: QueryCtx, camp: Doc<"campaigns">, user: SessionUser) {
  const isDm = Boolean(camp.dmUserId) && camp.dmUserId === user.id;
  const resolvedCover = camp.coverStorageId
    ? (await ctx.storage.getUrl(camp.coverStorageId)) || camp.coverUrl || ""
    : camp.coverUrl || "";
  return {
    id: canonicalCampaignId(camp),
    title: camp.name,
    synopsis: camp.synopsis || camp.description || "",
    worldContext: camp.worldContext || "",
    system: camp.system || "D&D 5.5e (2024)",
    tone: camp.tone || "Fantasia",
    coverUrl: resolvedCover,
    coverStorageId: camp.coverStorageId,
    // O código de convite só é exposto ao Mestre.
    inviteCode: isDm ? camp.inviteCode || "" : "",
    dmName: camp.dmName || "Mestre",
    dmUserId: camp.dmUserId || "",
    isDm,
    activePlayersCount: (await playerIdsOf(ctx, camp)).size,
    sessionsPlayed: camp.sessionsPlayed ?? 0,
    // ISO 8601; a formatação para exibição é responsabilidade do cliente.
    updatedAt: camp.updatedAt,
  };
}

async function addMembership(
  ctx: MutationCtx,
  camp: Doc<"campaigns">,
  userId: string,
  role: "dm" | "player"
) {
  const existing = await ctx.db
    .query("campaignMembers")
    .withIndex("by_campaign_user", (q) => q.eq("campaignDocId", camp._id).eq("userId", userId))
    .first();
  if (!existing) {
    await ctx.db.insert("campaignMembers", {
      campaignDocId: camp._id,
      userId,
      role,
      joinedAt: new Date().toISOString(),
    });
  }
  const members = camp.memberUserIds || [];
  if (!members.includes(userId)) {
    await ctx.db.patch(camp._id, { memberUserIds: [...members, userId] });
  }
}

export const getStatus = query({
  args: { sessionToken: v.string(), campaignId: v.string() },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) {
      return {
        connected: false,
        entityCount: 0,
        mapCount: 0,
        frontCount: 0,
        questCount: 0,
        combatantCount: 0,
        sheetCount: 0,
      };
    }
    const k = access.keys;
    const asDm = access.isDm;
    const entities = await collectByCampaign(ctx, "entities", k);
    const maps = await collectByCampaign(ctx, "campaignMaps", k);
    const fronts = await collectByCampaign(ctx, "threatFronts", k);
    const quests = await collectByCampaign(ctx, "quests", k);
    const combatants = await collectByCampaign(ctx, "combatants", k);
    const sheets = await collectByCampaign(ctx, "characterSheets", k);

    return {
      connected: true,
      entityCount: asDm ? entities.length : entities.filter((e) => e.isPublicToPlayers).length,
      mapCount: asDm ? maps.length : maps.filter((m) => m.isPublicToPlayers !== false).length,
      frontCount: asDm ? fronts.length : fronts.filter((f) => !f.isSecret).length,
      questCount: asDm ? quests.length : quests.filter((q) => q.isPublic).length,
      combatantCount: asDm ? combatants.length : combatants.filter((c) => !c.isHidden).length,
      sheetCount: sheets.length,
    };
  },
});

export const list = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken).catch(() => null);
    if (!user) return [];

    const byId = new Map<string, Doc<"campaigns">>();
    const asDm = await ctx.db
      .query("campaigns")
      .withIndex("by_dm", (q) => q.eq("dmUserId", user.id))
      .collect();
    for (const c of asDm) byId.set(c._id, c);

    const memberships = await ctx.db
      .query("campaignMembers")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();
    for (const m of memberships) {
      if (byId.has(m.campaignDocId)) continue;
      const c = await ctx.db.get(m.campaignDocId);
      if (c) byId.set(c._id, c);
    }

    // Compatibilidade: participações antigas gravadas apenas em `memberUserIds`.
    // Pode ser removido depois de executar internal.campaign.backfillMembers.
    const legacy = await ctx.db.query("campaigns").collect();
    for (const c of legacy) {
      if (!byId.has(c._id) && (c.memberUserIds || []).includes(user.id)) byId.set(c._id, c);
    }

    const summaries = await Promise.all(
      Array.from(byId.values()).map((c) => toSummary(ctx, c, user))
    );
    return summaries.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    synopsis: v.string(),
    worldContext: v.optional(v.string()),
    system: v.string(),
    tone: v.string(),
    coverUrl: v.string(),
    coverStorageId: v.optional(v.id("_storage")),
    // Ignorados (mantidos por compatibilidade): slug e código são gerados no servidor,
    // e o nome do Mestre vem da sessão.
    slugId: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
    dmName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const title = args.title.trim();
    if (title.length < 1 || title.length > 120) {
      throw new Error("Informe um título de campanha válido (até 120 caracteres).");
    }
    if (args.coverStorageId) {
      await assertUploadOwnedBy(ctx, args.coverStorageId, user.id);
    }

    const now = new Date().toISOString();
    const slugId = await generateUniqueSlug(ctx);
    const inviteCode = await generateUniqueInviteCode(ctx);

    const insertedId = await ctx.db.insert("campaigns", {
      slugId,
      name: title,
      description: args.synopsis,
      synopsis: args.synopsis,
      worldContext: args.worldContext || "",
      system: args.system,
      tone: args.tone,
      coverUrl: args.coverUrl,
      coverStorageId: args.coverStorageId,
      inviteCode,
      dmUserId: user.id,
      dmName: user.name,
      memberUserIds: [user.id],
      sessionsPlayed: 0,
      createdAt: now,
      updatedAt: now,
    });
    const camp = await ctx.db.get(insertedId);
    if (!camp) throw new Error("Registro não encontrado.");

    await addMembership(ctx, camp, user.id, "dm");
    await ensureCampaignDefaults(ctx, slugId, [slugId], title);

    const fresh = (await ctx.db.get(insertedId))!;
    return {
      id: slugId,
      inviteCode,
      title,
      campaign: await toSummary(ctx, fresh, user),
    };
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
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
    const { camp, user } = await requireDm(ctx, args.sessionToken, args.campaignId);

    const patch: Partial<Doc<"campaigns">> = {
      updatedAt: new Date().toISOString(),
    };
    if (args.title !== undefined) {
      const title = args.title.trim();
      if (title.length < 1 || title.length > 120) {
        throw new Error("Informe um título de campanha válido (até 120 caracteres).");
      }
      patch.name = title;
    }
    if (args.synopsis !== undefined) {
      patch.synopsis = args.synopsis;
      patch.description = args.synopsis;
    }
    if (args.worldContext !== undefined) patch.worldContext = args.worldContext;
    if (args.system !== undefined) patch.system = args.system;
    if (args.tone !== undefined) patch.tone = args.tone;
    if (args.clearCoverImage) {
      if (camp.coverStorageId) {
        await ctx.storage.delete(camp.coverStorageId).catch(() => {});
      }
      patch.coverUrl = "";
      patch.coverStorageId = undefined;
    } else {
      if (args.coverStorageId !== undefined && args.coverStorageId !== camp.coverStorageId) {
        await assertUploadOwnedBy(ctx, args.coverStorageId, user.id);
        if (camp.coverStorageId) {
          await ctx.storage.delete(camp.coverStorageId).catch(() => {});
        }
        patch.coverStorageId = args.coverStorageId;
      }
      if (args.coverUrl !== undefined) patch.coverUrl = args.coverUrl;
    }
    if (args.sessionsPlayed !== undefined) {
      patch.sessionsPlayed = Math.max(0, Math.floor(args.sessionsPlayed));
    }

    await ctx.db.patch(camp._id, patch);
  },
});

export const joinByInviteCode = mutation({
  args: {
    sessionToken: v.string(),
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const clean = normalizeInviteCode(args.inviteCode);
    if (clean.length < 4 || clean.length > 32) {
      return { found: false as const, campaign: null };
    }

    let found = await ctx.db
      .query("campaigns")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", clean))
      .first();
    // Aceita o código digitado sem o hífen (XXXXXXXX -> XXXX-XXXX).
    if (!found && /^[A-Z0-9]{8}$/.test(clean)) {
      const withHyphen = `${clean.slice(0, 4)}-${clean.slice(4)}`;
      found = await ctx.db
        .query("campaigns")
        .withIndex("by_invite_code", (q) => q.eq("inviteCode", withHyphen))
        .first();
    }

    if (!found) {
      return { found: false as const, campaign: null };
    }

    const role = found.dmUserId === user.id ? "dm" : "player";
    await addMembership(ctx, found, user.id, role);
    const fresh = (await ctx.db.get(found._id))!;

    return {
      found: true as const,
      campaign: await toSummary(ctx, fresh, user),
    };
  },
});

/** Jogador deixa a campanha. O Mestre não pode sair da própria campanha (deve excluí-la). */
export const leave = mutation({
  args: { sessionToken: v.string(), campaignId: v.string() },
  handler: async (ctx, args) => {
    const { camp, user, isDm } = await requireMember(ctx, args.sessionToken, args.campaignId);
    if (isDm) {
      throw new Error("O Mestre não pode sair da própria campanha.");
    }
    const rows = await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign_user", (q) => q.eq("campaignDocId", camp._id).eq("userId", user.id))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
    const members = camp.memberUserIds || [];
    if (members.includes(user.id)) {
      await ctx.db.patch(camp._id, { memberUserIds: members.filter((id) => id !== user.id) });
    }
  },
});

// ============================================================================
// Exclusão de campanha em lotes
// ============================================================================

const PURGE_STEPS: CampaignScopedTable[] = [
  "entities",
  "campaignMaps",
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
];

async function purgeRow(ctx: MutationCtx, table: CampaignScopedTable, row: { _id: unknown }) {
  if (table === "entities") {
    const ent = row as Doc<"entities">;
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
    return;
  }
  if (table === "campaignMaps") {
    const map = row as Doc<"campaignMaps">;
    if (map.storageId) await ctx.storage.delete(map.storageId).catch(() => {});
    const pins = await ctx.db
      .query("mapPins")
      .withIndex("by_map", (q) => q.eq("mapId", map._id))
      .collect();
    for (const p of pins) await ctx.db.delete(p._id);
    await ctx.db.delete(map._id);
    return;
  }
  if (table === "characterSheets") {
    // Fichas pertencem aos jogadores: apenas desvincula da campanha excluída.
    const sheet = row as Doc<"characterSheets">;
    await ctx.db.patch(sheet._id, {
      campaignId: "",
      campaignTitle: "",
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await ctx.db.delete(row._id as any);
}

export const purgeCampaignData = internalMutation({
  args: { keys: v.array(v.string()), step: v.number() },
  handler: async (ctx, args): Promise<void> => {
    const keys = args.keys.filter((k) => k.trim().length > 0);
    if (keys.length === 0 || args.step >= PURGE_STEPS.length) return;
    const table = PURGE_STEPS[args.step];

    let processed = 0;
    for (const key of keys) {
      if (processed >= PURGE_BATCH) break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await (ctx.db.query(table) as any)
        .withIndex("by_campaign", (q: any) => q.eq("campaignId", key))
        .take(PURGE_BATCH - processed);
      for (const row of rows) {
        await purgeRow(ctx, table, row);
        processed++;
      }
    }

    const nextStep = processed >= PURGE_BATCH ? args.step : args.step + 1;
    if (nextStep < PURGE_STEPS.length) {
      await ctx.scheduler.runAfter(0, internal.campaign.purgeCampaignData, {
        keys,
        step: nextStep,
      });
    }
  },
});

export const remove = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
  },
  handler: async (ctx, args) => {
    const { camp } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const keys = campaignKeys(camp);

    const memberships = await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign", (q) => q.eq("campaignDocId", camp._id))
      .collect();
    for (const m of memberships) await ctx.db.delete(m._id);

    if (camp.coverStorageId) {
      await ctx.storage.delete(camp.coverStorageId).catch(() => {});
    }
    await ctx.db.delete(camp._id);

    // Os dados da campanha são removidos em lotes, fora desta transação.
    await ctx.scheduler.runAfter(0, internal.campaign.purgeCampaignData, { keys, step: 0 });
  },
});

/**
 * Migração: copia `campaigns.memberUserIds` para a tabela `campaignMembers`.
 * Executar uma vez pelo painel (internal.campaign.backfillMembers); processa em páginas.
 */
export const backfillMembers = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args): Promise<void> => {
    const page = await ctx.db
      .query("campaigns")
      .paginate({ cursor: args.cursor ?? null, numItems: 50 });
    for (const camp of page.page) {
      const ids = new Set(camp.memberUserIds || []);
      if (camp.dmUserId) ids.add(camp.dmUserId);
      for (const userId of ids) {
        const existing = await ctx.db
          .query("campaignMembers")
          .withIndex("by_campaign_user", (q) =>
            q.eq("campaignDocId", camp._id).eq("userId", userId)
          )
          .first();
        if (!existing) {
          await ctx.db.insert("campaignMembers", {
            campaignDocId: camp._id,
            userId,
            role: userId === camp.dmUserId ? "dm" : "player",
            joinedAt: camp.createdAt,
          });
        }
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.campaign.backfillMembers, {
        cursor: page.continueCursor,
      });
    }
  },
});
