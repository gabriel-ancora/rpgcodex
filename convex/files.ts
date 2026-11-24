import { mutation, internalMutation, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireDm, requireUser } from "./lib/tenancy";

/**
 * Convex File Storage com rastreamento de uploads.
 *
 * Fluxo:
 *  1. generateUploadUrl  -> registra um `pendingUploads` (usuário, campanha, finalidade).
 *  2. cliente envia o arquivo para a URL e recebe o storageId.
 *  3. resolveStorageUrl (imagens) ou ai.extractWikiFromPdf (PDF) "reivindica" o storageId,
 *     vinculando-o ao pendingUpload do mesmo usuário. Um storageId só pode ser reivindicado
 *     por quem pediu a URL, e só arquivos reivindicados podem ser anexados/excluídos.
 */

const PENDING_TTL_MS = 60 * 60 * 1000; // 1 hora
const MAX_UNCLAIMED_PER_USER = 20;

const purposeValidator = v.union(v.literal("image"), v.literal("pdf"));

async function pruneUnclaimed(ctx: MutationCtx, userId: string) {
  const rows = await ctx.db
    .query("pendingUploads")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const now = Date.now();
  const unclaimed = rows.filter((r) => !r.storageId).sort((a, b) => a.createdAt - b.createdAt);
  for (let i = 0; i < unclaimed.length; i++) {
    const r = unclaimed[i];
    const tooMany = unclaimed.length - i > MAX_UNCLAIMED_PER_USER - 1;
    if (now - r.createdAt > PENDING_TTL_MS || tooMany) {
      await ctx.db.delete(r._id);
    }
  }
}

/**
 * Vincula um storageId recém-enviado ao pendingUpload do usuário.
 * Idempotente para o mesmo usuário; recusa arquivos de terceiros.
 */
async function claimUpload(
  ctx: MutationCtx,
  userId: string,
  storageId: Id<"_storage">,
  purpose: "image" | "pdf",
  campaignId?: string
): Promise<Doc<"pendingUploads">> {
  const existing = await ctx.db
    .query("pendingUploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .first();
  if (existing) {
    if (existing.userId !== userId || existing.purpose !== purpose) {
      throw new Error("Arquivo não encontrado ou não pertence a este usuário.");
    }
    if (campaignId !== undefined && existing.campaignId !== campaignId) {
      throw new Error("Arquivo não pertence a esta campanha.");
    }
    return existing;
  }

  const meta = await ctx.db.system.get(storageId);
  if (!meta) throw new Error("Arquivo não encontrado.");

  const now = Date.now();
  const candidates = (
    await ctx.db
      .query("pendingUploads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
  )
    .filter(
      (r) =>
        !r.storageId &&
        r.purpose === purpose &&
        (campaignId === undefined || r.campaignId === campaignId) &&
        now - r.createdAt <= PENDING_TTL_MS &&
        // O arquivo precisa ter sido criado depois que a URL foi emitida.
        r.createdAt <= meta._creationTime
    )
    .sort((a, b) => a.createdAt - b.createdAt);

  const slot = candidates[0];
  if (!slot) {
    throw new Error("Arquivo não encontrado ou não pertence a este usuário.");
  }
  await ctx.db.patch(slot._id, { storageId });
  return { ...slot, storageId };
}

export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
    // Obrigatório para PDFs (importação da Wiki) e para recursos de campanha (mapas).
    campaignId: v.optional(v.string()),
    purpose: v.optional(purposeValidator),
  },
  handler: async (ctx, args) => {
    const purpose = args.purpose ?? "image";
    let userId: string;
    let campaignId: string | undefined;

    if (args.campaignId?.trim()) {
      const access = await requireDm(ctx, args.sessionToken, args.campaignId);
      userId = access.user.id;
      campaignId = access.canonicalId;
    } else {
      if (purpose === "pdf") {
        throw new Error("Selecione uma campanha para importar o PDF.");
      }
      userId = (await requireUser(ctx, args.sessionToken)).id;
    }

    await pruneUnclaimed(ctx, userId);
    await ctx.db.insert("pendingUploads", {
      userId,
      campaignId,
      purpose,
      createdAt: Date.now(),
    });
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Confirma o upload de uma imagem (vinculando-a ao usuário) e devolve a URL pública.
 */
export const resolveStorageUrl = mutation({
  args: {
    sessionToken: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    await claimUpload(ctx, user.id, args.storageId, "image");
    const url = await ctx.storage.getUrl(args.storageId);
    return { url, storageId: args.storageId };
  },
});

/** Usado por ai.extractWikiFromPdf: valida sessão + Mestre e reivindica o PDF. */
export const claimPdfUpload = internalMutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const access = await requireDm(ctx, args.sessionToken, args.campaignId);
    await claimUpload(ctx, access.user.id, args.storageId, "pdf", access.canonicalId);
    return { userId: access.user.id };
  },
});

/** Remove o PDF temporário e seu registro após o processamento. */
export const releasePdfUpload = internalMutation({
  args: { storageId: v.id("_storage"), userId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("pendingUploads")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
    // Só exclui arquivos que vieram deste fluxo (PDF reivindicado pelo mesmo usuário).
    if (!row || row.userId !== args.userId || row.purpose !== "pdf") return;
    await ctx.storage.delete(args.storageId).catch(() => {});
    await ctx.db.delete(row._id);
  },
});
