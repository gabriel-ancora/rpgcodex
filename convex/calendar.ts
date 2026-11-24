import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireDm,
  requireDmOfRecord,
  memberOrNull,
  effectiveRole,
  collectByCampaign,
  firstByCampaign,
  getOrThrow,
  ERR_NOT_FOUND,
} from "./lib/tenancy";
import { defaultCalendar } from "./lib/defaults";

const categoryValidator = v.union(
  v.literal("historical"),
  v.literal("session"),
  v.literal("cataclysm"),
  v.literal("intrigue")
);

const monthValidator = v.object({
  id: v.string(),
  name: v.string(),
  days: v.number(),
  season: v.string(),
});

const moonValidator = v.object({
  id: v.string(),
  name: v.string(),
  cycleDays: v.number(),
  offset: v.number(),
  color: v.string(),
  lore: v.string(),
});

export const get = query({
  args: { sessionToken: v.string(), campaignId: v.string() },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return null;
    return await firstByCampaign(ctx, "calendars", access.keys);
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    calendarName: v.optional(v.string()),
    epochName: v.optional(v.string()),
    currentYear: v.optional(v.number()),
    currentMonthIndex: v.optional(v.number()),
    currentDay: v.optional(v.number()),
    weekdays: v.optional(v.array(v.string())),
    availableEras: v.optional(v.array(v.string())),
    months: v.optional(v.array(monthValidator)),
    moons: v.optional(v.array(moonValidator)),
  },
  handler: async (ctx, args) => {
    const { canonicalId, keys, camp } = await requireDm(ctx, args.sessionToken, args.campaignId);
    if (args.months && args.months.length === 0) {
      throw new Error("O calendário precisa de pelo menos um mês.");
    }

    const { sessionToken: _t, campaignId: _c, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );

    const calendar = await firstByCampaign(ctx, "calendars", keys);
    if (calendar) {
      await ctx.db.patch(calendar._id, clean);
    } else {
      await ctx.db.insert("calendars", {
        ...defaultCalendar(canonicalId, camp.name),
        ...clean,
        campaignId: canonicalId,
      });
    }
  },
});

export const advanceDays = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const { keys } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const cal = await firstByCampaign(ctx, "calendars", keys);
    if (!cal) throw new Error(ERR_NOT_FOUND);
    if (!Number.isFinite(args.days) || Math.abs(args.days) > 100_000) {
      throw new Error("Quantidade de dias inválida.");
    }
    if (cal.months.length === 0) throw new Error("O calendário não possui meses configurados.");

    let day = cal.currentDay + Math.trunc(args.days);
    let monthIdx = cal.currentMonthIndex;
    let year = cal.currentYear;
    const daysIn = (idx: number) => Math.max(1, cal.months[idx]?.days || 30);

    while (day > daysIn(monthIdx)) {
      day -= daysIn(monthIdx);
      monthIdx++;
      if (monthIdx >= cal.months.length) {
        monthIdx = 0;
        year++;
      }
    }
    while (day < 1) {
      monthIdx--;
      if (monthIdx < 0) {
        monthIdx = cal.months.length - 1;
        year--;
      }
      day += daysIn(monthIdx);
    }

    await ctx.db.patch(cal._id, {
      currentDay: day,
      currentMonthIndex: monthIdx,
      currentYear: year,
    });
  },
});

export const listEvents = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);

    const events = await collectByCampaign(ctx, "timelineEvents", access.keys);
    return events
      .filter((e) => role === "gm" || !e.isSecret || e.isRevealed)
      .sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        return (
          a.year * 1000 + a.monthIndex * 40 + a.day - (b.year * 1000 + b.monthIndex * 40 + b.day)
        );
      })
      .map((e) => ({ ...e, id: e._id }));
  },
});

export const addEvent = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    title: v.string(),
    year: v.number(),
    monthIndex: v.number(),
    day: v.number(),
    epoch: v.string(),
    category: categoryValidator,
    visualTag: v.optional(v.string()),
    linkedWikiHandles: v.optional(v.array(v.string())),
    sortOrder: v.optional(v.number()),
    sessionNumber: v.optional(v.number()),
    description: v.string(),
    // Padrão: secreto e não revelado.
    isSecret: v.optional(v.boolean()),
    isRevealed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { canonicalId } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _t, campaignId: _c, isSecret, isRevealed, ...data } = args;
    return await ctx.db.insert("timelineEvents", {
      ...data,
      isSecret: isSecret ?? true,
      isRevealed: isRevealed ?? false,
      campaignId: canonicalId,
    });
  },
});

export const updateEvent = mutation({
  args: {
    sessionToken: v.string(),
    eventId: v.string(),
    title: v.optional(v.string()),
    year: v.optional(v.number()),
    monthIndex: v.optional(v.number()),
    day: v.optional(v.number()),
    epoch: v.optional(v.string()),
    category: v.optional(categoryValidator),
    visualTag: v.optional(v.string()),
    sessionNumber: v.optional(v.number()),
    description: v.optional(v.string()),
    linkedWikiHandles: v.optional(v.array(v.string())),
    isSecret: v.optional(v.boolean()),
    isRevealed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const ev = await getOrThrow(ctx, "timelineEvents", args.eventId);
    await requireDmOfRecord(ctx, args.sessionToken, ev.campaignId);
    const { eventId: _e, sessionToken: _t, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(ev._id, clean);
  },
});

export const reorderEvents = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    orderedIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { keys } = await requireDm(ctx, args.sessionToken, args.campaignId);
    // Valida todos os eventos antes de gravar qualquer alteração.
    const events = [];
    for (const id of args.orderedIds) {
      const ev = await getOrThrow(ctx, "timelineEvents", id);
      if (!ev.campaignId || !keys.includes(ev.campaignId)) throw new Error(ERR_NOT_FOUND);
      events.push(ev);
    }
    for (let i = 0; i < events.length; i++) {
      await ctx.db.patch(events[i]._id, { sortOrder: i });
    }
  },
});

export const removeEvent = mutation({
  args: {
    sessionToken: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const ev = await getOrThrow(ctx, "timelineEvents", args.eventId);
    await requireDmOfRecord(ctx, args.sessionToken, ev.campaignId);
    await ctx.db.delete(ev._id);
  },
});

/** Alterna apenas `isRevealed`; `isSecret` nunca é alterado aqui. */
export const toggleRevealEvent = mutation({
  args: {
    sessionToken: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const ev = await getOrThrow(ctx, "timelineEvents", args.eventId);
    await requireDmOfRecord(ctx, args.sessionToken, ev.campaignId);
    await ctx.db.patch(ev._id, { isRevealed: !ev.isRevealed });
  },
});
