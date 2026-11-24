import { v } from "convex/values";

/**
 * Validadores da ficha de personagem, compartilhados entre schema.ts e
 * characters.ts para que tabela e mutations nunca divirjam.
 * Campos novos são sempre opcionais para manter compatibilidade com fichas antigas.
 */

export const abilityScoresValidator = v.object({
  str: v.number(),
  dex: v.number(),
  con: v.number(),
  int: v.number(),
  wis: v.number(),
  cha: v.number(),
});

export const spellValidator = v.object({
  id: v.string(),
  index: v.string(),
  name: v.string(),
  level: v.number(),
  school: v.string(),
  castingTime: v.string(),
  range: v.string(),
  components: v.string(),
  duration: v.string(),
  description: v.string(),
  prepared: v.optional(v.boolean()),
  alwaysPrepared: v.optional(v.boolean()),
  source: v.optional(v.string()),
  ritual: v.optional(v.boolean()),
  concentration: v.optional(v.boolean()),
  higherLevels: v.optional(v.string()),
});

export const equipmentValidator = v.object({
  id: v.string(),
  itemId: v.optional(v.string()),
  name: v.string(),
  category: v.string(),
  damage: v.optional(v.string()),
  armorClass: v.optional(v.string()),
  mastery: v.optional(v.string()),
  properties: v.optional(v.string()),
  weight: v.optional(v.string()),
  quantity: v.number(),
  equipped: v.boolean(),
  notes: v.optional(v.string()),
});

const slotValidator = v.object({ used: v.number(), max: v.number() });

export const spellSlotsValidator = v.object({
  level1: slotValidator,
  level2: slotValidator,
  level3: slotValidator,
  level4: v.optional(slotValidator),
  level5: v.optional(slotValidator),
  level6: v.optional(slotValidator),
  level7: v.optional(slotValidator),
  level8: v.optional(slotValidator),
  level9: v.optional(slotValidator),
  pactSlots: v.optional(
    v.object({ level: v.number(), used: v.number(), max: v.number() })
  ),
});

export const classFeatureValidator = v.object({
  level: v.number(),
  name: v.string(),
  source: v.string(),
  description: v.string(),
});

export const classResourceValidator = v.object({
  label: v.string(),
  value: v.string(),
});

export const currencyValidator = v.object({
  pp: v.number(),
  gp: v.number(),
  ep: v.number(),
  sp: v.number(),
  cp: v.number(),
});

export const statMethodValidator = v.union(
  v.literal("standard"),
  v.literal("roll4d6"),
  v.literal("random"),
  v.literal("pointbuy"),
  v.literal("manual")
);

/** Campos editáveis da ficha (tudo exceto ids de vínculo e updatedAt). */
export const sheetContentFields = {
  name: v.string(),
  avatarUrl: v.optional(v.string()),
  race: v.string(),
  racialTraits: v.array(v.string()),
  className: v.string(),
  subclass: v.optional(v.string()),
  level: v.number(),
  background: v.string(),
  alignment: v.string(),
  hp: v.number(),
  maxHp: v.number(),
  tempHp: v.number(),
  armorClass: v.number(),
  speed: v.string(),
  hitDice: v.string(),
  hitDiceUsed: v.number(),
  proficiencyBonus: v.number(),
  passivePerception: v.number(),
  statGenerationMethod: v.optional(statMethodValidator),
  baseStats: v.optional(abilityScoresValidator),
  stats: abilityScoresValidator,
  proficiencies: v.array(v.string()),
  originFeat: v.optional(v.string()),
  savingThrows: v.optional(v.array(v.string())),
  weaponMasteries: v.optional(v.array(v.string())),
  classFeatures: v.optional(v.array(classFeatureValidator)),
  classResources: v.optional(v.array(classResourceValidator)),
  spellSlots: spellSlotsValidator,
  spells: v.array(spellValidator),
  equipment: v.array(equipmentValidator),
  notes: v.string(),
  // --- Campos adicionados na revisão das regras 2024 ---
  skillProficiencies: v.optional(v.array(v.string())),
  skillExpertise: v.optional(v.array(v.string())),
  toolProficiencies: v.optional(v.array(v.string())),
  languages: v.optional(v.array(v.string())),
  currency: v.optional(currencyValidator),
  heroicInspiration: v.optional(v.boolean()),
  initiativeBonus: v.optional(v.number()),
  /** Escolhas feitas no criador (espécie, antecedente, magias…), para reedição. */
  build: v.optional(v.any()),
};
