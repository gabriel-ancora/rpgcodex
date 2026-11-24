import { MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { firstByCampaign } from "./tenancy";

/**
 * Valores iniciais únicos para calendário e recursos do grupo de uma campanha.
 * Usado na criação da campanha e na criação preguiçosa (quando o registro não existe).
 */
export function defaultCalendar(campaignId: string, campaignTitle?: string) {
  return {
    campaignId,
    calendarName: campaignTitle ? `Calendário — ${campaignTitle}` : "Calendário do Cenário",
    epochName: "Era Atual",
    currentYear: 1,
    currentMonthIndex: 0,
    currentDay: 1,
    weekdays: ["Solis", "Lunaris", "Ferrum", "Cineris", "Vespera", "Umbra", "Sacrum"],
    months: [
      { id: "m1", name: "Alvorada", days: 30, season: "Primavera" },
      { id: "m2", name: "Solstício", days: 30, season: "Verão" },
      { id: "m3", name: "Colheita", days: 30, season: "Outono" },
      { id: "m4", name: "Inverno", days: 30, season: "Inverno" },
    ],
    moons: [
      {
        id: "moon-1",
        name: "Lua Principal",
        cycleDays: 28,
        offset: 0,
        color: "#e4e4e7",
        lore: "Ciclo lunar padrão do cenário.",
      },
    ],
    availableEras: ["Era Antiga", "Era Atual"],
  };
}

export function defaultPartyResources(campaignId: string) {
  return {
    campaignId,
    gold: 0,
    silver: 0,
    copper: 0,
    rations: 0,
    torches: 0,
    healerKits: 0,
    items: [],
    stronghold: {
      name: "",
      type: "",
      locationHandle: "",
      integrity: 100,
      maxIntegrity: 100,
      upkeepPerMonth: "",
      description: "",
      upgrades: [],
    },
  };
}

/** Insere calendário e recursos padrão se ainda não existirem para a campanha. */
export async function ensureCampaignDefaults(
  ctx: MutationCtx,
  canonicalId: string,
  keys: string[],
  campaignTitle?: string
) {
  if (!(await firstByCampaign(ctx, "calendars", keys))) {
    await ctx.db.insert("calendars", defaultCalendar(canonicalId, campaignTitle));
  }
  await getOrCreatePartyResources(ctx, canonicalId, keys);
}

export async function getOrCreatePartyResources(
  ctx: MutationCtx,
  canonicalId: string,
  keys: string[]
): Promise<Doc<"partyResources">> {
  const existing = await firstByCampaign(ctx, "partyResources", keys);
  if (existing) return existing;
  const id = await ctx.db.insert("partyResources", defaultPartyResources(canonicalId));
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Registro não encontrado.");
  return created;
}
