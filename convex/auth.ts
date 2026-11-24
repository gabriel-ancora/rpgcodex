import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getSessionUser } from "./lib/tenancy";
import {
  PBKDF2_ITERATIONS,
  generateRandomHex,
  hashPasswordLegacy,
  hashPasswordPbkdf2,
  timingSafeEqual,
} from "./lib/password";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
const MAX_LOGIN_FAILURES = 8;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const EXPIRED_SESSION_SWEEP = 50;

const ERR_LOGIN = "E-mail ou senha incorretos.";
const ERR_LOCKED = "Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.";
const ERR_REGISTER =
  "Não foi possível concluir o cadastro com esses dados. Se você já possui conta, use a opção Entrar.";

type AuthResult = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "dm" | "player";
    avatarUrl?: string;
  };
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// ============================================================================
// Funções internas (executadas pelas actions de login/cadastro)
// ============================================================================

export const getLoginState = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    return {
      lockedUntil: attempts?.lockedUntil ?? null,
      user: user
        ? {
            id: user._id,
            passwordHash: user.passwordHash,
            salt: user.salt,
            hashAlgo: user.hashAlgo ?? null,
            hashIterations: user.hashIterations ?? null,
          }
        : null,
    };
  },
});

export const recordLoginFailure = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!existing) {
      await ctx.db.insert("loginAttempts", { email: args.email, failures: 1, lastFailureAt: now });
      return;
    }
    // Bloqueio anterior expirado: recomeça a contagem.
    const lockExpired = existing.lockedUntil !== undefined && existing.lockedUntil <= now;
    const failures = lockExpired ? 1 : existing.failures + 1;
    await ctx.db.patch(existing._id, {
      failures,
      lastFailureAt: now,
      lockedUntil: failures >= MAX_LOGIN_FAILURES ? now + LOCK_DURATION_MS : undefined,
    });
  },
});

async function createSession(
  ctx: { db: import("./_generated/server").DatabaseWriter },
  userId: Id<"users">
) {
  const token = generateRandomHex(32);
  await ctx.db.insert("userSessions", {
    token,
    userId,
    expiresAt: Date.now() + SESSION_DURATION_MS,
    createdAt: new Date().toISOString(),
  });
  return token;
}

export const completeLogin = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    upgrade: v.optional(
      v.object({ passwordHash: v.string(), salt: v.string(), iterations: v.number() })
    ),
  },
  handler: async (ctx, args): Promise<AuthResult> => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error(ERR_LOGIN);

    if (args.upgrade) {
      await ctx.db.patch(user._id, {
        passwordHash: args.upgrade.passwordHash,
        salt: args.upgrade.salt,
        hashAlgo: "pbkdf2",
        hashIterations: args.upgrade.iterations,
      });
    }

    const attempts = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (attempts) await ctx.db.delete(attempts._id);

    // Limpeza oportunista de sessões expiradas.
    const expired = await ctx.db
      .query("userSessions")
      .withIndex("by_expires", (q) => q.lt("expiresAt", Date.now()))
      .take(EXPIRED_SESSION_SWEEP);
    for (const s of expired) await ctx.db.delete(s._id);

    const token = await createSession(ctx, user._id);
    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role ?? "player",
        avatarUrl: user.avatarUrl,
      },
    };
  },
});

export const createUserWithSession = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    iterations: v.number(),
  },
  handler: async (ctx, args): Promise<AuthResult> => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) throw new Error(ERR_REGISTER);

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      salt: args.salt,
      hashAlgo: "pbkdf2",
      hashIterations: args.iterations,
      createdAt: new Date().toISOString(),
    });

    const token = await createSession(ctx, userId);
    return {
      token,
      user: { id: userId, name: args.name, email: args.email, role: "player" },
    };
  },
});

// ============================================================================
// API pública
// ============================================================================

/**
 * Cadastro. `role` é aceito apenas por compatibilidade e ignorado
 * (o papel de Mestre é sempre por campanha).
 */
export const register = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.optional(v.union(v.literal("dm"), v.literal("player"))),
  },
  handler: async (ctx, args): Promise<AuthResult> => {
    const email = normalizeEmail(args.email);
    const name = args.name.trim();

    if (!email.includes("@") || email.length > 254) {
      throw new Error("Informe um endereço de e-mail válido.");
    }
    if (args.password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }
    if (args.password.length > 256) {
      throw new Error("A senha excede o tamanho máximo permitido.");
    }
    if (name.length < 2 || name.length > 80) {
      throw new Error("Informe seu nome de exibição (2 a 80 caracteres).");
    }

    const salt = generateRandomHex(16);
    const passwordHash = await hashPasswordPbkdf2(args.password, salt, PBKDF2_ITERATIONS);
    return await ctx.runMutation(internal.auth.createUserWithSession, {
      name,
      email,
      passwordHash,
      salt,
      iterations: PBKDF2_ITERATIONS,
    });
  },
});

export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<AuthResult> => {
    const email = normalizeEmail(args.email);
    if (!email || args.password.length === 0 || args.password.length > 256) {
      throw new Error(ERR_LOGIN);
    }

    const state = await ctx.runQuery(internal.auth.getLoginState, { email });
    if (state.lockedUntil && state.lockedUntil > Date.now()) {
      throw new Error(ERR_LOCKED);
    }

    let valid = false;
    let needsUpgrade = false;
    if (state.user) {
      const u = state.user;
      if (u.hashAlgo === "pbkdf2") {
        const iterations = u.hashIterations ?? PBKDF2_ITERATIONS;
        const candidate = await hashPasswordPbkdf2(args.password, u.salt, iterations);
        valid = timingSafeEqual(candidate, u.passwordHash);
        needsUpgrade = iterations < PBKDF2_ITERATIONS;
      } else {
        const candidate = await hashPasswordLegacy(args.password, u.salt);
        valid = timingSafeEqual(candidate, u.passwordHash);
        needsUpgrade = true;
      }
    } else {
      // Equaliza o tempo de resposta para e-mails inexistentes.
      await hashPasswordPbkdf2(args.password, generateRandomHex(16), PBKDF2_ITERATIONS);
    }

    if (!valid || !state.user) {
      await ctx.runMutation(internal.auth.recordLoginFailure, { email });
      throw new Error(ERR_LOGIN);
    }

    let upgrade: { passwordHash: string; salt: string; iterations: number } | undefined;
    if (needsUpgrade) {
      const salt = generateRandomHex(16);
      upgrade = {
        salt,
        passwordHash: await hashPasswordPbkdf2(args.password, salt, PBKDF2_ITERATIONS),
        iterations: PBKDF2_ITERATIONS,
      };
    }

    return await ctx.runMutation(internal.auth.completeLogin, {
      userId: state.user.id,
      email,
      upgrade,
    });
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
