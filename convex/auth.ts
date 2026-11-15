import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getSessionUser } from "./lib/tenancy";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRandomHex(byteLength = 24): string {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

async function hashPasswordWithSalt(
  password: string,
  salt: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:obsidian-codex:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.optional(v.union(v.literal("dm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const cleanName = args.name.trim();
    const initialRole = args.role ?? "player";

    if (!normalizedEmail.includes("@")) {
      throw new Error("Informe um endereço de e-mail válido.");
    }
    if (args.password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }
    if (cleanName.length < 2) {
      throw new Error("Informe seu nome ou título de exibição.");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      throw new Error(
        "Este e-mail já está cadastrado. Use a aba 'Entrar na Conta'."
      );
    }

    const salt = generateRandomHex(16);
    const passwordHash = await hashPasswordWithSalt(args.password, salt);
    const now = new Date().toISOString();

    const userId = await ctx.db.insert("users", {
      name: cleanName,
      email: normalizedEmail,
      passwordHash,
      salt,
      role: initialRole,
      createdAt: now,
    });

    const token = generateRandomHex(32);
    await ctx.db.insert("userSessions", {
      token,
      userId,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      createdAt: now,
    });

    return {
      token,
      user: {
        id: userId,
        name: cleanName,
        email: normalizedEmail,
        role: initialRole,
        sessionRole: null as "dm" | "player" | null,
      },
    };
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      throw new Error(
        "Conta não encontrada para este e-mail. Crie seu cadastro primeiro."
      );
    }

    const candidateHash = await hashPasswordWithSalt(args.password, user.salt);
    if (candidateHash !== user.passwordHash) {
      throw new Error("Senha incorreta. Verifique suas credenciais.");
    }

    const token = generateRandomHex(32);
    await ctx.db.insert("userSessions", {
      token,
      userId: user._id,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      createdAt: new Date().toISOString(),
    });

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sessionRole: null as "dm" | "player" | null,
        avatarUrl: user.avatarUrl,
      },
    };
  },
});

export const me = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await getSessionUser(ctx, args.sessionToken);
  },
});

export const logout = mutation({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) return;
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken!))
      .first();
    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

export const selectSessionRole = mutation({
  args: {
    sessionToken: v.string(),
    role: v.union(v.literal("dm"), v.literal("player")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Sessão expirada ou inválida. Faça login novamente.");
    }
    if (session.sessionRole) {
      if (session.sessionRole !== args.role) {
        throw new Error(
          "O modo de acesso já foi definido após o login e não pode ser alterado. Encerre a sessão para escolher outro papel."
        );
      }
    } else {
      await ctx.db.patch(session._id, { sessionRole: args.role });
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: args.role,
      sessionRole: args.role,
      avatarUrl: user.avatarUrl,
    };
  },
});

export const switchRole = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    role: v.union(v.literal("dm"), v.literal("player")),
  },
  handler: async () => {
    throw new Error(
      "Não é possível trocar entre Mestre e Jogador após entrar. Encerre a sessão para acessar de outro modo."
    );
  },
});

