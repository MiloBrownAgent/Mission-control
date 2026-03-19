import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Public query — called server-to-server from lookandseen.com login API only.
// Passwords are hashed (PBKDF2); this never exposes plaintext credentials.
export const getAccountByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("clientPortalAccounts")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const createAccount = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    clientSlug: v.string(),
  },
  handler: async (ctx, { email, passwordHash, passwordSalt, clientSlug }) => {
    // Prevent duplicates
    const existing = await ctx.db
      .query("clientPortalAccounts")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      throw new Error(`Account already exists for ${email}`);
    }
    return await ctx.db.insert("clientPortalAccounts", {
      email,
      passwordHash,
      passwordSalt,
      clientSlug,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateLastLogin = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query("clientPortalAccounts")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!account) throw new Error("Account not found");
    await ctx.db.patch(account._id, { lastLoginAt: Date.now() });
  },
});

export const listAccounts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clientPortalAccounts").collect();
  },
});

export const toggleActive = mutation({
  args: { id: v.id("clientPortalAccounts") },
  handler: async (ctx, { id }) => {
    const account = await ctx.db.get(id);
    if (!account) throw new Error("Account not found");
    await ctx.db.patch(id, { isActive: !account.isActive });
  },
});

export const updatePassword = mutation({
  args: {
    id: v.id("clientPortalAccounts"),
    passwordHash: v.string(),
    passwordSalt: v.string(),
  },
  handler: async (ctx, { id, passwordHash, passwordSalt }) => {
    const account = await ctx.db.get(id);
    if (!account) throw new Error("Account not found");
    await ctx.db.patch(id, { passwordHash, passwordSalt });
  },
});
