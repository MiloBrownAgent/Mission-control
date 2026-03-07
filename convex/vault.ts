import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("vault_documents").collect();
  },
});

export const getDocument = query({
  args: { id: v.id("vault_documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveDocument = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    fileType: v.string(),
    storageId: v.string(),
    iv: v.string(),
    authTag: v.string(),
    dateAdded: v.string(),
    addedBy: v.string(),
    fileSize: v.number(),
    originalName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("vault_documents", args);
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("vault_documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Document not found");
    if (doc.storageId) {
      try {
        await ctx.storage.delete(doc.storageId as any);
      } catch {
        // storage may already be deleted
      }
    }
    await ctx.db.delete(args.id);
  },
});

export const getDownloadUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId as any);
  },
});
