import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Convex Cloud File Storage
 * Evita salvar imagens Base64 pesadas no LocalStorage (limite de 5MB),
 * hospedando mapas e avatares diretamente na CDN da Convex.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const resolveStorageUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return { url, storageId: args.storageId };
  },
});

export const getUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

