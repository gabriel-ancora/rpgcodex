import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  matchesCampaign,
  normalizeCampaignId,
  resolveEffectiveRole,
  assertDmPermission,
} from "./lib/tenancy";

export const get = query({
  args: { campaignId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    if (!normId) return null;
    const all = await ctx.db.query("calendars").collect();
    const matched = all.find((c) => matchesCampaign(c.campaignId, normId));
    return matched ?? null;
  },
});

export const update = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    calendarName: v.optional(v.string()),
    epochName: v.optional(v.string()),
    currentYear: v.optional(v.number()),
    currentMonthIndex: v.optional(v.number()),
    currentDay: v.optional(v.number()),
    weekdays: v.optional(v.array(v.string())),
    availableEras: v.optional(v.array(v.string())),
    months: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          days: v.number(),
          season: v.string(),
        })
      )
    ),
    moons: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          cycleDays: v.number(),
          offset: v.number(),
          color: v.string(),
          lore: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const normCampId = normalizeCampaignId(args.campaignId);
    if (!normCampId) return;

    const all = await ctx.db.query("calendars").collect();
    const calendar = all.find((c) => matchesCampaign(c.campaignId, normCampId));

    const { sessionToken: _, campaignId: __, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );

    if (calendar) {
      await ctx.db.patch(calendar._id, {
        ...cleanUpdates,
        campaignId: normCampId,
      });
    } else {
      await ctx.db.insert("calendars", {
        campaignId: normCampId,
        calendarName: args.calendarName || "Calendário do Cenário",
        epochName: args.epochName || "Era Atual",
        currentYear: args.currentYear ?? 1,
        currentMonthIndex: args.currentMonthIndex ?? 0,
        currentDay: args.currentDay ?? 1,
        weekdays: args.weekdays || [
          "Solis",
          "Lunaris",
          "Ferrum",
          "Cineris",
          "Vespera",
          "Umbra",
          "Sacrum",
        ],
        months: args.months || [
          { id: "m1", name: "Alvorada", days: 30, season: "Primavera" },
          { id: "m2", name: "Solstício", days: 30, season: "Verão" },
          { id: "m3", name: "Colheita", days: 30, season: "Outono" },
          { id: "m4", name: "Inverno", days: 30, season: "Inverno" },
        ],
        moons: args.moons || [
          {
            id: "moon-1",
            name: "Lua Principal",
            cycleDays: 28,
            offset: 0,
            color: "#e2e8f0",
            lore: "Ciclo lunar primário.",
          },
        ],
        availableEras: args.availableEras || ["Era Antiga", "Era Atual"],
      });
    }
  },
});

export const advanceDays = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const all = await ctx.db.query("calendars").collect();
    const cal = all.find((c) =>
      matchesCampaign(c.campaignId, args.campaignId)
    );
    if (!cal) return;

    let day = cal.currentDay + args.days;
    let monthIdx = cal.currentMonthIndex;
    let year = cal.currentYear;

    while (day > (cal.months[monthIdx]?.days || 30)) {
      day -= cal.months[monthIdx]?.days || 30;
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
      day += cal.months[monthIdx]?.days || 30;
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
    campaignId: v.optional(v.string()),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    if (!normId) return [];

    const role = await resolveEffectiveRole(ctx, {
      sessionToken: args.sessionToken,
      viewerRole: args.viewerRole,
      campaignId: normId,
    });

    const allEvents = await ctx.db.query("timelineEvents").collect();
    return allEvents
      .filter((e) => {
        if (!matchesCampaign(e.campaignId, normId)) return false;
        if (role === "player" && e.isSecret && !e.isRevealed) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        return (
          a.year * 1000 +
          a.monthIndex * 40 +
          a.day -
          (b.year * 1000 + b.monthIndex * 40 + b.day)
        );
      })
      .map((e) => ({
        ...e,
        id: e._id,
      }));
  },
});

export const addEvent = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    title: v.string(),
    year: v.number(),
    monthIndex: v.number(),
    day: v.number(),
    epoch: v.string(),
    category: v.union(
      v.literal("historical"),
      v.literal("session"),
      v.literal("cataclysm"),
      v.literal("intrigue")
    ),
    visualTag: v.optional(v.string()),
    linkedWikiHandles: v.optional(v.array(v.string())),
    sortOrder: v.optional(v.number()),
    sessionNumber: v.optional(v.number()),
    description: v.string(),
    isSecret: v.boolean(),
    isRevealed: v.boolean(),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert("timelineEvents", {
      ...data,
      campaignId: normalizeCampaignId(args.campaignId),
    });
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.string(),
    sessionToken: v.optional(v.string()),
    title: v.optional(v.string()),
    year: v.optional(v.number()),
    monthIndex: v.optional(v.number()),
    day: v.optional(v.number()),
    epoch: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("historical"),
        v.literal("session"),
        v.literal("cataclysm"),
        v.literal("intrigue")
      )
    ),
    visualTag: v.optional(v.string()),
    sessionNumber: v.optional(v.number()),
    description: v.optional(v.string()),
    linkedWikiHandles: v.optional(v.array(v.string())),
    isSecret: v.optional(v.boolean()),
    isRevealed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const evId = ctx.db.normalizeId("timelineEvents", args.eventId);
    if (!evId) return;
    const ev = await ctx.db.get(evId);
    if (!ev) return;
    await assertDmPermission(ctx, args.sessionToken, ev.campaignId);
    const { eventId: _, sessionToken: __, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(evId, cleanUpdates);
  },
});

export const reorderEvents = mutation({
  args: {
    campaignId: v.optional(v.string()),
    orderedIds: v.array(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    for (let i = 0; i < args.orderedIds.length; i++) {
      const evId = ctx.db.normalizeId("timelineEvents", args.orderedIds[i]);
      if (evId) {
        await ctx.db.patch(evId, { sortOrder: i });
      }
    }
  },
});

export const removeEvent = mutation({
  args: {
    eventId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const evId = ctx.db.normalizeId("timelineEvents", args.eventId);
    if (!evId) return;
    const ev = await ctx.db.get(evId);
    if (!ev) return;
    await assertDmPermission(ctx, args.sessionToken, ev.campaignId);
    await ctx.db.delete(evId);
  },
});

export const toggleRevealEvent = mutation({
  args: {
    eventId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const evId = ctx.db.normalizeId("timelineEvents", args.eventId);
    if (!evId) return;
    const ev = await ctx.db.get(evId);
    if (!ev) return;
    await assertDmPermission(ctx, args.sessionToken, ev.campaignId);
    await ctx.db.patch(evId, {
      isRevealed: !ev.isRevealed,
      isSecret: ev.isRevealed,
    });
  },
});
